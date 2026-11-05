// Shared by the catalog and lesson pages. This is a learning register, not identity verification.
(()=>{
  const config=window.COURSE_CONFIG||{},api=String(config.apiBase||'').replace(/\/$/,'');
  let session;try{session=JSON.parse(sessionStorage.getItem('dg-study-session')||'null')}catch{}
  if(!session?.studentId){
    const here=location.pathname.split('/').pop()+(location.hash||'');
    location.replace('index.html?next='+encodeURIComponent(here));
    return;
  }
  if(session.demo||!api)return;
  const page=location.pathname.split('/').pop()||'catalog.html';
  let pending=0,lastTick=performance.now(),lastActivity=lastTick,waiting=false;
  let wasForeground=document.visibilityState==='visible'&&document.hasFocus();
  const sample=()=>{const now=performance.now();if(wasForeground)pending+=Math.max(0,Math.min(now,lastActivity+120000)-lastTick)/1000;lastTick=now;wasForeground=document.visibilityState==='visible'&&document.hasFocus()};
  const touch=()=>{sample();lastActivity=performance.now()};
  ['pointerdown','keydown','scroll'].forEach(type=>addEventListener(type,touch,{passive:true}));
  addEventListener('pointermove',()=>{if(performance.now()-lastActivity>30000)touch()},{passive:true});
  ['focus','blur'].forEach(type=>addEventListener(type,()=>{sample();lastTick=performance.now()}));
  document.addEventListener('visibilitychange',()=>{sample();if(document.hidden)flush(true);lastTick=performance.now()});
  async function flush(final=false){
    sample();if(waiting&&!final)return;
    const seconds=Math.min(30,Math.floor(pending));if(seconds)pending-=seconds;
    const body=JSON.stringify({sessionId:session.sessionId,token:session.token,page,activeSeconds:seconds});
    if(final&&navigator.sendBeacon){navigator.sendBeacon(api+'/api/session/heartbeat',new Blob([body],{type:'text/plain'}));return}
    waiting=true;try{const response=await fetch(api+'/api/session/heartbeat',{method:'POST',headers:{'Content-Type':'text/plain'},body,keepalive:final});if(!response.ok){pending+=seconds;if(response.status===401)sessionStorage.removeItem('dg-study-session')}}catch{pending+=seconds}finally{waiting=false}
  }
  flush();setInterval(()=>{sample();if(pending>=10)flush()},15000);
  addEventListener('pagehide',()=>flush(true));
})();
