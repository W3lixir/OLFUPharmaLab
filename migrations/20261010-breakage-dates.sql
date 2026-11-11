-- Run once in the Supabase SQL Editor for the existing PharmaLab database.
-- Existing date_reported values remain the computer reporting/encoding time.
-- Unknown historical incident and resolution dates remain NULL.
BEGIN;
ALTER TABLE public.breakages ADD COLUMN IF NOT EXISTS date_occurred TIMESTAMPTZ;
ALTER TABLE public.breakages ADD COLUMN IF NOT EXISTS date_resolved TIMESTAMPTZ;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'breakages_dates_valid'
    AND conrelid = 'public.breakages'::regclass) THEN
    ALTER TABLE public.breakages ADD CONSTRAINT breakages_dates_valid CHECK (
      (date_occurred IS NULL OR date_occurred <= date_reported) AND
      (date_resolved IS NULL OR (date_occurred IS NOT NULL AND date_resolved >= date_occurred))
    );
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_breakages_occurred ON public.breakages (date_occurred DESC);
CREATE INDEX IF NOT EXISTS idx_breakages_resolved ON public.breakages (date_resolved DESC);
COMMIT;
