(function(){
 const container=document.getElementById('report-qr-cards');
  const title='Laboratory Reports';
  const url='https://olfupharmalab.vercel.app/laboratory-reports.html';
  const card=document.createElement('article');card.className='report-qr-card';
  const qr=document.createElement('img');qr.alt=title+' QR Code';qr.src='https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=10&data='+encodeURIComponent(url);
  qr.className='qr-img';
  const description=document.createElement('p');description.className='qr-description';description.textContent='Scan once, then choose Breakage, Lab Incident, Lab Concerns, or Lab Session Report.';
  const address=document.createElement('div');address.className='qr-url';address.textContent=url;
  const open=document.createElement('a');open.className='btn btn-secondary';open.href=url;open.target='_blank';open.rel='noopener';open.textContent='Open Link';
  const copy=document.createElement('button');copy.className='btn btn-secondary';copy.textContent='Copy Link';copy.onclick=async()=>{try{await navigator.clipboard.writeText(url);copy.textContent='Copied';}catch{copy.textContent=url;}};
  const print=document.createElement('a');print.className='btn btn-primary';print.href='print-report-qr.html';print.target='_blank';print.rel='noopener';print.textContent='Print Poster';
  const actions=document.createElement('div');actions.className='qr-actions';actions.append(print,copy,open);
  card.append(description,qr,address,actions);container.appendChild(card);
})();
