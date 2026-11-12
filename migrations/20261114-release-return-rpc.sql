-- ============================================================
-- Release and return a request in ONE database transaction.
-- Run AFTER migrations/20261112-experiment-kits.sql, in the SQL Editor. Safe to run twice.
--
-- Why: the website used to read stock, compute the new number in the browser, then write it back,
-- one item at a time. Two lab techs releasing at the same moment could overwrite each other's
-- deduction, and a dropped connection halfway left a request "released" with only part of the
-- stock deducted. These functions lock the request and every stock row they touch, and either
-- everything is saved or nothing is.
--
-- The rules are the same as the website's previous release/return code:
--   Release  - only an APPROVED request. Each item is matched by itemId, else by name + category.
--              "As needed" quantities, unknown items and unit mismatches (reagents only) are
--              skipped and reported back. Stock never goes below zero; the amount actually taken
--              is saved on the item (deductedQty) together with the stock row (releasedFrom).
--   Return   - only a RELEASED request, Glassware/Equipment items only. Good items go back to the
--              same stock row, never more than was deducted. Damaged/missing items create
--              breakage entries; a failed breakage insert never blocks the return.
-- ============================================================
BEGIN;

CREATE OR REPLACE FUNCTION public.pl_num(v text)
RETURNS numeric LANGUAGE sql IMMUTABLE SET search_path = public, pg_temp AS $$
  SELECT CASE WHEN v ~ '^\s*-?[0-9]+(\.[0-9]+)?\s*$' THEN trim(v)::numeric END
$$;

CREATE OR REPLACE FUNCTION public.pl_fmt(v numeric)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public, pg_temp AS $$
  SELECT coalesce(trim_scale(v)::text, '0')
$$;

