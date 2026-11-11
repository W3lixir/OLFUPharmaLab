window.LabReports = {
  types: {breakage:'Breakage Report',incident:'Lab Incident',concern:'Lab Concerns',session:'Lab Session Report'},
  rooms: ['AMS 204','AMS 205','AMS 301','AMS 302','AMS 303'],
  statuses: {pending:'Pending Review',accepted:'Accepted',rejected:'Rejected',resolved:'Resolved'},
  phtInput: value => value ? new Date(new Date(value).getTime()+8*3600000).toISOString().slice(0,16) : '',
  iso: value => value ? new Date(value+':00+08:00').toISOString() : null,
  displayDate: value => value ? new Date(value).toLocaleString('en-PH',{timeZone:'Asia/Manila',dateStyle:'medium',timeStyle:'short'}) : '—',
  validateFiles(files,existing=0) {
    if(files.length+existing>3) throw Error('Maximum 3 photos per report.');
    for(const file of files) if(!['image/jpeg','image/png','image/webp'].includes(file.type)||!file.size||file.size>8*1024*1024) throw Error('Use JPEG, PNG, or WebP photos, each 8 MB or smaller.');
  }
};
