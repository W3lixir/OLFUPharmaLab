const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('supabase/functions/submit-laboratory-report/index.ts','utf8');
function fixture(type='breakage'){
 return {report_type:type,reporter_type:'student',reporter_name:'Test Student',student_number:'TEST-001',room:'AMS 204',occurred_at:'2026-01-01T01:00:00.000Z',description:'Test report',request_id:'',details:type==='breakage'?{item_name:'Beaker',quantity:1,unit:'pcs',damage_cause:'Accident'}:type==='incident'?{category:'spill',immediate_action:'Informed lab staff'}:type==='concern'?{category:'cleanliness'}:{subject:'Chemistry',activity:'Experiment',instructor:'Test Faculty',session_start:'2026-01-01T01:00:00.000Z',session_end:'2026-01-01T02:00:00.000Z',observations:'Completed',outcome:'Recorded'}};
}
function runtime(){
 let handler;const saved=new Map();let uploads=0;
 vm.runInNewContext(source,{Deno:{env:{get:name=>name==='SUPABASE_URL'?'https://test.invalid':'private-server-key'},serve:fn=>handler=fn},crypto:global.crypto,TextDecoder,TextEncoder,Response,Request,FormData,File,Date,fetch:async(url,options)=>{
  if(url.includes('/storage/')){uploads++;return Response.json({});}
  const p=JSON.parse(options.body),previous=saved.get(p.p_id);
  if(previous&&previous.p_hash!==p.p_hash)return Response.json({message:'Retry must contain the same report'},{status:400});
  saved.set(p.p_id,p);return Response.json('LAB-TEST-REFERENCE');
 }});
 async function submit(payload,photos=[],id=crypto.randomUUID(),origin='https://olfupharmalab.vercel.app'){
  const body=new FormData();body.append('submission_id',id);body.append('payload',JSON.stringify(payload));photos.forEach(photo=>body.append('photos',photo));
  return handler(new Request('https://test.invalid',{method:'POST',headers:{Origin:origin},body}));
 }
 return {submit,saved,get uploads(){return uploads;}};
}
test('four report types and faculty can submit; server fields cannot be injected',async()=>{
 const app=runtime();for(const type of ['breakage','incident','concern','session']){const payload=fixture(type);payload.status='resolved';payload.reference_number='fake';const response=await app.submit(payload);assert.equal(response.status,200);}
 const payload=fixture();payload.reporter_type='faculty';delete payload.student_number;assert.equal((await app.submit(payload)).status,200);
 for(const row of app.saved.values()){assert.equal(row.p_payload.status,undefined);assert.equal(row.p_payload.reference_number,undefined);}
});
test('invalid identity, dates, room, categories, session range and quantity fail',async()=>{
 const app=runtime();const cases=[{student_number:''},{room:'Invalid'},{occurred_at:'2099-01-01T00:00:00Z'},{report_type:'bad'},{reporter_name:''},{details:{item_name:'Beaker',quantity:0,unit:'pcs',damage_cause:'Accident'}}];
 for(const patch of cases)assert.equal((await app.submit({...fixture(),...patch})).status,400);
 const session=fixture('session');session.details.session_end=session.details.session_start;assert.equal((await app.submit(session)).status,400);
 const incident=fixture('incident');incident.details.category='bad';assert.equal((await app.submit(incident)).status,400);
 assert.equal(app.saved.size,0);
});
test('retries share a reference and reject different data with the same ID',async()=>{
 const app=runtime(),id=crypto.randomUUID(),payload=fixture();assert.equal((await app.submit(payload,[],id)).status,200);assert.equal((await app.submit(payload,[],id)).status,200);assert.equal(app.saved.size,1);assert.equal((await app.submit({...payload,description:'Changed'},[],id)).status,400);
});
test('attachment signatures, count, size, and origin are validated',async()=>{
 const app=runtime(),png=new File([new Uint8Array([137,80,78,71,13,10,26,10,0])],'photo.png',{type:'image/png'});
 assert.equal((await app.submit(fixture(),[png])).status,200);
 assert.equal((await app.submit(fixture(),[png,png,png,png])).status,400);
 assert.equal((await app.submit(fixture(),[new File(['not an image'],'fake.png',{type:'image/png'})])).status,400);
 assert.equal((await app.submit(fixture(),[new File([new Uint8Array(8388609)],'large.png',{type:'image/png'})])).status,400);
 assert.equal((await app.submit(fixture(),[],crypto.randomUUID(),'https://untrusted.invalid')).status,403);
});
