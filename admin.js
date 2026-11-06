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
  async function loadIdentity(){
    try{
      const person=await request('/api/admin/me');
      $('role-badge').textContent=`${person.name} · ${person.isAdmin?'管理员':'教师'}`;
      $('role-badge').hidden=false;
      $('teacher-management-link').hidden=!person.isAdmin;
    }catch(cause){error.textContent=cause.message||'无法读取教师身份。'}
  }
  const today=new Date(),schoolStart=today.getMonth()>=7?today.getFullYear():today.getFullYear()-1;
  const defaultYear=`${schoolStart}-${schoolStart+1}`,defaultSemester=today.getMonth()>=7||today.getMonth()===0?1:2;
  $('manual-year').value=defaultYear;$('upload-year').value=defaultYear;
  $('manual-semester').value=String(defaultSemester);$('upload-semester').value=String(defaultSemester);
  const termKey=(year,semester)=>year+'|'+semester;
  const validYear=value=>/^20\d{2}-20\d{2}$/.test(value)&&Number(value.slice(5))===Number(value.slice(0,4))+1;
  const selectedGroup=()=>$('group-filter').value||'all';
  const selectedTerm=()=>{const [academicYear,semester]=$('term-filter').value.split('|');return{academicYear,semester:Number(semester)}};
  const groupQuery=()=>{const term=selectedTerm();return '?groupId='+encodeURIComponent(selectedGroup())+'&academicYear='+encodeURIComponent(term.academicYear)+'&semester='+term.semester};
  const cohortSort=(a,b)=>{
    const year=value=>{const match=String(value).match(/(\d{2})\d{2}$/);return match?Number(match[1]):999};
    return year(b.cohort)-year(a.cohort)||a.cohort.localeCompare(b.cohort,'zh-CN');
  };
  const mainClassLabel=students=>{
    const year=className=>{const match=className.match(/(\d{2})\d{2}$/);return match?Number(match[1]):-1};
    const classes=[...new Set(students.map(student=>student.className))];
    const latest=Math.max(...classes.map(year));
    return classes.filter(className=>year(className)===latest).sort((a,b)=>a.localeCompare(b,'zh-CN')).join('、').slice(0,100);
  };
  function renderRows(){
    $('students').textContent=rows.length;
    $('sessions').textContent=rows.reduce((n,r)=>n+r.sessions,0);
    $('duration').textContent=fmt(rows.reduce((n,r)=>n+r.totalSeconds,0));
    $('rows').replaceChildren();
    if(!rows.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=9;td.className='empty';td.textContent='该授课班级尚无学生名单';tr.append(td);$('rows').append(tr)}
    for(const r of rows){
      const tr=document.createElement('tr');
      for(const [index,value] of [r.studentId,r.name,r.cohort||'—',r.sessions,fmt(r.lectureSeconds),fmt(r.exampleSeconds),fmt(r.assignmentSeconds),fmt(r.totalSeconds)].entries()){
        const td=document.createElement('td');td.textContent=String(value);if(index>=3)td.className='num';tr.append(td);
      }
      const action=document.createElement('td'),button=document.createElement('button');button.type='button';button.className='row-delete';button.textContent='删除';
      button.addEventListener('click',()=>deleteStudent(r,button));action.append(button);tr.append(action);$('rows').append(tr);
    }
  }
  async function deleteStudent(student,button){
    if(!confirm(`确定删除 ${student.name}（${student.studentId}）吗？该学生的名单、学习记录和作业照片将一并永久删除。`))return;
    button.disabled=true;error.textContent='';
    try{await request('/api/admin/students/remove',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({studentId:student.studentId})});await load()}
    catch(cause){error.textContent=cause.message==='Student also belongs to another teacher; contact administrator'?'该学生还属于其他教师的授课班级，请联系管理员删除。':cause.message||'删除失败';button.disabled=false}
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
    const termSelect=$('term-filter'),previousTerm=termSelect.value,previousGroup=$('group-filter').value;
    const terms=[...new Set([termKey(defaultYear,defaultSemester),...groups.map(group=>termKey(group.academicYear,group.semester))])]
      .sort((a,b)=>b.localeCompare(a));
    termSelect.replaceChildren(...terms.map(value=>{const [year,semester]=value.split('|');return new Option(`${year} 学年第 ${semester} 学期`,value)}));
    termSelect.value=terms.includes(previousTerm)?previousTerm:termKey(defaultYear,defaultSemester);
    updateGroupFilter(previousGroup);updateManualGroups();
  }
  function updateGroupFilter(previous='all'){
    const term=$('term-filter').value,filter=$('group-filter');
    filter.replaceChildren(new Option('全部授课班级','all'));
    for(const group of groups.filter(item=>termKey(item.academicYear,item.semester)===term))
      filter.add(new Option(`${group.label}（${group.students} 人）`,group.id));
    filter.value=[...filter.options].some(option=>option.value===previous)?previous:'all';
  }
  function updateManualGroups(){
    const term=termKey($('manual-year').value.trim(),$('manual-semester').value);
    const manualSelect=$('manual-group'),previous=manualSelect.value;
    manualSelect.replaceChildren(new Option('按所填班级自动建立',''));
    for(const group of groups.filter(item=>termKey(item.academicYear,item.semester)===term))
      manualSelect.add(new Option(`${group.label}（${group.students} 人）`,group.id));
    manualSelect.value=[...manualSelect.options].some(option=>option.value===previous)?previous:'';
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
  $('load').addEventListener('click',load);
  $('term-filter').addEventListener('change',()=>{updateGroupFilter();load()});
  $('group-filter').addEventListener('change',load);
  $('manual-year').addEventListener('input',updateManualGroups);
  $('manual-semester').addEventListener('change',updateManualGroups);
  loadIdentity();load();
  $('teacher-management-link').addEventListener('click',async()=>{
    $('teacher-dialog').showModal();await loadTeachers();
  });
  $('teacher-close').addEventListener('click',()=>$('teacher-dialog').close());
  async function loadTeachers(){
    const status=$('teacher-list-status');status.textContent='正在读取教师信息…';
    try{
      const data=await request('/api/admin/teachers');$('teacher-rows').replaceChildren();
      data.teachers.sort((a,b)=>Number(b.employeeId==='2017011104')-Number(a.employeeId==='2017011104')||a.createdAt-b.createdAt||a.employeeId.localeCompare(b.employeeId));
      for(const person of data.teachers){
        const tr=document.createElement('tr');
        for(const value of [person.employeeId,person.name,person.isAdmin?'管理员':'教师']){const td=document.createElement('td');td.textContent=value;tr.append(td)}
        const action=document.createElement('td');
        if(!person.isAdmin){
          const buttons=document.createElement('div');buttons.className='teacher-actions';
          const edit=document.createElement('button');edit.type='button';edit.className='secondary';edit.textContent='编辑';
          edit.addEventListener('click',()=>editTeacher(person,tr));
          const remove=document.createElement('button');remove.type='button';remove.className='row-delete';remove.textContent='删除';
          remove.addEventListener('click',()=>deleteTeacher(person,remove));buttons.append(edit,remove);action.append(buttons);
        }else action.textContent='—';
        tr.append(action);$('teacher-rows').append(tr);
      }
      status.textContent=data.teachers.length?`共 ${data.teachers.length} 位教师。`:'暂无教师信息。';
    }catch(cause){status.textContent=cause.message||'读取教师信息失败。'}
  }
  function editTeacher(person,tr){
    const idInput=document.createElement('input'),nameInput=document.createElement('input');
    idInput.value=person.employeeId;idInput.inputMode='numeric';idInput.maxLength=16;idInput.setAttribute('aria-label','教师工号');
    nameInput.value=person.name;nameInput.maxLength=30;nameInput.setAttribute('aria-label','教师姓名');
    tr.children[0].replaceChildren(idInput);tr.children[1].replaceChildren(nameInput);
    const save=document.createElement('button'),cancel=document.createElement('button');
    save.type=cancel.type='button';save.textContent='保存';cancel.textContent='取消';cancel.className='secondary';
    cancel.addEventListener('click',loadTeachers);
    save.addEventListener('click',async()=>{
      const newEmployeeId=idInput.value.trim(),name=nameInput.value.trim();
      if(!/^\d{6,16}$/.test(newEmployeeId)||name.length<2||name.length>30){$('teacher-list-status').textContent='请填写 6–16 位数字工号和 2–30 字的姓名。';return}
      save.disabled=true;
      try{await request('/api/admin/teachers/update',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({employeeId:person.employeeId,newEmployeeId,name})});await loadTeachers();$('teacher-list-status').textContent='教师信息已更新；该教师需重新登录。'}
      catch(cause){$('teacher-list-status').textContent=cause.message==='ID already in use'?'工号已被使用。':cause.message||'保存失败。';save.disabled=false}
    });
    const buttons=document.createElement('div');buttons.className='teacher-actions';buttons.append(save,cancel);
    tr.lastElementChild.replaceChildren(buttons);idInput.focus();
  }
  async function deleteTeacher(person,button){
    if(!confirm(`确定删除 ${person.name}（${person.employeeId}）吗？该教师将无法再登录，历史授课记录保留。`))return;
    button.disabled=true;
    try{await request('/api/admin/teachers/delete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({employeeId:person.employeeId})});await loadTeachers();$('teacher-list-status').textContent='教师已删除，登录已停用。'}
    catch(cause){$('teacher-list-status').textContent=cause.message||'删除失败。';button.disabled=false}
  }
  $('teacher-form').addEventListener('submit',async event=>{
    event.preventDefault();
    const employeeId=$('teacher-id').value.trim(),name=$('teacher-name').value.trim();
    const status=$('teacher-status'),button=$('teacher-add');
    status.textContent='';$('teacher-credential').hidden=true;$('credential-password').textContent='';
    if(!/^\d{6,16}$/.test(employeeId)||name.length<2||name.length>30){status.textContent='请填写 6–16 位数字工号和教师姓名。';return}
    button.disabled=true;
    try{
      const data=await request('/api/admin/teachers/create',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({employeeId,name})});
      $('credential-person').textContent=`${data.name}（${data.employeeId}）`;
      $('credential-password').textContent=data.initialPassword;
      $('teacher-credential').hidden=false;
      status.textContent='教师已添加，请复制初始密码并交给该教师。';
      $('teacher-form').reset();
      await loadTeachers();
    }catch(cause){status.textContent=cause.message==='Teacher already exists'?'该工号已存在。':cause.message==='ID already belongs to a student'?'该号码已用于学生学号。':cause.message==='Administrator required'?'当前账号没有管理员权限。':cause.message||'添加教师失败。'}
    finally{button.disabled=false}
  });
  $('copy-credential').addEventListener('click',async()=>{
    try{await navigator.clipboard.writeText($('credential-password').textContent);$('teacher-status').textContent='已复制初始密码。'}
    catch{$('teacher-status').textContent='复制失败，请手动选择密码并复制。'}
  });
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
        seen.add(studentId);students.push({studentId,name,className,position:students.length+1});
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
    const academicYear=$('upload-year').value.trim(),semester=Number($('upload-semester').value);
    if(!validYear(academicYear)){status.textContent='学年请填写如 2026-2027 的格式。';return}
    button.disabled=true;let completed=0;
    try{
      const students=await parseExcel(file);
      const label=mainClassLabel(students);
      const created=await request('/api/admin/groups/create',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({label,academicYear,semester,sourceKind:'excel'})});
      for(let i=0;i<students.length;i+=50){
        const chunk=students.slice(i,i+50);
        await request('/api/admin/roster/import',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({groupId:created.id,students:chunk})});
        completed+=chunk.length;status.textContent=`已上传 ${completed} / ${students.length} 人…`;
      }
      status.textContent=`名单上传完成：${completed} 人；授课班级：${label}。`;
      $('roster-file').value='';
      await loadGroups();$('term-filter').value=termKey(academicYear,semester);updateGroupFilter(created.id);await load();
    }catch(err){status.textContent=`上传中止（已完成 ${completed} 人）：${err.message||'请重试。'}`}
    finally{button.disabled=false}
  });
  manual.addEventListener('submit',async event=>{
    event.preventDefault();
    const status=$('manual-status'),button=$('manual-add');
    const student={studentId:$('manual-id').value.trim(),name:$('manual-name').value.trim(),className:$('manual-class').value.trim()};
    const academicYear=$('manual-year').value.trim(),semester=Number($('manual-semester').value);
    status.textContent='';
    if(!/^[0-9A-Za-z-]{4,24}$/.test(student.studentId)||student.name.length<2||student.name.length>30||!basicClass(student.className)){status.textContent='请核对学号、姓名和班级。';return}
    if(!validYear(academicYear)){status.textContent='学年请填写如 2026-2027 的格式。';return}
    button.disabled=true;
    try{
      let groupId=$('manual-group').value;
      if(!groupId){const created=await request('/api/admin/groups/create',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({label:student.className,academicYear,semester,sourceKind:'manual'})});groupId=created.id}
      await request('/api/admin/roster/import',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({groupId,students:[student]})});
      status.textContent=`已添加：${student.name}（${student.studentId}）。`;
      $('manual-id').value='';$('manual-name').value='';$('manual-class').value='';
      await loadGroups();$('term-filter').value=termKey(academicYear,semester);updateGroupFilter(groupId);await load();$('manual-group').value=groupId;
    }catch(err){status.textContent='添加失败：'+(err.message||'请重试。')}
    finally{button.disabled=false}
  });
  function basicClass(value){return /^[\p{L}\p{N}\s_-]{1,40}$/u.test(value)}
})();
