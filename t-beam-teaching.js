/* 图纸单位为 mm。模型沿梁长压缩为 0.62 倍，仅改变展示比例。 */
(() => {
  'use strict';
  const L=5950, LX=.62, cross=[[-150,0],[150,0],[150,500],[325,500],[325,600],[-325,600],[-325,500],[-150,500]];
  const colors={bottom:'#d26a3e',bent:'#b74d71',top:'#407ab2',stirrup:'#9863a8',hoist:'#af903c'};
  const canvas=document.getElementById('model'),ctx=canvas.getContext('2d');
  const checks=Object.fromEntries([...document.querySelectorAll('[data-layer]')].map(el=>[el.dataset.layer,el]));
  const opacityInput=document.getElementById('opacity');
  const steps=[
    {title:'先认清 T 形断面与梁长',text:'立面图确定梁的纵向外形；断面图确定翼缘与腹板的组合。沿梁长方向延伸 T 形断面，得到混凝土梁体。',points:['翼缘宽 650 mm、厚 100 mm；腹板宽 300 mm。','翼缘以下腹板高 500 mm，总高 600 mm。'],layers:['concrete'],opacity:82},
    {title:'放入 ① 号底部纵筋',text:'对照钢筋详图与断面图，在腹板底部沿梁长安放 4 根 Φ22 底筋。两端按图纸设弯钩。',points:['① 号钢筋：4Φ22，单根下料长度 6580 mm。','观察 1—1、2—2、3—3 断面中的四个底部位置。'],layers:['concrete','bottom'],opacity:21},
    {title:'辨认 ②③④ 号弯起筋',text:'从立面图追踪三组纵筋的水平段与斜段。弯起位置随钢筋编号不同，断面上的位置也随之变化。',points:['②：2Φ19；③：1Φ19；④：2Φ19。','图纸说明弯起钢筋均弯起 45°；模型显示其空间走向。'],layers:['concrete','bottom','bent'],opacity:17},
    {title:'布置 ⑤ 号翼缘顶筋',text:'在翼缘上部沿梁长布置 8 根 Φ12 纵筋。旋转至端面，与断面图顶部的八个钢筋位置对应。',points:['⑤ 号钢筋：8Φ12，单根下料长度 6050 mm。','顶筋位于翼缘内，不能误放到腹板底部。'],layers:['concrete','bottom','bent','top'],opacity:15},
    {title:'认识 ⑥⑦ 号箍筋与 ⑧ 号吊环',text:'箍筋沿梁长重复布置，围住腹板和翼缘内的纵筋；两处吊环从梁顶伸出。通过旋转观察其与纵筋的交织关系。',points:['⑥、⑦ 均为 Φ8；立面标注间距 @250。','⑧ 为吊环，图纸标注 2Φ19。'],layers:['concrete','bottom','bent','top','stirrup','hoist'],opacity:12},
    {title:'用三个断面反查立面',text:'切换 1—1、2—2、3—3 断面，观察钢筋在不同纵向位置的变化。断面中的黑点代表被剖切的纵筋。',points:['先辨认不变的 ① 底筋与 ⑤ 顶筋。','再核对弯起筋在翼缘附近或腹板底部的位置。'],layers:['concrete','bottom','bent','top','stirrup','hoist'],opacity:13},
    {title:'回到整体配筋图',text:'把梁体、纵筋、箍筋和吊环叠加，再与原图的立面图、钢筋详图和钢筋表互相核对。',points:['钢筋表给出编号、直径、单根长度和每梁根数。','三维视图说明空间位置；精确构造以原始配筋图为准。'],layers:['concrete','bottom','bent','top','stirrup','hoist'],opacity:23}
  ];
  let step=0,section=1,yaw=.55,pitch=.32,zoom=1,drag=null,view='iso';
  const P=(x,y,z)=>({x,y,z});
  const bars={bottom:[],bent:[],top:[],stirrup:[],hoist:[]};
  for(const y of [-102,-34,34,102])bars.bottom.push([P(-2900,y,48),P(-2885,y,205),P(-2885,y,48),P(2885,y,48),P(2885,y,205)]);
  for(const y of [-98,98])bars.bent.push([P(-2910,y,545),P(-2730,y,545),P(-2210,y,77),P(2210,y,77),P(2730,y,545),P(2910,y,545)]);
  for(const y of [-67,67])bars.bent.push([P(-2320,y,545),P(-2110,y,545),P(-1600,y,86),P(1600,y,86),P(2110,y,545),P(2320,y,545)]);
  bars.bent.push([P(-1640,0,545),P(-1450,0,545),P(-1000,0,90),P(1000,0,90),P(1450,0,545),P(1640,0,545)]);
  for(const y of [-282,-210,-138,-46,46,138,210,282])bars.top.push([P(-2900,y,557),P(2900,y,557)]);
  // 原图的箍筋与翼缘拉结筋按 @250 示意；具体根数以钢筋表为准。
  for(let x=-2800;x<=2800;x+=250){
    bars.stirrup.push([P(x,-125,50),P(x,125,50),P(x,125,548),P(x,-125,548),P(x,-125,50)]);
    bars.stirrup.push([P(x,-292,538),P(x,292,538),P(x,292,575),P(x,-292,575),P(x,-292,538)]);
  }
  for(const x of [-1975,1975])bars.hoist.push([P(x,-48,530),P(x,-48,680),P(x,-36,704),P(x,36,704),P(x,48,680),P(x,48,530)]);
  function projection(p){
    const xx=p.x*LX,cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
    const hx=xx*cy-p.y*sy,depth=xx*sy+p.y*cy;
    return {x:hx,y:-(p.z-300)*cp+depth*sp,d:depth*cp+(p.z-300)*sp};
  }
  function frame(){
    const pts=[];for(const x of [-L/2,L/2])for(const [y,z] of cross)pts.push(projection(P(x,y,z)));
    const xs=pts.map(p=>p.x),ys=pts.map(p=>p.y),minx=Math.min(...xs),maxx=Math.max(...xs),miny=Math.min(...ys),maxy=Math.max(...ys);
    const w=canvas.clientWidth,h=canvas.clientHeight;return {w,h,s:Math.min((w-72)/(maxx-minx),(h-105)/(maxy-miny))*zoom,cx:(minx+maxx)/2,cy:(miny+maxy)/2};
  }
  function screen(p,f){const q=projection(p);return {x:f.w/2+(q.x-f.cx)*f.s,y:f.h/2+(q.y-f.cy)*f.s,d:q.d};}
  function poly(points,fill,stroke,f,alpha=1,dash=[]){ctx.save();ctx.globalAlpha=alpha;ctx.setLineDash(dash);ctx.beginPath();points.forEach((p,i)=>{const q=screen(p,f);if(i)ctx.lineTo(q.x,q.y);else ctx.moveTo(q.x,q.y)});ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.1;ctx.stroke()}ctx.restore()}
  function path(points,color,width,f,alpha=1){ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();points.forEach((p,i)=>{const q=screen(p,f);i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y)});ctx.stroke();ctx.restore()}
  function drawConcrete(f){
    if(!checks.concrete.checked)return;
    const a=Number(opacityInput.value)/100;
    const faces=[];
    faces.push({pts:cross.map(([y,z])=>P(-L/2,y,z)),color:'#b1cdd0'});
    faces.push({pts:cross.map(([y,z])=>P(L/2,y,z)),color:'#9dbec3'});
    for(let i=0;i<cross.length;i++){const j=(i+1)%cross.length,[y1,z1]=cross[i],[y2,z2]=cross[j];faces.push({pts:[P(-L/2,y1,z1),P(L/2,y1,z1),P(L/2,y2,z2),P(-L/2,y2,z2)],color:z1===600&&z2===600?'#d6e9e8':z1===500&&z2===500?'#c3dedf':'#b7d2d5'})}
    faces.sort((a,b)=>a.pts.reduce((s,p)=>s+projection(p).d,0)/a.pts.length-b.pts.reduce((s,p)=>s+projection(p).d,0)/b.pts.length);
    for(const face of faces)poly(face.pts,face.color,'#3f7782',f,a);
  }
  function drawSectionPlane(f){
    if(step!==5)return;const x=section===1?-2350:section===2?820:-820;
    poly(cross.map(([y,z])=>P(x,y,z)),'#f0b468','#c57623',f,.27,[5,4]);
    const q=screen(P(x,0,705),f);ctx.save();ctx.fillStyle='#925016';ctx.font='bold 14px Microsoft YaHei';ctx.textAlign='center';ctx.fillText(`${section}—${section}`,q.x,q.y);ctx.restore();
  }
  function render(){
    const dpr=Math.min(devicePixelRatio||1,2),w=Math.max(1,Math.round(canvas.clientWidth*dpr)),h=Math.max(1,Math.round(canvas.clientHeight*dpr));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,canvas.clientWidth,canvas.clientHeight);
    const f=frame();ctx.save();ctx.strokeStyle='#c7d9da';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(24,f.h-39);ctx.lineTo(f.w-24,f.h-39);ctx.stroke();ctx.restore();
    drawConcrete(f);
    const groups=['bottom','bent','top','stirrup','hoist'];
    for(const group of groups){if(!checks[group].checked)continue;const opacity=checks.concrete.checked&&Number(opacityInput.value)>90?.53:1;for(const pts of bars[group])path(pts,colors[group],group==='stirrup'?2:group==='hoist'?3.5:3,f,opacity)}
    drawSectionPlane(f);
    ctx.save();ctx.fillStyle='#62818a';ctx.font='12px Microsoft YaHei';ctx.fillText('纵向 X',23,f.h-18);ctx.restore();
  }
  function setStep(index){step=Math.max(0,Math.min(steps.length-1,index));const item=steps[step];document.querySelectorAll('[data-step]').forEach(el=>el.setAttribute('aria-selected',String(Number(el.dataset.step)===step)));document.getElementById('step-counter').textContent=`${step+1} / ${steps.length}`;document.getElementById('step-kicker').textContent=`第 ${step+1} 步 · ${item.title.split(' ')[0]}`;document.getElementById('step-title').textContent=item.title;document.getElementById('step-text').textContent=item.text;document.getElementById('step-points').replaceChildren(...item.points.map(point=>{const li=document.createElement('li');li.textContent=point;return li}));for(const [name,el] of Object.entries(checks))el.checked=item.layers.includes(name);opacityInput.value=item.opacity;document.getElementById('opacity-value').textContent=`透视 ${item.opacity}%`;document.getElementById('prev-step').disabled=step===0;document.getElementById('next-step').disabled=step===steps.length-1;render()}
  function setView(name){view=name;if(name==='front'){yaw=0;pitch=0}else if(name==='end'){yaw=Math.PI/2;pitch=0}else{yaw=.55;pitch=.32}document.querySelectorAll('[data-view]').forEach(el=>el.classList.toggle('active',el.dataset.view===name));render()}
  function drawSection(){
    const svg=document.getElementById('section-diagram'),s=section;
    const circles=[];const circle=(x,y,r,color)=>circles.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" stroke="#fff" stroke-width="1.5"/>`);
    [-100,-72,-44,-16,16,44,72,100].forEach(x=>circle(175+x,44,5,'#407ab2'));
    [-33,-11,11,33].forEach(x=>circle(175+x,224,6,'#d26a3e'));
    if(s===1){[-30,30].forEach(x=>circle(175+x,56,5,'#b74d71'))}
    else{[-40,40].forEach(x=>circle(175+x,210,5,'#b74d71'));if(s===2){circle(175,207,5,'#b74d71');[-22,22].forEach(x=>circle(175+x,215,5,'#b74d71'))}else{[-20,20].forEach(x=>circle(175+x,205,5,'#b74d71'));circle(175,58,5,'#b74d71')}}
    svg.innerHTML=`<path d="M62 26H288V61H227V235H123V61H62Z" fill="#e1eeec" stroke="#3a6c72" stroke-width="2"/><path d="M130 225V57H220V225Z" fill="none" stroke="#9863a8" stroke-width="2.3"/>${circles.join('')}<text x="175" y="256" text-anchor="middle" fill="#466a75" font-size="12">腹板 300 mm</text><text x="175" y="17" text-anchor="middle" fill="#466a75" font-size="12">翼缘 650 mm</text>`;
    const notes={1:'1—1 位于端部：重点观察翼缘内的 ⑤ 号顶筋、腹板底部的 ① 号底筋，以及靠近上部的弯起筋。',2:'2—2 位于梁身：弯起筋转入腹板下部，与 ① 号底筋在断面中形成不同层次。',3:'3—3 位于另一纵向位置：再核对部分弯起筋在上下部之间的位置变化。'};document.getElementById('section-note').textContent=notes[s];
  }
  document.querySelectorAll('[data-step]').forEach(el=>el.addEventListener('click',()=>setStep(Number(el.dataset.step))));
  document.getElementById('prev-step').addEventListener('click',()=>setStep(step-1));document.getElementById('next-step').addEventListener('click',()=>setStep(step+1));
  document.querySelectorAll('[data-view]').forEach(el=>el.addEventListener('click',()=>setView(el.dataset.view)));document.getElementById('reset-view').addEventListener('click',()=>{zoom=1;setView('iso')});
  Object.values(checks).forEach(el=>el.addEventListener('change',render));opacityInput.addEventListener('input',()=>{document.getElementById('opacity-value').textContent=`透视 ${opacityInput.value}%`;render()});
  document.getElementById('section-select').addEventListener('change',e=>{section=Number(e.target.value);drawSection();render()});
  canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,yaw,pitch};canvas.setPointerCapture(e.pointerId)});
  canvas.addEventListener('pointermove',e=>{if(!drag)return;yaw=drag.yaw+(e.clientX-drag.x)*.006;pitch=Math.max(-.85,Math.min(.85,drag.pitch+(e.clientY-drag.y)*.004));document.querySelectorAll('[data-view]').forEach(el=>el.classList.remove('active'));render()});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>{drag=null});
  canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(.55,Math.min(2.6,zoom*(e.deltaY>0?.9:1.1)));render()},{passive:false});
  new ResizeObserver(render).observe(canvas);drawSection();setStep(0);
})();
