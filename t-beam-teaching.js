/* 所有几何数据以 mm 表示。三维图仅压缩了梁长的屏幕展示比例。 */
(() => {
  'use strict';
  const L=5950, LX=.62;
  const cross=[[-150,0],[150,0],[150,500],[325,500],[325,600],[-325,600],[-325,500],[-150,500]];
  // 立面图给出剖切线的相对位置，未标注距梁端的精确尺寸。
  const presets={1:150,2:2157,3:1430};
  const colors={bottom:'#ffd236',bent:'#ff806e',top:'#53eafd',stirrup:'#be9cff',hoist:'#f8b65c'};
  const $=id=>document.getElementById(id);
  const canvas=$('model'),ctx=canvas.getContext('2d');
  const checks=Object.fromEntries([...document.querySelectorAll('[data-layer]')].map(el=>[el.dataset.layer,el]));
  const opacityInput=$('opacity');
  const V=(x,y,z)=>({x,y,z});
  const steel=[];
  const add=(group,id,dia,points,color)=>steel.push({group,id,dia,points,color});
  // ① 底筋：最外侧两根靠外箍筋肢，四根均贴近腹板箍筋底部内表面。
  for(const y of [-110,-20,20,110])add('bottom',1,22,[V(-2900,y,205),V(-2900,y,40),V(2900,y,40),V(2900,y,205)]);
  // ② 的下水平段分别贴靠两只 ⑥ 箍筋的下横肢。
  for(const y of [-75,75])add('bent',2,19,[V(-2923,y,561.5),V(-2723,y,561.5),V(-2200,y,38.5),V(2200,y,38.5),V(2723,y,561.5),V(2923,y,561.5)]);
  // ④ 在 2—2、3—3 断面下部贴靠两侧外箍筋肢；上端移到箍筋上横肢内侧。
  for(const side of [-1,1])add('bent',4,19,[V(-2296.5,side*75,561.5),V(-2096.5,side*75,561.5),V(-1600,side*111.5,65),V(1600,side*111.5,65),V(2096.5,side*75,561.5),V(2296.5,side*75,561.5)]);
  // ③ 在 2—2 下部贴靠左侧中间箍筋肢，至 3—3 上部进入两箍筋的叠合区。
  add('bent',3,19,[V(-1693,0,561.5),V(-1493,0,561.5),V(-1000,-21.5,68.5),V(1000,-21.5,68.5),V(1493,0,561.5),V(1693,0,561.5)]);
  // ⑤ 共八根：翼缘上层六根，两端下层各一根，均不与 ⑥、⑦ 箍筋断面相交。
  for(const y of [-290,-115,-25,25,115,290])add('top',5,12,[V(-2900,y,565),V(2900,y,565)]);
  for(const y of [-290,290])add('top',5,12,[V(-2900,y,535),V(2900,y,535)]);
  // ⑥ 两个 160 mm 宽、550 mm 高的矩形箍筋互相叠合 70 mm：
  // 红箍 y=-125..35，蓝箍 y=-35..125；腹板两侧各留 25 mm。
  // ⑦ 翼缘箍筋宽 600 mm、高 50 mm，四周按图留 25 mm。
  // 立面 @250 是名义间距，模型均布 25 道以示钢筋表的 50 根 ⑥ 和 25 根 ⑦。
  for(let i=0;i<25;i++){
    const x=-2875+i*5750/24;
    for(const [left,right,color] of [[-125,35,'#ff5f79'],[-35,125,'#5c9bff']])
      add('stirrup',6,8,[V(x,left,25),V(x,right,25),V(x,right,575),V(x,left,575),V(x,left,25)],color);
    add('stirrup',7,8,[V(x,-300,525),V(x,300,525),V(x,300,575),V(x,-300,575),V(x,-300,525)]);
  }
  for(const x of [-1975,1975])add('hoist',8,19,[V(x,-48,530),V(x,-48,680),V(x,-36,704),V(x,36,704),V(x,48,680),V(x,48,530)]);

  const steps=[
    {title:'先认清 T 形断面与梁长',text:'立面图确定纵向外形；断面图确定翼缘和腹板的组合。将 T 形断面沿梁长方向延伸，得到梁体。',points:['翼缘宽 650 mm、厚 100 mm；腹板宽 300 mm。','翼缘下腹板高 500 mm，总高 600 mm。'],layers:['concrete','bottom','bent','top','stirrup','hoist'],opacity:100},
    {title:'放入 ① 号底部纵筋',text:'腹板下部放置 4 根 Φ22 纵筋。观察端面：外侧两根贴靠外箍筋肢，其余两根也贴靠箍筋的底部内表面。',points:['①：4Φ22，单根下料长度 6580 mm。','三维弯钩仅作识图示意，长度以钢筋表为准。'],layers:['concrete','bottom','stirrup'],opacity:13},
    {title:'辨认 ②③④ 号弯起筋',text:'对照 2—2、3—3 断面追踪 Φ19 钢筋：② 左根贴红箍下横肢、右根贴蓝箍下横肢；④ 左根贴红箍外侧竖肢、右根贴蓝箍外侧竖肢；③ 在 2—2 下部贴蓝箍的中间竖肢，至 3—3 上部进入两箍筋叠合区。',points:['②：2Φ19，7700 mm；③：1Φ19，4060 mm；④：2Φ19，5260 mm。','弯起段按图纸作 45°，各钢筋断面与箍筋断面相切而不重叠。'],layers:['concrete','bottom','bent','stirrup'],opacity:12},
    {title:'布置 ⑤ 号顶部纵筋',text:'翼缘内有 8 根 Φ12 顶部纵筋：上层六根，两侧下层各一根。各根钢筋贴在箍筋内侧，断面之间留有净距。',points:['⑤：8Φ12，单根下料长度 6050 mm。','旋转至断面视角，核对六上、两下的分布。'],layers:['concrete','bottom','bent','top','stirrup'],opacity:12},
    {title:'补全箍筋与吊环',text:'两根 ⑥ 箍筋都是宽 160 mm 的矩形，在腹板中央叠合 70 mm；⑦ 为翼缘箍筋。两处 ⑧ 吊环从梁顶伸出。',points:['⑥：每梁 50 根 Φ8、单根 1570 mm；⑦：25 根 Φ8、单根 1450 mm。','⑧：2 根 Φ19、单根 1620 mm。'],layers:['concrete','bottom','bent','top','stirrup','hoist'],opacity:10},
    {title:'移动剖切面核对钢筋',text:'选择图纸的 1—1、2—2、3—3 横断面，或拖动滑杆看梁长上的任意横断面；再切换纵剖面，沿梁宽移动剖切位置。',points:['剖切会移去一侧混凝土与钢筋，剖面上的彩色点是被切到的钢筋。','将混凝土滑杆拖至最左只看钢筋，拖至最右查看实体剖面。'],layers:['concrete','bottom','bent','top','stirrup','hoist'],opacity:74,cut:'transverse'},
    {title:'回到整体配筋图',text:'将混凝土、纵筋、箍筋和吊环叠合，核对原图的立面、钢筋详图、三个断面和钢筋表。',points:['下料长度、直径与根数可在下方钢筋尺寸表逐项查看。','模型沿梁长压缩展示；梁体实际尺寸及弯钩细节均以原始配筋图为准。'],layers:['concrete','bottom','bent','top','stirrup','hoist'],opacity:23,cut:'none'}
  ];
  let step=0,yaw=-.55,pitch=.32,zoom=1,drag=null,cutMode='none',cutX=presets[1],cutY=0,selectedPreset='1';
  function projection(p){
    const xx=p.x*LX,cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
    const hx=xx*cy-p.y*sy,depth=xx*sy+p.y*cy;
    return {x:hx,y:-(p.z-300)*cp+depth*sp,d:depth*cp+(p.z-300)*sp};
  }
  function frame(){
    const points=[];for(const x of [-L/2,L/2])for(const [y,z] of cross)points.push(projection(V(x,y,z)));
    const xs=points.map(p=>p.x),ys=points.map(p=>p.y),minx=Math.min(...xs),maxx=Math.max(...xs),miny=Math.min(...ys),maxy=Math.max(...ys);
    const w=canvas.clientWidth,h=canvas.clientHeight;
    return {w,h,s:Math.min((w-72)/(maxx-minx),(h-105)/(maxy-miny))*zoom,cx:(minx+maxx)/2,cy:(miny+maxy)/2};
  }
  function screen(p,f){const q=projection(p);return {x:f.w/2+(q.x-f.cx)*f.s,y:f.h/2+(q.y-f.cy)*f.s,d:q.d};}
  function path(points,color,width,f,alpha=1,close=false){
    if(points.length<2||alpha<=0)return;ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();points.forEach((p,i)=>{const q=screen(p,f);i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y)});if(close)ctx.closePath();ctx.stroke();ctx.restore();
  }
  function polygon(points,fill,stroke,f,alpha=1){
    if(points.length<3||alpha<=0)return;ctx.save();ctx.globalAlpha=alpha;ctx.beginPath();points.forEach((p,i)=>{const q=screen(p,f);i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y)});ctx.closePath();ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=stroke;ctx.lineWidth=1.25;ctx.stroke();ctx.restore();
  }
  function clipCross(poly,limit){
    if(limit>=325)return poly.slice();const result=[];
    for(let i=0;i<poly.length;i++){
      const a=poly[i],b=poly[(i+1)%poly.length],insideA=a[0]<=limit,insideB=b[0]<=limit;
      if(insideA)result.push(a);
      if(insideA!==insideB){const t=(limit-a[0])/(b[0]-a[0]);result.push([limit,a[1]+t*(b[1]-a[1])]);}
    }
    return result;
  }
  function clipPaths(points,axis,limit,keepGreater){
    if(!axis)return [points];const inside=p=>keepGreater?p[axis]>=limit-1e-6:p[axis]<=limit+1e-6;
    const interpolate=(a,b)=>{const t=(limit-a[axis])/(b[axis]-a[axis]);return V(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,a.z+(b.z-a.z)*t)};
    const runs=[];let current=inside(points[0])?[points[0]]:[];
    for(let i=0;i<points.length-1;i++){
      const a=points[i],b=points[i+1],ia=inside(a),ib=inside(b);
      if(ia&&ib)current.push(b);
      else if(ia&&!ib){current.push(interpolate(a,b));if(current.length>1)runs.push(current);current=[];}
      else if(!ia&&ib)current=[interpolate(a,b),b];
    }
    if(current.length>1)runs.push(current);return runs;
  }
  function activePaths(points){return cutMode==='transverse'?clipPaths(points,'x',cutX-L/2,true):cutMode==='longitudinal'?clipPaths(points,'y',cutY,false):[points]}
  function activeCross(){return cutMode==='longitudinal'?clipCross(cross,cutY):cross;}
  function faces(){
    const section=activeCross(),x0=cutMode==='transverse'?cutX-L/2:-L/2,x1=L/2;
    if(section.length<3)return [];
    const result=[{points:section.map(([y,z])=>V(x0,y,z)),fill:cutMode==='transverse'?'#416c81':'#437287',stroke:'#7bc7db',cut:cutMode==='transverse'},
      {points:section.map(([y,z])=>V(x1,y,z)),fill:'#365c70',stroke:'#75b8ca'}];
    for(let i=0;i<section.length;i++){
      const [y1,z1]=section[i],[y2,z2]=section[(i+1)%section.length],isCut=cutMode==='longitudinal'&&Math.abs(y1-cutY)<1e-5&&Math.abs(y2-cutY)<1e-5;
      result.push({points:[V(x0,y1,z1),V(x1,y1,z1),V(x1,y2,z2),V(x0,y2,z2)],fill:isCut?'#416c81':z1===600&&z2===600?'#527f92':'#3b687c',stroke:isCut?'#8ee9f2':'#74b9cb',cut:isCut});
    }
    return result.sort((a,b)=>a.points.reduce((s,p)=>s+projection(p).d,0)/a.points.length-b.points.reduce((s,p)=>s+projection(p).d,0)/b.points.length);
  }
  function planeIntersections(points,axis,value){
    const hits=[];
    for(let i=0;i<points.length-1;i++){
      const a=points[i],b=points[i+1],da=a[axis]-value,db=b[axis]-value;
      if(Math.abs(da)<1e-5&&Math.abs(db)<1e-5)continue;
      if(da*db>0||Math.abs(a[axis]-b[axis])<1e-6)continue;
      const t=(value-a[axis])/(b[axis]-a[axis]);if(t<0||t>1)continue;
      const p=V(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,a.z+(b.z-a.z)*t);
      if(!hits.some(q=>Math.hypot(q.x-p.x,q.y-p.y,q.z-p.z)<.5))hits.push(p);
    }
    return hits;
  }
  function drawBars(f,alpha){
    if(alpha<=0)return;
    for(const bar of steel){if(!checks[bar.group].checked)continue;for(const run of activePaths(bar.points))path(run,bar.color||colors[bar.group],Math.max(1.3,bar.dia*f.s),f,alpha);}
  }
  function drawCutSteel(f){
    if(cutMode==='none')return;
    const axis=cutMode==='transverse'?'x':'y',value=cutMode==='transverse'?cutX-L/2:cutY;
    for(const bar of steel){if(!checks[bar.group].checked||bar.group==='hoist')continue;
      if(cutMode==='transverse'&&bar.group==='stirrup'&&Math.abs(bar.points[0].x-value)<=bar.dia/2)
        path(bar.points,bar.color||colors.stirrup,Math.max(1.3,bar.dia*f.s),f);
      if(cutMode==='longitudinal'&&['bottom','bent','top'].includes(bar.group)&&bar.points.every(p=>Math.abs(p.y-cutY)<=bar.dia/2))
        path(bar.points,bar.color||colors[bar.group],Math.max(1.3,bar.dia*f.s),f);
      for(const hit of planeIntersections(bar.points,axis,value)){
        const q=screen(hit,f);ctx.save();ctx.fillStyle=bar.color||colors[bar.group];ctx.strokeStyle='#06121f';ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(q.x,q.y,Math.max(2,bar.dia*f.s/2),0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore();
      }
    }
  }
  function render(){
    const dpr=Math.min(devicePixelRatio||1,2),w=Math.max(1,Math.round(canvas.clientWidth*dpr)),h=Math.max(1,Math.round(canvas.clientHeight*dpr));
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,canvas.clientWidth,canvas.clientHeight);
    const f=frame(),alpha=checks.concrete.checked?Number(opacityInput.value)/100:0;
    ctx.save();ctx.strokeStyle='#53eafd26';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(24,f.h-39);ctx.lineTo(f.w-24,f.h-39);ctx.stroke();ctx.restore();
    if(alpha>0)for(const face of faces())polygon(face.points,face.fill,face.stroke,f,alpha);
    drawBars(f,1-alpha);
    if(checks.hoist.checked&&alpha===1)for(const bar of steel.filter(item=>item.group==='hoist')){
      const outside=bar.points.filter(p=>p.z>=600);if(outside.length>1)path(outside,colors.hoist,Math.max(2,bar.dia*f.s),f);
    }
    drawCutSteel(f);
    if(cutMode!=='none'&&alpha>0){
      const point=cutMode==='transverse'?V(cutX-L/2,0,710):V(0,cutY,710),q=screen(point,f);
      ctx.save();ctx.fillStyle='#ffd236';ctx.font='bold 13px Microsoft YaHei';ctx.textAlign='center';ctx.fillText(cutMode==='transverse'?'横断面':'纵剖面',q.x,q.y);ctx.restore();
    }
    ctx.save();ctx.fillStyle='#a0c9d7';ctx.font='12px Microsoft YaHei';ctx.fillText('梁长方向 X',23,f.h-18);ctx.restore();
  }
  function svgTransverse(){
    const point=(y,z)=>[175+y*113/325,235-z*209/600],xy=(y,z)=>point(y,z).join(',');
    const shape=cross.map(([y,z])=>xy(y,z)).join(' '),parts=[];
    if(checks.concrete.checked&&Number(opacityInput.value)>0)parts.push(`<polygon points="${shape}" fill="#244356" stroke="#7bc7db" stroke-width="2"/>`);
    if(checks.stirrup.checked)for(const bar of steel.filter(item=>item.group==='stirrup').slice(0,3))
      parts.push(`<polyline points="${bar.points.map(p=>xy(p.y,p.z)).join(' ')}" fill="none" stroke="${bar.color||colors.stirrup}" stroke-width="2.4"/>`);
    for(const bar of steel){if(!checks[bar.group].checked||!['bottom','bent','top'].includes(bar.group))continue;
      for(const hit of planeIntersections(bar.points,'x',cutX-L/2)){
        const [x,y]=point(hit.y,hit.z),r=Math.max(3.2,bar.dia*.24);
        parts.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="${bar.color||colors[bar.group]}" stroke="#071a2a" stroke-width="1"/>`);
      }
    }
    parts.push('<text x="175" y="17" text-anchor="middle" fill="#a9d4df" font-size="12">翼缘 650 mm</text><text x="175" y="256" text-anchor="middle" fill="#a9d4df" font-size="12">腹板 300 mm · ⑥ 重叠 70 mm</text>');
    return parts.join('');
  }
  function svgLongitudinal(){
    const xmap=x=>24+(x+L/2)*302/L,zmap=z=>229-z*.29,parts=[];
    const z0=Math.abs(cutY)<150?0:500;
    if(checks.concrete.checked&&Number(opacityInput.value)>0)parts.push(`<rect x="24" y="${zmap(600)}" width="302" height="${zmap(z0)-zmap(600)}" fill="#244356" stroke="#7bc7db" stroke-width="1.7"/>`);
    for(const bar of steel){if(!checks[bar.group].checked||!['bottom','bent','top'].includes(bar.group))continue;
      if(bar.points.every(p=>Math.abs(p.y-cutY)<=bar.dia/2+2))parts.push(`<polyline points="${bar.points.map(p=>`${xmap(p.x)},${zmap(p.z)}`).join(' ')}" fill="none" stroke="${bar.color||colors[bar.group]}" stroke-width="2"/>`);
    }
    if(checks.stirrup.checked)for(const bar of steel.filter(item=>item.group==='stirrup')){
      for(const hit of planeIntersections(bar.points,'y',cutY))parts.push(`<circle cx="${xmap(hit.x)}" cy="${zmap(hit.z)}" r="2.2" fill="${bar.color||colors.stirrup}"/>`);
    }
    parts.push('<text x="175" y="21" text-anchor="middle" fill="#a9d4df" font-size="12">沿梁长 5950 mm</text><text x="175" y="258" text-anchor="middle" fill="#a9d4df" font-size="12">纵剖位置由上方滑杆控制</text>');
    return parts.join('');
  }
  function drawSection(){
    $('section-diagram').innerHTML=cutMode==='longitudinal'?svgLongitudinal():svgTransverse();
    $('section-title').textContent=cutMode==='longitudinal'?'沿梁长的纵向剖面':'钢筋在横断面中的位置';
    $('section-note').textContent=cutMode==='longitudinal'?`纵剖面位于梁宽坐标 y=${cutY} mm；拖动滑杆可观察不同宽度位置的截面。`:selectedPreset==='custom'?`横断面距梁左端 ${Math.round(cutX)} mm。钢筋点在当前位置实时计算，箍筋轮廓取邻近一道示意。`:`${selectedPreset}—${selectedPreset} 断面对应立面图的标示位置。图纸未给出距梁端的精确定位尺寸，模型按相对位置示意。`;
  }
  function updateCutUI(){
    document.querySelectorAll('[data-cut]').forEach(el=>el.classList.toggle('active',el.dataset.cut===cutMode));
    $('transverse-controls').hidden=cutMode!=='transverse';$('longitudinal-controls').hidden=cutMode!=='longitudinal';
    document.querySelectorAll('[data-preset]').forEach(el=>el.classList.toggle('active',el.dataset.preset===selectedPreset&&cutMode==='transverse'));
    $('cut-x').value=Math.round(cutX);$('cut-x-value').textContent=`距左端 ${Math.round(cutX)} mm`;
    $('cut-y').value=Math.round(cutY);$('cut-y-value').textContent=`y = ${Math.round(cutY)} mm`;
    $('section-select').value=cutMode==='longitudinal'?'custom':selectedPreset;
    drawSection();render();
  }
  function setCutMode(mode){cutMode=mode;updateCutUI()}
  function selectPreset(value){selectedPreset=String(value);cutX=presets[value];cutMode='transverse';updateCutUI()}
  function setStep(index){
    step=Math.max(0,Math.min(steps.length-1,index));const item=steps[step];
    document.querySelectorAll('[data-step]').forEach(el=>el.setAttribute('aria-selected',String(Number(el.dataset.step)===step)));
    $('step-counter').textContent=`${step+1} / ${steps.length}`;$('step-kicker').textContent=`第 ${step+1} 步`;
    $('step-title').textContent=item.title;$('step-text').textContent=item.text;
    $('step-points').replaceChildren(...item.points.map(point=>{const li=document.createElement('li');li.textContent=point;return li}));
    for(const [name,el] of Object.entries(checks))el.checked=item.layers.includes(name);
    opacityInput.value=item.opacity;$('opacity-value').textContent=`${item.opacity}%`;
    $('prev-step').disabled=step===0;$('next-step').disabled=step===steps.length-1;
    cutMode=item.cut||'none';updateCutUI();
  }
  function setView(name){
    if(name==='front'){yaw=0;pitch=0}else if(name==='end'){yaw=-Math.PI/2;pitch=0}else{yaw=-.55;pitch=.32}
    document.querySelectorAll('[data-view]').forEach(el=>el.classList.toggle('active',el.dataset.view===name));render();
  }
  document.querySelectorAll('[data-step]').forEach(el=>el.addEventListener('click',()=>setStep(Number(el.dataset.step))));
  $('prev-step').addEventListener('click',()=>setStep(step-1));$('next-step').addEventListener('click',()=>setStep(step+1));
  document.querySelectorAll('[data-view]').forEach(el=>el.addEventListener('click',()=>setView(el.dataset.view)));
  $('reset-view').addEventListener('click',()=>{zoom=1;setView('iso')});
  document.querySelectorAll('[data-cut]').forEach(el=>el.addEventListener('click',()=>setCutMode(el.dataset.cut)));
  document.querySelectorAll('[data-preset]').forEach(el=>el.addEventListener('click',()=>selectPreset(el.dataset.preset)));
  $('section-select').addEventListener('change',e=>{if(e.target.value==='custom'){cutMode='transverse';selectedPreset='custom';updateCutUI()}else selectPreset(e.target.value)});
  $('cut-x').addEventListener('input',e=>{cutX=Number(e.target.value);selectedPreset='custom';cutMode='transverse';updateCutUI()});
  $('cut-y').addEventListener('input',e=>{cutY=Number(e.target.value);cutMode='longitudinal';updateCutUI()});
  Object.values(checks).forEach(el=>el.addEventListener('change',updateCutUI));
  opacityInput.addEventListener('input',()=>{$('opacity-value').textContent=`${opacityInput.value}%`;drawSection();render()});
  canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,yaw,pitch};canvas.setPointerCapture(e.pointerId)});
  canvas.addEventListener('pointermove',e=>{if(!drag)return;yaw=drag.yaw+(e.clientX-drag.x)*.006;pitch=Math.max(-.85,Math.min(.85,drag.pitch+(e.clientY-drag.y)*.004));document.querySelectorAll('[data-view]').forEach(el=>el.classList.remove('active'));render()});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>{drag=null});
  canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(.55,Math.min(2.6,zoom*(e.deltaY>0?.9:1.1)));render()},{passive:false});
  new ResizeObserver(render).observe(canvas);setStep(0);
})();