-- ── Release ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.release_request(p_request_id text, p_user_name text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE
  req        public.requests%ROWTYPE;
  who        text := coalesce(nullif(trim(p_user_name), ''), 'Unknown');
  borrower   text;
  v_items    jsonb;
  out_items  jsonb := '[]'::jsonb;
  skipped    text[] := '{}';
  it         jsonb;
  is_borrow  boolean;
  raw_qty    text;
  qty        numeric;
  v_unit     text;
  m          public.chemicals%ROWTYPE;
  v_hit      boolean;
  taken      numeric;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_staff() THEN RAISE EXCEPTION 'Staff login required'; END IF;

  SELECT * INTO req FROM public.requests WHERE request_id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request % not found', p_request_id; END IF;
  IF req.status IS DISTINCT FROM 'approved' THEN
    RAISE EXCEPTION 'Request % is % and cannot be released. Reload the page.', p_request_id, coalesce(req.status, 'pending');
  END IF;

  borrower := coalesce(nullif(req.student_name, ''), 'Unknown');
  v_items := CASE WHEN jsonb_typeof(req.items) = 'array' THEN req.items ELSE '[]'::jsonb END;

  INSERT INTO public.audit_log (created_at, action, details, user_name)
  VALUES (clock_timestamp(), 'Request Released', p_request_id || ' — ' || coalesce(req.student_name, ''), who);

  FOR it IN SELECT value FROM jsonb_array_elements(v_items) LOOP
    is_borrow := coalesce(it->>'category', '') IN ('Glassware', 'Equipment');
    raw_qty   := it->>'quantity';
    qty       := coalesce(public.pl_num(raw_qty), 0);

    v_hit := false;
    IF coalesce(it->>'itemId', '') <> '' THEN
      SELECT * INTO m FROM public.chemicals WHERE id::text = it->>'itemId' FOR UPDATE;
      v_hit := FOUND;
    END IF;
    IF NOT v_hit THEN
      SELECT * INTO m FROM public.chemicals
       WHERE lower(trim(coalesce(name, ''))) = lower(trim(coalesce(it->>'name', '')))
         AND lower(trim(coalesce(category, ''))) = lower(trim(coalesce(it->>'category', '')))
       ORDER BY id LIMIT 1 FOR UPDATE;
      v_hit := FOUND;
    END IF;
    v_unit := coalesce(nullif(it->>'unit', ''), CASE WHEN v_hit THEN m.unit END, 'pcs');

    IF raw_qty IS NULL OR raw_qty = '' THEN
      skipped := skipped || ((it->>'name') || ' — quantity "as needed", deduct manually');
    ELSIF NOT v_hit THEN
      skipped := skipped || ((it->>'name') || ' — not found in inventory');
    ELSIF NOT is_borrow AND coalesce(it->>'unit', '') <> '' AND coalesce(m.unit, '') <> ''
          AND lower(trim(it->>'unit')) <> lower(trim(m.unit)) THEN
      skipped := skipped || ((it->>'name') || ' — requested in ' || (it->>'unit') || ', stock is in ' || m.unit);
    ELSIF qty > 0 THEN
      taken := least(qty, greatest(0, coalesce(m.quantity, 0)));
      UPDATE public.chemicals SET quantity = greatest(0, coalesce(m.quantity, 0) - qty) WHERE id = m.id;
      it := it || jsonb_build_object('releasedFrom', m.id::text, 'deductedQty', trim_scale(taken));
      IF taken < qty THEN
        skipped := skipped || ((it->>'name') || ' — only ' || public.pl_fmt(taken) || ' ' || v_unit || ' was in stock (requested ' || public.pl_fmt(qty) || ')');
      END IF;
    END IF;

    INSERT INTO public.audit_log (created_at, action, details, user_name)
    VALUES (clock_timestamp(), CASE WHEN is_borrow THEN 'Borrow' ELSE 'Dispense' END,
            coalesce(it->>'name', '') || ' | ' || coalesce(it->>'category', '') || ' | ' || public.pl_fmt(qty) || ' ' || v_unit
            || ' | ' || CASE WHEN is_borrow THEN 'Borrower' ELSE 'Student' END || ': ' || borrower || ' | Req: ' || p_request_id,
            who);

    out_items := out_items || jsonb_build_array(it);
  END LOOP;

  UPDATE public.requests SET status = 'released', items = out_items WHERE id = req.id;

  RETURN jsonb_build_object('items', out_items, 'skipped', to_jsonb(skipped));
END $$;

REVOKE ALL ON FUNCTION public.release_request(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.release_request(text, text) TO authenticated;

-- ── Return ─────────────────────────────────────────────────
-- p_lines: one entry per returned item:
--   [{"index": <position in requests.items>, "good": 3, "damaged": 1, "name": "Juan", "group": "Group 2"}]
-- Items not listed are treated as fully missing, the same as leaving the counts at 0.
CREATE OR REPLACE FUNCTION public.return_request(
  p_request_id  text,
  p_lines       jsonb,
  p_received_by text,
  p_returned_at timestamptz DEFAULT now(),
  p_user_name   text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE
  req       public.requests%ROWTYPE;
  who       text := coalesce(nullif(trim(p_user_name), ''), 'Admin');
  borrower  text;
  v_items   jsonb;
  it        jsonb;
  ln        jsonb;
  idx       int;
  borrowed  numeric;
  good      numeric;
  bad       numeric;
  missing   numeric;
  back      numeric;
  m         public.chemicals%ROWTYPE;
  v_hit     boolean;
  person    text;
  grp       text;
  summary   text[] := '{}';
  warnings  text[] := '{}';
  kind      text;
  n         numeric;
  label     text;
  stamp     text := (extract(epoch FROM clock_timestamp()) * 1000)::bigint::text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_staff() THEN RAISE EXCEPTION 'Staff login required'; END IF;
  IF coalesce(trim(p_received_by), '') = '' THEN RAISE EXCEPTION 'Enter the name of who received the items.'; END IF;

  SELECT * INTO req FROM public.requests WHERE request_id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request % not found', p_request_id; END IF;
  IF req.status IS DISTINCT FROM 'released' THEN
    RAISE EXCEPTION 'Request % is % and cannot be returned. Reload the page.', p_request_id, coalesce(req.status, 'pending');
  END IF;

  borrower := coalesce(nullif(req.student_name, ''), 'Unknown');
  v_items := CASE WHEN jsonb_typeof(req.items) = 'array' THEN req.items ELSE '[]'::jsonb END;

  FOR idx IN 0 .. jsonb_array_length(v_items) - 1 LOOP
    it := v_items -> idx;
    CONTINUE WHEN coalesce(it->>'category', '') NOT IN ('Glassware', 'Equipment');

    borrowed := greatest(0, coalesce(public.pl_num(it->>'deductedQty'), public.pl_num(it->>'quantity'), 0));
    CONTINUE WHEN borrowed <= 0;

    SELECT value INTO ln FROM jsonb_array_elements(coalesce(p_lines, '[]'::jsonb))
     WHERE public.pl_num(value->>'index') = idx LIMIT 1;
    good := greatest(0, floor(coalesce(public.pl_num(ln->>'good'), 0)));
    bad  := greatest(0, floor(coalesce(public.pl_num(ln->>'damaged'), 0)));
    IF good + bad > borrowed THEN
      RAISE EXCEPTION '"%": Good + Damaged is more than the % released.', it->>'name', public.pl_fmt(borrowed);
    END IF;
    missing := borrowed - good - bad;

    -- Good items go back to the row they came from, never more than was deducted.
    IF good > 0 THEN
      v_hit := false;
      IF coalesce(it->>'releasedFrom', '') <> '' THEN
        SELECT * INTO m FROM public.chemicals WHERE id::text = it->>'releasedFrom' FOR UPDATE; v_hit := FOUND;
      END IF;
      IF NOT v_hit AND coalesce(it->>'itemId', '') <> '' THEN
        SELECT * INTO m FROM public.chemicals WHERE id::text = it->>'itemId' FOR UPDATE; v_hit := FOUND;
      END IF;
      IF NOT v_hit THEN
        SELECT * INTO m FROM public.chemicals
         WHERE lower(coalesce(name, '')) = lower(coalesce(it->>'name', '')) AND category IN ('Glassware', 'Equipment')
         ORDER BY id LIMIT 1 FOR UPDATE;
        v_hit := FOUND;
      END IF;
      back := least(good, coalesce(public.pl_num(it->>'deductedQty'), good));
      IF v_hit AND back > 0 THEN
        UPDATE public.chemicals SET quantity = coalesce(quantity, 0) + back WHERE id = m.id;
      END IF;
    END IF;

    INSERT INTO public.audit_log (created_at, action, details, user_name)
    VALUES (clock_timestamp(), 'Return',
            coalesce(it->>'name', '') || ' | ' || coalesce(it->>'category', '') || ' | Borrowed ' || public.pl_fmt(borrowed) || ' ' || coalesce(it->>'unit', '')
            || ' | Good ' || public.pl_fmt(good) || ', Damaged ' || public.pl_fmt(bad) || ', Missing ' || public.pl_fmt(missing)
            || ' | Borrower: ' || borrower || ' | Received by: ' || trim(p_received_by) || ' | Req: ' || p_request_id,
            who);

    IF bad > 0 OR missing > 0 THEN
      summary := summary || (coalesce(it->>'name', '') || ': ' || concat_ws(', ',
        CASE WHEN bad > 0 THEN public.pl_fmt(bad) || ' damaged' END,
        CASE WHEN missing > 0 THEN public.pl_fmt(missing) || ' missing' END));
      person := coalesce(nullif(trim(ln->>'name'), ''), nullif(req.student_name, ''), borrower);
      grp    := coalesce(trim(ln->>'group'), '');
      FOREACH kind IN ARRAY ARRAY['breakage', 'missing'] LOOP
        n     := CASE kind WHEN 'breakage' THEN bad ELSE missing END;
        label := CASE kind WHEN 'breakage' THEN 'damaged' ELSE 'missing (not returned)' END;
        CONTINUE WHEN n <= 0;
        -- A breakage entry that cannot be saved must never undo the return itself.
        BEGIN
          INSERT INTO public.breakages (id, request_id, student_name, student_number, group_name, item_name,
                                        quantity, unit, incident_type, description, reported_by, date_reported)
          VALUES ('brk-' || stamp || '-' || idx || '-' || kind, p_request_id, person, coalesce(req.student_number, ''), grp,
                  coalesce(it->>'name', ''), n, coalesce(it->>'unit', ''), kind,
                  public.pl_fmt(n) || ' of ' || public.pl_fmt(borrowed) || ' ' || label || ' on return.'
                    || CASE WHEN grp <> '' THEN ' Group: ' || grp ELSE '' END,
                  who, now());
        EXCEPTION WHEN OTHERS THEN
          warnings := warnings || ('The ' || kind || ' entry for "' || coalesce(it->>'name', '') || '" could not be logged: ' || SQLERRM);
        END;
      END LOOP;
    END IF;
  END LOOP;

  UPDATE public.requests SET status = 'returned' WHERE id = req.id;
  INSERT INTO public.audit_log (created_at, action, details, user_name)
  VALUES (clock_timestamp(), 'Request Returned',
          p_request_id || ' — ' || borrower || ' — returned at '
          || to_char(coalesce(p_returned_at, now()) AT TIME ZONE 'Asia/Manila', 'FMMM/FMDD/YYYY, FMHH12:MI:SS AM'),
          who);

  RETURN jsonb_build_object('summary', to_jsonb(summary), 'warnings', to_jsonb(warnings));
END $$;

REVOKE ALL ON FUNCTION public.return_request(text, jsonb, text, timestamptz, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.return_request(text, jsonb, text, timestamptz, text) TO authenticated;

REVOKE ALL ON FUNCTION public.pl_num(text), public.pl_fmt(numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pl_num(text), public.pl_fmt(numeric) TO authenticated;

COMMIT;
