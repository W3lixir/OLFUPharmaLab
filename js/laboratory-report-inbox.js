(function(){
 function updateClock(){const clock=document.getElementById('sidebar-datetime');if(clock)clock.textContent=new Date().toLocaleString('en-PH',{timeZone:'Asia/Manila',weekday:'short',year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'});}
 updateClock();setInterval(updateClock,1000);
 const config=LabReports, tbody=document.getElementById('lab-reports-body'),dialog=document.getElementById('report-dialog');let reports=[],selected=null;
 Object.entries(config.types).forEach(([value,label])=>document.getElementById('report-type').add(new Option(label,value)));
 config.rooms.forEach(room=>document.getElementById('report-room').add(new Option(room,room)));
 function node(tag,text){const el=document.createElement(tag);el.textContent=text;return el;}
 function render(){
  const value=id=>document.getElementById(id).value,type=value('report-type'),status=value('report-status'),reporter=value('report-reporter'),room=value('report-room'),from=value('report-from'),to=value('report-to'),dateField=value('report-date-field');
  const filtered=reports.filter(r=>{const date=config.phtInput(r[dateField]).slice(0,10);return (!type||r.report_type===type)&&(!status||r.status===status)&&(!reporter||r.reporter_type===reporter)&&(!room||r.room===room)&&(!from||(date&&date>=from))&&(!to||(date&&date<=to));});
  tbody.replaceChildren();
  filtered.forEach(r=>{const row=document.createElement('tr');[r.reference_number,config.types[r.report_type],r.reporter_name,r.reporter_type,r.room,config.displayDate(r.occurred_at),config.displayDate(r.submitted_at),config.statuses[r.status]].forEach(text=>row.appendChild(node('td',text)));const action=document.createElement('td'),button=node('button','Details / Review');button.className='btn btn-secondary btn-sm';button.onclick=()=>showDetails(r.id);action.appendChild(button);row.appendChild(action);tbody.appendChild(row);});
  if(!filtered.length){const row=document.createElement('tr'),cell=node('td','No reports match the filters.');cell.colSpan=9;row.appendChild(cell);tbody.appendChild(row);}
 }
 async function load(){
  document.getElementById('inbox-error').textContent='';
  try{const {data,error}=await db.from('laboratory_reports').select('*').order('submitted_at',{ascending:false});if(error)throw error;reports=data;document.getElementById('pending-count').textContent=reports.filter(r=>r.status==='pending').length;document.getElementById('report-count').textContent=reports.length;render();}
  catch(error){document.getElementById('inbox-error').textContent='Could not load reports: '+error.message;}
 }
 let detailVersion=0, busy=false;
 function setBusy(value){busy=value;document.querySelectorAll('[data-review], #save-staff-photos').forEach(button=>button.disabled=value);}
 dialog.addEventListener('close',()=>{selected=null;detailVersion++;});
 async function showDetails(id){
  const version=++detailVersion;
  selected=reports.find(r=>r.id===id);if(!selected)return;
  const r=selected,detail=document.getElementById('report-detail');detail.replaceChildren();document.getElementById('report-dialog-title').textContent=r.reference_number;
  const dl=document.createElement('dl');
  const entries={'Report Type':config.types[r.report_type],Status:config.statuses[r.status],Reporter:r.reporter_name,'Reporter Type':r.reporter_type,'Student Number':r.student_number||'—',Room:r.room,'Event Date':config.displayDate(r.occurred_at),'Submitted Date':config.displayDate(r.submitted_at),'Reviewed Date':config.displayDate(r.reviewed_at),'Resolved Date':config.displayDate(r.resolved_at),'Request ID':r.request_id||'—',Description:r.description,'Review Notes':r.review_notes||'—'};
  Object.entries(r.details||{}).forEach(([key,value])=>entries[key.replaceAll('_',' ')]=key.startsWith('session_')?config.displayDate(value):String(value));
  Object.entries(entries).forEach(([label,value])=>dl.append(node('dt',label),node('dd',value)));detail.appendChild(dl);
  if(r.linked_breakage_id){const link=node('a','View linked Breakage Log');link.href='breakage.html';detail.appendChild(link);}
  const photoWrap=document.createElement('div');detail.appendChild(photoWrap);
  document.getElementById('review-notes').value=r.review_notes||'';document.getElementById('review-resolved').value=config.phtInput(new Date());document.getElementById('staff-photos').value='';document.getElementById('review-error').textContent='';
  document.querySelectorAll('[data-review]').forEach(button=>button.hidden=button.dataset.review==='resolve'?r.status!=='accepted':r.status!=='pending');
  if(!dialog.open)dialog.showModal();
  for(const photo of r.photos||[]){const {data,error}=await db.storage.from('laboratory-report-photos').createSignedUrl(photo.path,300);if(selected?.id!==id||version!==detailVersion||!dialog.open)return;if(error){photoWrap.appendChild(node('p','Photo unavailable. Close and reopen to retry.'));continue;}const link=node('a','Open Photo');link.href=data.signedUrl;link.target='_blank';link.rel='noopener';const image=document.createElement('img');image.src=data.signedUrl;image.alt='Report evidence';photoWrap.append(link,image);}
 }
 async function action(button){
  if(!selected||busy)return;const id=selected.id;document.getElementById('review-error').textContent='';setBusy(true);
  try{const notes=document.getElementById('review-notes').value.trim(),action=button.dataset.review;if(action==='reject'&&!notes)throw Error('Enter a rejection reason.');const resolved=action==='resolve'?config.iso(document.getElementById('review-resolved').value):null;const {error}=await db.rpc('review_laboratory_report',{p_id:id,p_action:action,p_notes:notes,p_resolved_at:resolved});if(error)throw error;await load();if(dialog.open&&selected?.id===id)await showDetails(id);}
  catch(error){document.getElementById('review-error').textContent=error.message;}finally{setBusy(false);}
 }
 document.querySelectorAll('[data-review]').forEach(button=>button.onclick=()=>action(button));
 document.getElementById('save-staff-photos').onclick=async function(){
  if(!selected||busy)return;const id=selected.id,existing=(selected.photos||[]).length;setBusy(true);const errorEl=document.getElementById('review-error');errorEl.textContent='';
  try{const files=Array.from(document.getElementById('staff-photos').files);if(!files.length)throw Error('Select photos first.');config.validateFiles(files,existing);const photos=[];for(const file of files){const path=id+'/staff-'+crypto.randomUUID()+'.'+({ 'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[file.type]);const {error}=await db.storage.from('laboratory-report-photos').upload(path,file,{contentType:file.type});if(error)throw error;photos.push({path});}const {error}=await db.rpc('add_laboratory_report_photos',{p_id:id,p_photos:photos});if(error)throw error;await load();if(dialog.open&&selected?.id===id)await showDetails(id);}catch(error){errorEl.textContent=error.message;}finally{setBusy(false);}
 };
 document.getElementById('close-report').onclick=()=>{dialog.close();selected=null;};
 document.getElementById('refresh-reports').onclick=load;
 document.getElementById('report-filters').addEventListener('change',render);load();
})();
