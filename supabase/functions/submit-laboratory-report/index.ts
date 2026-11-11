// Public multipart endpoint. The service key remains inside the Edge runtime.
const origins = ['https://olfupharmalab.vercel.app', 'http://localhost:3000', 'http://127.0.0.1:3000'];
const maxSize = 8 * 1024 * 1024;
const rooms = ['AMS 204','AMS 205','AMS 301','AMS 302','AMS 303'];
function required(value, label, max = 4000) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error('Invalid ' + label);
  return value.trim();
}
function validate(payload) {
  const p = payload;
  if (!['breakage','incident','concern','session'].includes(p.report_type)) throw new Error('Invalid report type');
  if (!['student','faculty'].includes(p.reporter_type)) throw new Error('Invalid reporter type');
  p.reporter_name = required(p.reporter_name, 'name', 150);
  p.student_number = p.reporter_type === 'student' ? required(p.student_number,'student number',80) : '';
  if (!rooms.includes(p.room)) throw new Error('Invalid room');
  p.description = required(p.description,'description');
  const occurred = Date.parse(p.occurred_at);
  if (!Number.isFinite(occurred) || occurred > Date.now()) throw new Error('Event date must be in the past or present');
  p.occurred_at = new Date(occurred).toISOString();
  p.request_id = p.request_id ? required(p.request_id,'request ID',80) : '';
  const d = p.details;
  if (!d || typeof d !== 'object') throw new Error('Missing report details');
  if (p.report_type === 'breakage') {
    d.item_name = required(d.item_name,'item',200); d.unit = required(d.unit,'unit',30);
    d.quantity = Number(d.quantity);
    if (!Number.isFinite(d.quantity) || d.quantity <= 0) throw new Error('Quantity must be positive');
    d.damage_cause = required(d.damage_cause,'damage explanation');
  }
  if (p.report_type === 'incident') {
    if (!['spill','fire','injury','error','missing','other'].includes(d.category)) throw new Error('Invalid incident category');
    d.immediate_action = required(d.immediate_action,'immediate action');
  }
  if (p.report_type === 'concern' && !['equipment','cleanliness','facilities','safety','supplies','other'].includes(d.category)) throw new Error('Invalid concern category');
  if (p.report_type === 'session') {
    for (const field of ['subject','activity','instructor','observations','outcome']) d[field] = required(d[field],field);
    const start = Date.parse(d.session_start), end = Date.parse(d.session_end);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || end > Date.now() || start !== occurred) throw new Error('Invalid session start/end');
  }
  return {report_type:p.report_type,reporter_type:p.reporter_type,reporter_name:p.reporter_name,student_number:p.student_number,room:p.room,occurred_at:p.occurred_at,description:p.description,request_id:p.request_id,details:d};
}
async function hash(bytes) { return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2,'0')).join(''); }
function fileType(bytes) {
  if (bytes[0]===255 && bytes[1]===216 && bytes[2]===255) return ['image/jpeg','jpg'];
  if ([137,80,78,71,13,10,26,10].every((b,i)=>bytes[i]===b)) return ['image/png','png'];
  const text = new TextDecoder().decode(bytes.slice(0,12));
  if(text.startsWith('RIFF') && text.endsWith('WEBP')) return ['image/webp','webp'];
  throw new Error('Photos must be JPEG, PNG, or WebP');
}
Deno.serve(async request => {
  const origin = request.headers.get('origin');
  const headers = {'Access-Control-Allow-Origin': origins.includes(origin) ? origin : origins[0], 'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info', 'Access-Control-Allow-Methods':'POST,OPTIONS', 'Vary':'Origin'};
  const reply = (body,status=200) => new Response(JSON.stringify(body), {status,headers:{...headers,'Content-Type':'application/json'}});
  if (request.method==='OPTIONS') return new Response('ok',{headers});
  if(request.method!=='POST') return reply({error:'POST required'},405);
  if(origin && !origins.includes(origin)) return reply({error:'Origin not allowed'},403);
  try {
    if(Number(request.headers.get('content-length')) > 26*1024*1024) throw new Error('Report too large');
    const form = await request.formData();
    const id = String(form.get('submission_id'));
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) throw new Error('Invalid submission ID');
    const payload = validate(JSON.parse(String(form.get('payload'))));
    const files = form.getAll('photos');
    if(files.length>3) throw new Error('Maximum 3 photos');
    const prepared=[];
    for(const file of files) {
      if(!(file instanceof File) || !file.size || file.size>maxSize) throw new Error('Each photo must be 8 MB or smaller');
      const bytes=new Uint8Array(await file.arrayBuffer()), [mime,ext]=fileType(bytes), digest=await hash(bytes);
      prepared.push({bytes,mime,path:id+'/'+digest+'.'+ext});
    }
    const fingerprint=await hash(new TextEncoder().encode(JSON.stringify(payload)+JSON.stringify(prepared.map(f=>f.path))));
    const url=Deno.env.get('SUPABASE_URL'), key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if(!url || !key) return reply({error:'Submission service unavailable'},503);
    const auth={apikey:key,Authorization:'Bearer '+key};
    // Content-addressed paths make photo uploads safe to retry without overwrites.
    for(const file of prepared) {
      const response=await fetch(url+'/storage/v1/object/laboratory-report-photos/'+file.path,{method:'POST',headers:{...auth,'Content-Type':file.mime},body:file.bytes});
      if(!response.ok){const error=await response.json();if(error.statusCode!=='409' && error.statusCode!==409 && !/already exists|duplicate/i.test(error.message||'')) throw new Error('Photo upload failed. Please retry.');}
    }
    const response=await fetch(url+'/rest/v1/rpc/submit_laboratory_report',{method:'POST',headers:{...auth,'Content-Type':'application/json'},body:JSON.stringify({p_id:id,p_hash:fingerprint,p_payload:payload,p_photos:prepared.map(f=>({path:f.path}))})});
    const result=await response.json();
    if(!response.ok) throw new Error(/Retry must/.test(result.message||'') ? 'This retry contains changed data. Start a new report.' : 'Could not save report. Please retry.');
    return reply({reference_number:result});
  } catch(error) { return reply({error:error instanceof Error ? error.message : 'Could not submit report'},400); }
});
