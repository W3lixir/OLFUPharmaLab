(function(){
 const type=new URLSearchParams(location.search).get('type'), config=LabReports;
 const form=document.getElementById('laboratory-report-form'), error=document.getElementById('submit-error');
 if(!config.types[type]){document.getElementById('form-title').textContent='Choose a valid report QR code';form.hidden=true;return;}
 document.title=config.types[type]+' - PharmaLab';document.getElementById('form-title').textContent=config.types[type];
 const introductions={breakage:'Report damaged or broken laboratory items so staff can review and arrange follow-up.',incident:'Document a laboratory incident, what happened, and the immediate action taken.',concern:'Share a concern about laboratory facilities, equipment, cleanliness, or safety.',session:'Record your laboratory activity, observations, and session outcome.'};
 document.getElementById('form-intro').textContent=introductions[type];
 document.getElementById('emergency-notice').hidden=type!=='incident';
 config.rooms.forEach(room=>document.getElementById('form-room').add(new Option(room,room)));
 const fields=document.getElementById('type-fields');
 function input(name,label,kind='text',attributes=''){fields.insertAdjacentHTML('beforeend',`<label>${label}<input name="${name}" type="${kind}" required ${attributes}></label>`);}
 function area(name,label){fields.insertAdjacentHTML('beforeend',`<label>${label}<textarea name="${name}" required maxlength="4000" rows="3"></textarea></label>`);}
 function category(options){const label=document.createElement('label');label.textContent='Category';const select=document.createElement('select');select.name='category';select.required=true;options.forEach(([value,text])=>select.add(new Option(text,value)));label.appendChild(select);fields.appendChild(label);}
 if(type==='breakage'){input('item_name','Item / Material','text','maxlength="200"');input('quantity','Quantity','number','min="0.001" step="any"');input('unit','Unit','text','maxlength="30"');area('damage_cause','How Was It Damaged?');}
 if(type==='incident'){category([['spill','Spill'],['fire','Fire / Smoke'],['injury','Injury / Exposure'],['error','Error'],['missing','Missing Item'],['other','Other']]);area('immediate_action','Immediate Action Taken (write None if none)');}
 if(type==='concern')category(['equipment','cleanliness','facilities','safety','supplies','other'].map(x=>[x,x[0].toUpperCase()+x.slice(1)]));
 if(type==='session'){input('subject','Subject');input('activity','Experiment / Activity');input('instructor','Instructor');input('session_start','Session Start (PHT)','datetime-local');input('session_end','Session End (PHT)','datetime-local');area('observations','Observations');area('outcome','Outcome');document.getElementById('occurred-label').hidden=true;document.getElementById('occurred-at').required=false;}
 document.getElementById('occurred-at').value=config.phtInput(new Date());
 document.getElementById('reporter-type').addEventListener('change',event=>{const isStudent=event.target.value==='student';document.getElementById('student-number-label').hidden=!isStudent;document.getElementById('student-number').required=isStudent;});
 let submissionId=crypto.randomUUID();
 let savedAttempt = null;
 form.addEventListener('submit',async event=>{
  event.preventDefault();error.textContent='';const button=document.getElementById('submit-report');
  try{
   const files=Array.from(document.getElementById('report-photos').files);config.validateFiles(files);
   const data=Object.fromEntries(new FormData(form)), details={};
   const names={breakage:['item_name','quantity','unit','damage_cause'],incident:['category','immediate_action'],concern:['category'],session:['subject','activity','instructor','session_start','session_end','observations','outcome']}[type];
   names.forEach(name=>details[name]=data[name]);
   if(type==='session'){details.session_start=config.iso(details.session_start);details.session_end=config.iso(details.session_end);if(details.session_end<=details.session_start)throw Error('Session end must be after its start.');}
   const occurred=type==='session'?details.session_start:config.iso(data.occurred_at);
   if(new Date(occurred)>new Date()||(type==='session'&&new Date(details.session_end)>new Date()))throw Error('Event dates cannot be in the future.');
   const payload={report_type:type,reporter_type:data.reporter_type,reporter_name:data.reporter_name,student_number:data.student_number||'',room:data.room,occurred_at:occurred,description:data.description,request_id:data.request_id||'',details};
   const attempt = JSON.stringify(payload) + JSON.stringify(files.map(f=>[f.name,f.size,f.lastModified]));
   if(savedAttempt && savedAttempt !== attempt) submissionId=crypto.randomUUID();
   savedAttempt=attempt;
   const body=new FormData();body.append('submission_id',submissionId);body.append('payload',JSON.stringify(payload));files.forEach(file=>body.append('photos',file));
   button.disabled=true;button.textContent='Submitting...';
   const response=await fetch(SUPABASE_URL+'/functions/v1/submit-laboratory-report',{method:'POST',headers:{apikey:SUPABASE_ANON,Authorization:'Bearer '+SUPABASE_ANON},body});
   const result=await response.json();if(!response.ok||!result.reference_number)throw Error(result.error||'Could not save report. Please retry.');
   form.hidden=true;document.getElementById('report-reference').textContent=result.reference_number;document.getElementById('report-success').hidden=false;
  }catch(err){error.textContent=err.message||'Connection failed. Your entries are retained; please retry.';}
  finally{button.disabled=false;button.textContent='Submit for Review';}
 });
 document.getElementById('another-report').addEventListener('click',()=>{submissionId=crypto.randomUUID();savedAttempt=null;form.reset();document.getElementById('reporter-type').dispatchEvent(new Event('change'));document.getElementById('occurred-at').value=config.phtInput(new Date());form.hidden=false;document.getElementById('report-success').hidden=true;});
})();
