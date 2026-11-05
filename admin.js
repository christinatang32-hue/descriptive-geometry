(()=>{
  const $=id=>document.getElementById(id),form=$('access'),error=$('error'),upload=$('roster-form'),exportButton=$('export');
  let rows=[];
  const fmt=seconds=>{const s=Math.round(seconds||0);return s<60?s+' 秒':Math.floor(s/3600)+' 小时 '+Math.floor(s%3600/60)+' 分钟'};
  const api=()=>String(window.COURSE_CONFIG?.apiBase||'').replace(/\/$/,'');
  const token=()=>$('token').value.trim();
  async function request(path,options={}){
    if(!api())throw Error('尚未配置学习记录服务。');
    if(!token())throw Error('请先填写教师访问密钥。');
    const response=await fetch(api()+path,{...options,headers:{Authorization:'Bearer '+token(),...(options.headers||{})}});
    if(response.status===401||response.status===403)throw Error('教师访问密钥无效。');
    if(!response.ok){const result=await response.json().catch(()=>({}));throw Error(result.error||'记录服务暂不可用。')}
    return response.json();
  }
  function renderRows(){
    $('students').textContent=rows.length;
    $('sessions').textContent=rows.reduce((n,r)=>n+r.sessions,0);
    $('duration').textContent=fmt(rows.reduce((n,r)=>n+r.totalSeconds,0));
    $('rows').replaceChildren();
    if(!rows.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=9;td.className='empty';td.textContent='尚无学习记录';tr.append(td);$('rows').append(tr)}
    for(const r of rows){const tr=document.createElement('tr');for(const value of [r.cohort||'—',r.studentId,r.name,r.sessions,fmt(r.lectureSeconds),fmt(r.exampleSeconds),fmt(r.assignmentSeconds),fmt(r.totalSeconds),r.lastSeen?new Date(r.lastSeen).toLocaleString('zh-CN'):'—']){const td=document.createElement('td');td.textContent=String(value);tr.append(td)}$('rows').append(tr)}
    $('result').hidden=false;exportButton.disabled=!rows.length;
  }
  async function loadRosterSummary(){
    const data=await request('/api/admin/roster/summary');$('cohort-list').replaceChildren();
    for(const item of data.cohorts||[]){const li=document.createElement('li');li.textContent=`${item.cohort}：${item.students} 人`;$('cohort-list').append(li)}
  }
  form.addEventListener('submit',async event=>{
    event.preventDefault();error.textContent='';$('load').disabled=true;
    try{const data=await request('/api/admin/summary');rows=data.students||[];renderRows();await loadRosterSummary()}
    catch(err){error.textContent=err.message||'读取失败'}finally{$('load').disabled=false}
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
        return headers.some(value=>['学号','studentId','student_id'].includes(value))&&headers.some(value=>['姓名','name'].includes(value));
      });
      if(headerIndex<0)continue;
      const headers=table[headerIndex].map(value=>text(value).replace(/\s+/g,''));
      const idColumn=headers.findIndex(value=>['学号','studentId','student_id'].includes(value));
      const nameColumn=headers.findIndex(value=>['姓名','name'].includes(value));
      const seen=new Set(),students=[];
      for(let index=headerIndex+1;index<table.length;index++){
        const values=table[index],studentId=text(values[idColumn]),name=text(values[nameColumn]).replace(/\s+/g,' ');
        if(!studentId&&!name)continue;
        const rowNumber=firstRow+index+1;
        if(!/^[0-9A-Za-z-]{4,24}$/.test(studentId)||name.length<2||name.length>30)throw Error(`工作表“${sheetName}”第 ${rowNumber} 行学号或姓名格式不正确。学号若以 0 开头，请在 Excel 中设为文本。`);
        if(seen.has(studentId))throw Error(`工作表“${sheetName}”第 ${rowNumber} 行学号重复：${studentId}`);
        seen.add(studentId);students.push({studentId,name});
        if(students.length>10000)throw Error('单次最多上传 10000 人，请拆分文件。');
      }
      if(!students.length)throw Error(`工作表“${sheetName}”没有可上传的学生。`);
      return students;
    }
    throw Error('Excel 前 30 行中未找到包含“学号”和“姓名”的表头。');
  }
  $('download-template').addEventListener('click',()=>{
    if(!window.XLSX){$('roster-status').textContent='Excel 组件未加载，请刷新页面重试。';return}
    const workbook=XLSX.utils.book_new(),sheet=XLSX.utils.aoa_to_sheet([['学号','姓名']]);
    sheet['!cols']=[{wch:24},{wch:18}];XLSX.utils.book_append_sheet(workbook,sheet,'学生名单');
    XLSX.writeFile(workbook,'学生名单模板.xlsx',{compression:true});
  });
  upload.addEventListener('submit',async event=>{
    event.preventDefault();const status=$('roster-status'),button=$('roster-upload'),cohort=$('cohort').value.trim(),file=$('roster-file').files[0];
    status.textContent='';if(!api()){status.textContent='尚未配置学习记录服务，不能上传名单。';return}
    if(!token()){status.textContent='请先填写教师访问密钥。';return}
    if(!/^[\p{L}\p{N}\s_-]{2,40}$/u.test(cohort)){status.textContent='届别或班级名称需为 2–40 个字符。';return}
    if(!file||!/^.+\.(xlsx|xls)$/i.test(file.name)||file.size>10*1024*1024){status.textContent='请选择不超过 10 MB 的 .xlsx 或 .xls 文件。';return}
    button.disabled=true;let completed=0;
    try{
      const students=await parseExcel(file);
      for(let i=0;i<students.length;i+=100){
        const chunk=students.slice(i,i+100);
        await request('/api/admin/roster/import',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({cohort,students:chunk})});
        completed+=chunk.length;status.textContent=`已上传 ${completed} / ${students.length} 人…`;
      }
      status.textContent=`${cohort} 名单上传完成：${completed} 人。`;
      await loadRosterSummary();
    }catch(err){status.textContent=`上传中止（已完成 ${completed} 人）：${err.message||'请重试。'}`}
    finally{button.disabled=false}
  });
  exportButton.addEventListener('click',()=>{
    if(!rows.length)return;
    const columns=['届别/班级','学号','姓名','登录次数','讲义秒数','例题秒数','作业秒数','总秒数','最近学习'];
    const safe=value=>{let text=String(value??'');if(/^[=+\-@]/.test(text))text="'"+text;return'"'+text.replace(/"/g,'""')+'"'};
    const lines=[columns,...rows.map(r=>[r.cohort||'',r.studentId,r.name,r.sessions,r.lectureSeconds,r.exampleSeconds,r.assignmentSeconds,r.totalSeconds,r.lastSeen||''])].map(row=>row.map(safe).join(','));
    const blob=new Blob(['\ufeff'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');
    link.href=url;link.download='画法几何学情统计.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
})();
