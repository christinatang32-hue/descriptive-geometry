(()=>{
  const lesson=JSON.parse(document.getElementById('lesson-data').textContent);
  const page=location.pathname.split('/').pop();
  const api=String(window.COURSE_CONFIG?.apiBase||'').replace(/\/$/,'');
  let session;try{session=JSON.parse(sessionStorage.getItem('dg-study-session')||'null')}catch{}
  let teacherSession;try{teacherSession=JSON.parse(sessionStorage.getItem('dg-teacher-session')||'null')}catch{}
  const teacherPreview=sessionStorage.getItem('dg-teacher-preview')==='1'&&!!teacherSession?.sessionId&&!!teacherSession?.token;
  let previewAuthorized=false;
  const hub=document.createElement('section');
  hub.className='assignment-hub';
  hub.setAttribute('aria-label','习题提交与学习流程');
  hub.innerHTML=`<header><div class="hub-eyebrow">习题 · ${page.replace(/^ex-|\.html$/g,'')}</div><h1>先完成作业，再对照学习</h1><p class="hub-intro" id="assignment-problem"></p></header>
    <ol class="hub-steps"><li><span class="step-no">01</span><strong>上传作业</strong><span>拍摄或扫描自己完成的答案</span></li><li><span class="step-no">02</span><strong>查看结果</strong><span>阅读 AI 初评与红色标注</span></li><li><span class="step-no">03</span><strong>开始学习</strong><span>查看正确答案与分步作图</span></li></ol>
    <div class="hub-panel"><h2>上传作业</h2><p>请上传本题完整、清晰的手机照片或扫描图。确保题图与作图结果都在画面内。</p>
      <form id="assignment-upload"><div class="upload-row"><input id="assignment-photo" type="file" accept="image/*" required><button type="submit" id="grade-button">上传并批改</button></div></form>
      <p id="assignment-status" class="hub-status" role="status" aria-live="polite"></p>
      <div class="hub-actions"><button type="button" class="secondary" id="view-result" disabled>查看结果</button><button type="button" id="start-learning" disabled>开始学习</button></div>
      <div id="result-panel" class="result-panel" hidden><h2>AI 初评结果</h2><p id="result-summary" class="result-summary"></p><div class="marked-wrap"><img id="student-photo" alt="学生上传的作业照片"><svg id="error-marks" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-label="红色错误位置标注"></svg></div><ol id="issue-list" class="issue-list"></ol></div>
      <p class="hub-note">AI 初评可能漏检或误判。请结合题图复核红色标注，学习时再对照完整作图过程。作业照片和批改记录保存五年。</p>
    </div>`;
  const app=document.getElementById('app');
  app.before(hub);
  const $=id=>hub.querySelector('#'+id);
  $('assignment-problem').textContent=lesson.problem||'请先独立完成本题作图。';
  const status=(message,error=false)=>{$('assignment-status').textContent=message;$('assignment-status').classList.toggle('error',error)};
  const headers=()=>({Authorization:'Bearer '+session.token,'X-Session-Id':session.sessionId});
  async function call(path,options={}){
    const response=await fetch(api+path,{...options,headers:{...headers(),...(options.headers||{})}});
    if(!response.ok){let message='批改服务暂不可用，请稍后重试。';try{const data=await response.json();if(response.status===401)message='登录已过期，请从首页重新登录。';else if(response.status===413)message='图片过大，请重新拍摄或压缩后上传。';else if(data.error==='Grading service not configured')message='批改服务尚未配置，请联系教师。';else if(data.error==='AI grade invalid')message='AI 未能生成可用的批改结果，请稍后重新上传。';else if(response.status===503)message='批改服务当前不可用，请稍后重试。';else if(data.error==='Use a JPG, PNG or WebP image under 5 MB')message='请上传小于 5 MB 的 JPG 或 PNG 图片。'}catch{}throw Error(message)}
    return response;
  }
  let latest=null,photoUrl=null;
  async function preparePhoto(file){
    if(file.size>20_000_000)throw Error('原始照片超过 20 MB，请压缩后上传。');
    let bitmap;try{bitmap=await createImageBitmap(file)}catch{throw Error('无法读取此图片，请转为 JPG 或 PNG 后重试。')}
    const scale=Math.min(1,1800/Math.max(bitmap.width,bitmap.height));
    const canvas=document.createElement('canvas');
    canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
    const context=canvas.getContext('2d');context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.92));
    if(!blob||blob.size>5_000_000)throw Error('处理后的照片仍超过 5 MB，请降低拍摄分辨率。');
    return new File([blob],file.name.replace(/\.[^.]+$/,'')+'.jpg',{type:'image/jpeg'});
  }
  async function load(){
    if(teacherPreview){
      $('grade-button').disabled=true;
      $('assignment-photo').disabled=true;
      if(!api){status('教师预览需要连接登录服务。',true);return}
      try{
        const response=await fetch(api+'/api/admin/me',{headers:{Authorization:'Bearer '+teacherSession.token,'X-Session-Id':teacherSession.sessionId}});
        if(!response.ok)throw Error('教师登录已过期，请重新登录。');
        previewAuthorized=true;
        $('start-learning').disabled=false;
        $('start-learning').textContent='开始学习（教师预览）';
        status('教师预览模式：可查看学生学习内容，不上传作业，也不计入学生学情。');
      }catch(error){status(error.message||'无法验证教师身份。',true)}
      return;
    }
    if(!session?.studentId){status('请先从首页登录。',true);$('grade-button').disabled=true;return}
    if(!api){status('本地演示模式：批改服务未接入，可预览分步学习。');$('grade-button').disabled=true;$('start-learning').disabled=false;$('start-learning').textContent='开始学习（本地演示）';return}
    try{
      const response=await call('/api/assignment/result?page='+encodeURIComponent(page));
      const data=await response.json();
      if(data.result){latest=data;$('view-result').disabled=false;$('start-learning').disabled=!data.canLearn;status(data.canLearn?'已查看批改结果，可以开始学习。':'已有批改结果，请先点击“查看结果”。')}
      else status('请先上传自己完成的作业。');
    }catch(error){status(error.message,true)}
  }
  $('assignment-upload').addEventListener('submit',async event=>{
    event.preventDefault();
    if(teacherPreview)return;
    const file=$('assignment-photo').files[0];if(!file)return;
    const button=$('grade-button');button.disabled=true;$('view-result').disabled=true;$('start-learning').disabled=true;$('result-panel').hidden=true;
    let seconds=0;
    status('正在上传并批改，请保持页面打开…');
    const progress=setInterval(()=>{seconds+=5;status(`正在批改，已等待 ${seconds} 秒，请保持页面打开…`)},5000);
    try{
      const photo=await preparePhoto(file);
      const form=new FormData();form.set('page',page);form.set('photo',photo);
      const response=await call('/api/assignment/grade',{method:'POST',body:form,signal:AbortSignal.timeout(120000)});
      latest=await response.json();$('view-result').disabled=false;
      status(latest.result.readable?'批改完成。请点击“查看结果”，再开始学习。':'照片无法可靠辨认，请查看结果并重新上传清晰照片。');
    }catch(error){status(error.name==='TimeoutError'?'批改超过两分钟，请刷新页面检查结果；若仍无结果，请重新上传。':error.message||'网络连接中断，请重试。',true)}finally{clearInterval(progress);button.disabled=!api}
  });
  $('view-result').addEventListener('click',async()=>{
    if(!latest)return;
    status('正在读取批改结果…');
    try{
      const response=await call('/api/assignment/image?id='+encodeURIComponent(latest.id));
      if(photoUrl)URL.revokeObjectURL(photoUrl);
      photoUrl=URL.createObjectURL(await response.blob());
      $('student-photo').src=photoUrl;
      const result=latest.result;
      $('result-summary').textContent=result.summary;
      const list=$('issue-list'),svg=$('error-marks');list.replaceChildren();svg.replaceChildren();list.classList.toggle('no-issues',!result.issues.length);
      if(result.issues.length){
        result.issues.forEach((issue,index)=>{
          const li=document.createElement('li'),strong=document.createElement('strong');strong.textContent=(index+1)+'. '+issue.label+'：';li.append(strong,document.createTextNode(issue.detail));list.append(li);
          if(issue.box){const [x1,y1,x2,y2]=issue.box;const rect=document.createElementNS('http://www.w3.org/2000/svg','rect');for(const [key,value]of Object.entries({x:x1,y:y1,width:x2-x1,height:y2-y1,fill:'#ef3333', 'fill-opacity':'.14',stroke:'#df1717','stroke-width':'5'}))rect.setAttribute(key,value);svg.append(rect)}
        });
      }else{const li=document.createElement('li');li.textContent=result.readable?'未发现可明确定位的错误；仍请对照标准作图自行核查。':'照片不足以可靠批改，请重新上传。';list.append(li)}
      $('result-panel').hidden=false;$('result-panel').scrollIntoView({behavior:'smooth',block:'nearest'});
      if(result.readable){
        const viewed=await call('/api/assignment/viewed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:latest.id})});
        latest.canLearn=(await viewed.json()).canLearn;
        $('start-learning').disabled=!latest.canLearn;
        status('已查看批改结果，现在可以开始学习。');
      }else status('请重新上传清晰照片。',true);
    }catch(error){status(error.message,true)}
  });
  $('start-learning').addEventListener('click',()=>{
    if((teacherPreview&&!previewAuthorized)||(!teacherPreview&&api&&!latest?.canLearn))return;
    document.body.classList.remove('assignment-locked');
    hub.hidden=true;app.scrollIntoView({block:'start'});
  });
  addEventListener('pagehide',()=>{if(photoUrl)URL.revokeObjectURL(photoUrl)});
  load();
})();
