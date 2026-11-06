(()=>{
  const $=id=>document.getElementById(id),error=$('error'),upload=$('roster-form'),manual=$('manual-form');
  let session;try{session=JSON.parse(sessionStorage.getItem('dg-teacher-session')||'null')}catch{}
  if(!session?.sessionId||!session?.token){location.replace('index.html?next=admin.html');return}
  let rows=[],groups=[];
  const fmt=seconds=>{const s=Math.round(seconds||0);return s<60?s+' 秒':Math.floor(s/3600)+' 小时 '+Math.floor(s%3600/60)+' 分钟'};
  const api=()=>String(window.COURSE_CONFIG?.apiBase||'').replace(/\/$/,'');
  async function request(path,options={}){
    if(!api())throw Error('尚未配置学习记录服务。');
    const response=await fetch(api()+path,{...options,headers:{Authorization:'Bearer '+session.token,'X-Session-Id':session.sessionId,...(options.headers||{})}});
    if(response.status===401){sessionStorage.removeItem('dg-teacher-session');throw Error('教师登录已过期，请返回登录页重新登录。')}
    if(!response.ok){const result=await response.json().catch(()=>({}));if(result.error==='Password change required'){location.replace('teacher-password.html');throw Error('请先修改初始密码。')}throw Error(result.error||'记录服务暂不可用。')}
    return response.json();
  }
  const selectedGroup=()=>$('group-filter').value||'all';
  const groupQuery=()=>'?groupId='+encodeURIComponent(selectedGroup());
  const cohortSort=(a,b)=>{
    const year=value=>{const match=String(value).match(/(\d{2})\d{2}$/);return match?Number(match[1]):999};
    return year(a.cohort)-year(b.cohort)||a.cohort.localeCompare(b.cohort,'zh-CN');
  };
  function renderRows(){
    $('students').textContent=rows.length;
    $('sessions').textContent=rows.reduce((n,r)=>n+r.sessions,0);
    $('duration').textContent=fmt(rows.reduce((n,r)=>n+r.totalSeconds,0));
    $('rows').replaceChildren();
    if(!rows.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=9;td.className='empty';td.textContent='该上课头尚无学生名单';tr.append(td);$('rows').append(tr)}
    for(const r of rows){const tr=document.createElement('tr');for(const value of [r.studentId,r.name,r.cohort||'—',r.sessions,fmt(r.lectureSeconds),fmt(r.exampleSeconds),fmt(r.assignmentSeconds),fmt(r.totalSeconds),r.lastSeen?new Date(r.lastSeen).toLocaleString('zh-CN'):'—']){const td=document.createElement('td');td.textContent=String(value);tr.append(td)}$('rows').append(tr)}
  }
  function chart(svgId,series,labels){
    const svg=$(svgId),ns='http://www.w3.org/2000/svg';svg.replaceChildren();
    const add=(tag,attributes)=>{const el=document.createElementNS(ns,tag);for(const [key,value] of Object.entries(attributes))el.setAttribute(key,String(value));svg.append(el);return el};
    const max=Math.max(1,...series.current,...series.previous),top=Math.ceil(max/4)*4;
    for(let line=0;line<=4;line++){const y=10+line*26;add('line',{x1:34,y1:y,x2:510,y2:y,stroke:'#dce8f1','stroke-dasharray':'4 3'});const label=add('text',{x:3,y:y+4,fill:'#82929e','font-size':11});label.textContent=String(Math.round(top*(4-line)/4))}
    const path=values=>values.map((value,index)=>`${index?'L':'M'}${34+index*79.3},${114-value/top*104}`).join(' ');
    add('path',{d:path(series.previous),fill:'none',stroke:'#3b8dff','stroke-width':2.5,'stroke-linecap':'round','stroke-linejoin':'round'});
    add('path',{d:path(series.current),fill:'none',stroke:'#d9a4eb','stroke-width':2.5,'stroke-linecap':'round','stroke-linejoin':'round'});
    labels.forEach((value,index)=>{const label=add('text',{x:34+index*79.3,y:138,fill:'#82929e','font-size':11,'text-anchor':'middle'});label.textContent=value});
  }
  function change(id,current,previous){
    const target=$(id);target.className='change';
    if(!previous){target.textContent=current?'新增':'—';target.classList.add('flat');return}
    const percent=Math.round((current-previous)/previous*100);
    target.textContent=(percent>0?'▲ ':percent<0?'▼ ':'')+Math.abs(percent)+'%';
    target.classList.add(percent>0?'up':percent<0?'down':'flat');
  }
  function renderTrend(trend){
    if(!trend)return;
    const sum=values=>values.reduce((total,value)=>total+Number(value||0),0);
    const visits=sum(trend.visits.current),previousVisits=sum(trend.visits.previous);
    $('visit-total').textContent=visits;change('visit-change',visits,previousVisits);
    const learners=Number(trend.learners.currentTotal||0),previousLearners=Number(trend.learners.previousTotal||0);
    $('learner-total').textContent=learners;change('learner-change',learners,previousLearners);
    chart('visit-chart',trend.visits,trend.labels);chart('learner-chart',trend.learners,trend.labels);
  }
  async function loadGroups(){
    const data=await request('/api/admin/groups');groups=data.groups||[];
    const filter=$('group-filter'),manualSelect=$('manual-group'),previous=filter.value;
    filter.replaceChildren(new Option('全部上课头','all'));manualSelect.replaceChildren(new Option('请选择',''));
    for(const group of groups){const label=`${group.label}（${group.students} 人）`;filter.add(new Option(label,group.id));manualSelect.add(new Option(label,group.id))}
    filter.value=groups.some(group=>group.id===previous)?previous:'all';
  }
  async function loadRosterSummary(){
    const data=await request('/api/admin/roster/summary'+groupQuery());$('cohort-list').replaceChildren();
    for(const item of (data.cohorts||[]).sort(cohortSort)){const li=document.createElement('li');li.textContent=`${item.cohort}：${item.students} 人`;$('cohort-list').append(li)}
  }
  async function load(){
    error.textContent='';$('load').disabled=true;
    try{await loadGroups();const data=await request('/api/admin/summary'+groupQuery());rows=data.students||[];renderRows();renderTrend(data.trend);await loadRosterSummary()}
    catch(err){error.textContent=err.message||'读取失败'}finally{$('load').disabled=false}
  }
  $('load').addEventListener('click',load);$('group-filter').addEventListener('change',load);load();
  async function parseExcel(file){
    if(!window.XLSX)throw Error('Excel 读取组件未加载，请刷新页面重试。');
    let workbook;try{workbook=XLSX.read(await file.arrayBuffer(),{type:'array',cellText:true,cellDates:false})}
    catch{throw Error('无法读取 Excel 文件，请确认文件未损坏且格式为 .xlsx 或 .xls。')}
    const text=value=>String(value??'').trim();
    for(const sheetName of workbook.SheetNames){
      const sheet=workbook.Sheets[sheetName];if(!sheet?.['!ref'])continue;
      const table=XLSX.utils.sheet_to_json(sheet,{header:1,defval:'',raw:false,blankrows:true});
      const firstRow=XLSX.utils.decode_range(sheet['!ref']).s.r;
      const headerIndex=table.slice(0,30).findIndex(row=>{
        const headers=row.map(value=>text(value).replace(/\s+/g,''));
        return headers.some(value=>['学号','studentId','student_id'].includes(value))&&headers.some(value=>['姓名','name'].includes(value))&&headers.some(value=>['班级','班级名称','class','className'].includes(value));
      });
      if(headerIndex<0)continue;
      const headers=table[headerIndex].map(value=>text(value).replace(/\s+/g,''));
      const idColumn=headers.findIndex(value=>['学号','studentId','student_id'].includes(value));
      const nameColumn=headers.findIndex(value=>['姓名','name'].includes(value));
      const classColumn=headers.findIndex(value=>['班级','班级名称','class','className'].includes(value));
      const seen=new Set(),students=[];
      for(let index=headerIndex+1;index<table.length;index++){
        const values=table[index],studentId=text(values[idColumn]),name=text(values[nameColumn]).replace(/\s+/g,' '),className=text(values[classColumn]);
        if(!studentId&&!name)continue;
        if(!studentId&&/^(男|女|合计|总计)[：:\s]/.test(name))continue;
        const rowNumber=firstRow+index+1;
        if(!/^[0-9A-Za-z-]{4,24}$/.test(studentId)||name.length<2||name.length>30||!/^[\p{L}\p{N}\s_-]{1,40}$/u.test(className))throw Error(`工作表“${sheetName}”第 ${rowNumber} 行学号、姓名或班级格式不正确。学号若以 0 开头，请在 Excel 中设为文本。`);
        if(seen.has(studentId))throw Error(`工作表“${sheetName}”第 ${rowNumber} 行学号重复：${studentId}`);
        seen.add(studentId);students.push({studentId,name,className});
        if(students.length>10000)throw Error('单次最多上传 10000 人，请拆分文件。');
      }
      if(!students.length)throw Error(`工作表“${sheetName}”没有可上传的学生。`);
      return students;
    }
    throw Error('Excel 前 30 行中未找到包含“学号、姓名、班级”的表头。');
  }
  upload.addEventListener('submit',async event=>{
    event.preventDefault();const status=$('roster-status'),button=$('roster-upload'),file=$('roster-file').files[0];
    status.textContent='';if(!api()){status.textContent='尚未配置学习记录服务，不能上传名单。';return}
    if(!file||!/^.+\.(xlsx|xls)$/i.test(file.name)||file.size>10*1024*1024){status.textContent='请选择不超过 10 MB 的 .xlsx 或 .xls 文件。';return}
    button.disabled=true;let completed=0;
    try{
      const students=await parseExcel(file);
      const created=await request('/api/admin/groups/create',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({label:(file.name.replace(/\.(xlsx|xls)$/i,'')+' · '+new Date().toLocaleString('zh-CN')).slice(0,100),sourceKind:'excel'})});
      for(let i=0;i<students.length;i+=50){
        const chunk=students.slice(i,i+50);
        await request('/api/admin/roster/import',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({groupId:created.id,students:chunk})});
        completed+=chunk.length;status.textContent=`已上传 ${completed} / ${students.length} 人…`;
      }
      status.textContent=`名单上传完成：${completed} 人。`;
      $('roster-file').value='';
      await load();
    }catch(err){status.textContent=`上传中止（已完成 ${completed} 人）：${err.message||'请重试。'}`}
    finally{button.disabled=false}
  });
  manual.addEventListener('submit',async event=>{
    event.preventDefault();
    const status=$('manual-status'),button=$('manual-add'),label=$('new-group-name').value.trim();
    const student={studentId:$('manual-id').value.trim(),name:$('manual-name').value.trim(),className:$('manual-class').value.trim()};
    status.textContent='';
    if(!/^[0-9A-Za-z-]{4,24}$/.test(student.studentId)||student.name.length<2||student.name.length>30||!basicClass(student.className)){status.textContent='请核对学号、姓名和班级。';return}
    if(!label&&!$('manual-group').value){status.textContent='请选择上课头，或填写新建上课头名称。';return}
    button.disabled=true;
    try{
      let groupId=$('manual-group').value;
      if(label){const created=await request('/api/admin/groups/create',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({label,sourceKind:'manual'})});groupId=created.id}
      await request('/api/admin/roster/import',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({groupId,students:[student]})});
      status.textContent=`已添加：${student.name}（${student.studentId}）。`;
      $('manual-id').value='';$('manual-name').value='';$('manual-class').value='';$('new-group-name').value='';
      await load();$('manual-group').value=groupId;
    }catch(err){status.textContent='添加失败：'+(err.message||'请重试。')}
    finally{button.disabled=false}
  });
  function basicClass(value){return /^[\p{L}\p{N}\s_-]{1,40}$/u.test(value)}
})();
