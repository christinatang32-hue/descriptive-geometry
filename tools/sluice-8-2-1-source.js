(()=>{
  'use strict';
  // Relative drawing units read from the supplied projections. The exercise has no mm labels.
  // Photo coordinates: x=158..528, plan y=925..1151, elevation z=544..367.
  const G=Object.freeze(__SLUICE_GEOMETRY__);
  const photo=G.photo;
  const measuredX=photo.x.map(value=>value-photo.x[0]);
  const measuredY=photo.planY.map(value=>value-photo.planY[0]);
  const modelX=[0,...G.breaks,...G.slot,G.length].sort((a,b)=>a-b);
  const modelY=[...G.walls.slice(0,3),G.cutY,...G.walls.slice(3)];
  if(measuredX.some((value,index)=>value!==modelX[index])||measuredY.some((value,index)=>value!==modelY[index])||
     photo.elevationY.map(value=>photo.elevationY.at(-1)-value).join(',')!==[G.height,G.crest,G.floor,0].join(','))
    throw Error('题图量取数据与空间模型不一致');
  const steps=[
    {title:'读题',action:'对照正面投影、水平投影和剖开后的轴测图，找出底板、两侧立墙、两段斜坡和门槽。以闸室左端和底边作量取基准，按题图比例转移长度。'},
    {title:'确定剖切位置',action:'沿水平投影中两端编号为 1 的剖切线作纵向剖切，由图下方向上方观察。对照轴测图，移去近侧一半，保留被剖到的底板、斜坡和切面后方的立墙。'},
    {title:'绘制轮廓线',action:'先用细实线绘制出所有的轮廓线。四个变坡点从左到右编号。\n1. 从左向右画底边，从底边左端向上画左竖线，再从左向右画顶边。直接连接两条水平线的右端点，画出右竖线。\n2. 从底边左端向上量取低台面高度，再向右量取低台面长度，确定第 1 点并画出左段低台面。\n3. 从底边左端向上量取高台面高度，再向右量取高台面左端到左竖线的距离，确定第 2 点。从第 2 点向右量取高台面长度，确定第 3 点。画出高台面，连接第 1、2 点，并从顶边补画门槽的可见竖线。\n4. 从底边右端向上量取低台面高度，再向左量取低台面长度，确定第 4 点。画出右段低台面，最后从第 4 点连到第 3 点。'},
    {title:'填充钢筋混凝土图例',action:'保留细实线轮廓。在剖到的混凝土范围内画连续的 45° 细实线，再散布小三角和小点。'},
    {title:'加粗结果并核对',action:'本题取 b = 0.8 mm。切到的轮廓用 0.7b 中粗实线（0.56 mm），未切到的可见轮廓用 0.5b 中实线（0.40 mm）。标注“1—1 剖面图”，核对总长、墙高、两级高程、四处变坡位置及门槽宽度。'}
  ];
  const $=id=>document.getElementById(id);
  const scene=$('scene'),diagram=$('diagram');
  let step=0,phase=0,playing=false,stepTimer=0,playTimer=0,zoom=1,panX=0,panY=0,diagramDrag=null;
  const FX=70,FY=275,PY=335,SX=570;
  const fy=z=>FY-z,px=x=>FX+x,sx=x=>SX+x,py=y=>PY+y;
  const n=v=>Math.round(v*100)/100;
  const ln=(x1,y1,x2,y2,cls,extra='')=>`<line class="${cls}" x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}" ${extra}/>`;
  const path=(d,cls,extra='')=>`<path class="${cls}" d="${d}" ${extra}/>`;
  const txt=(x,y,value,cls='')=>`<text class="${cls}" x="${x}" y="${y}">${value}</text>`;
  const profile=x=>x<=G.breaks[0]?G.floor:x<G.breaks[1]?G.floor+(G.crest-G.floor)*(x-G.breaks[0])/(G.breaks[1]-G.breaks[0]):x<=G.breaks[2]?G.crest:x<G.breaks[3]?G.crest-(G.crest-G.floor)*(x-G.breaks[2])/(G.breaks[3]-G.breaks[2]):G.floor;
  const topPoints=[[0,G.floor],...[...G.breaks].map(x=>[x,profile(x)]),[G.length,G.floor]];
  const polyline=(pts,xOffset,yMap)=>'M'+pts.map(([x,z])=>`${n(xOffset+x)} ${n(yMap(z))}`).join(' L');
  const elevationProfile=polyline(topPoints,FX,fy);
  const sectionFill=polyline(topPoints,SX,fy)+` L${SX+G.length} ${FY} L${SX} ${FY} Z`;
  const cutLabel=()=>txt(SX+110,316,'1—1 剖面图','section-name');
  const hatchInk='#82969a',aggregateInk='#687c81';
  // Create one set of marks per page load and reuse it while stepping and rotating.
  const hatchLines=[];
  for(let x=-G.crest;x<G.length;x+=19)hatchLines.push(`M${x} 0 l${G.crest} ${-G.crest}`);
  const aggregate=[],triangles=[],dots=[];
  for(const [count,spacing] of [[24,7],[52,3]]){
    for(let added=0,attempt=0;added<count&&attempt<800;attempt++){
      const x=G.length*Math.random(),z=G.crest*Math.random();
      if(x<7||x>G.length-7||z<7||z>profile(x)-9)continue;
      if(aggregate.some(mark=>Math.hypot(mark.x-x,mark.z-z)<spacing+mark.spacing))continue;
      aggregate.push({x,z,spacing});added++;
      if(spacing===7){
        const angle=2*Math.PI*Math.random(),radius=2.8+1.3*Math.random();
        const corners=[0,1,2].map(index=>{
          const a=angle+index*2*Math.PI/3;
          return `${n(x+radius*Math.cos(a))} ${n(-z+radius*Math.sin(a))}`;
        });
        triangles.push(`M${corners.join(' L')} Z`);
      }else dots.push({x,z,r:.65+.5*Math.random()});
    }
  }
  const hatchPath=hatchLines.join(' '),trianglePath=triangles.join(' ');
  function sectionMaterial(){
    return `<g clip-path="url(#section-clip)"><g transform="translate(${SX} ${FY})">`+
      path(hatchPath,'material-line',`stroke="${hatchInk}" stroke-width="0.10mm" fill="none"`)+
      path(trianglePath,'material-line',`stroke="${aggregateInk}" stroke-width=".85" fill="none"`)+
      dots.map(({x,z,r})=>`<circle cx="${n(x)}" cy="${n(-z)}" r="${n(r)}" fill="${aggregateInk}"/>`).join('')+'</g></g>';
  }
  function knownViews(){
    let out=`<defs><clipPath id="section-clip"><path d="${sectionFill}"/></clipPath></defs>`;
    out+=txt(FX,70,'正面投影','view-title')+txt(FX,320,'水平投影','view-title');
    out+=`<rect class="given" x="${FX}" y="${FY-G.height}" width="${G.length}" height="${G.height}"/>`;
    out+=path(elevationProfile,'hidden-line');
    for(const x of G.slot)out+=ln(px(x),fy(G.height),px(x),fy(G.crest),'hidden-line');
    out+=`<rect class="given" x="${FX}" y="${PY}" width="${G.length}" height="${G.depth}"/>`;
    const [,notchBack,innerBack,innerFront,notchFront]=G.walls,[slotLeft,slotRight]=G.slot;
    out+=path(`M${px(0)} ${py(innerBack)} L${px(slotLeft)} ${py(innerBack)} L${px(slotLeft)} ${py(notchBack)} L${px(slotRight)} ${py(notchBack)} L${px(slotRight)} ${py(innerBack)} L${px(G.length)} ${py(innerBack)}`,'given');
    out+=path(`M${px(0)} ${py(innerFront)} L${px(slotLeft)} ${py(innerFront)} L${px(slotLeft)} ${py(notchFront)} L${px(slotRight)} ${py(notchFront)} L${px(slotRight)} ${py(innerFront)} L${px(G.length)} ${py(innerFront)}`,'given');
    for(const x of G.breaks)out+=ln(px(x),py(innerBack),px(x),py(innerFront),'given');
    const y=py(G.cutY);
    out+=ln(px(-22),y,px(G.length+22),y,step===1?'axis-line cut-active':'axis-line');
    for(const [x,inward] of [[-45,1],[G.length+45,-1]]){
      out+=path(`M${px(x)} ${y-17} V${y} H${px(x+inward*16)}`,'given');
      out+=txt(px(x)-3,y-22,'1');
    }
    return out;
  }
  const L=G.length,H=G.height,cutY=G.cutY;
  const segment=(a,b,cls)=>ln(...a,...b,cls);
  const front=([x,z])=>[px(x),fy(z)],section=([x,z])=>[sx(x),fy(z)];
  const sectionLine=(a,b,cls)=>segment(section(a),section(b),cls);
  const axonSegment=(a,b,y=cutY)=>[a,b].map(([x,z])=>[x,y,z]);
  const frontMeasure=(a,b,side)=>({a:front(a),b:front(b),side});
  const sectionMeasure=(a,b,side)=>({a:section(a),b:section(b),side});
  const planMeasure=(from,to,y,side)=>({a:[px(from),py(y)],b:[px(to),py(y)],side});
  function breakPoint({position:[x,z],number}){
    return `<circle cx="${sx(x)}" cy="${fy(z)}" r="3" fill="white" stroke="#dd663c" stroke-width="1.4"/>`+
      txt(sx(x)+(number===1?-16:7),fy(z)-6,number,'break-number');
  }
  function brace({a,b,side}){
    const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);
    const at=(t,offset)=>`${n(a[0]+t*dx-side*offset*dy/length)} ${n(a[1]+t*dy+side*offset*dx/length)}`;
    const end=Math.min(.22,12/length);
    return path(`M${at(0,4)} C${at(0,10)} ${at(end/2,10)} ${at(end,10)} L${at(.5-end,10)} `+
      `Q${at(.5,10)} ${at(.5,16)} Q${at(.5,10)} ${at(.5+end,10)} L${at(1-end,10)} `+
      `C${at(1-end/2,10)} ${at(1,10)} ${at(1,4)}`,'measure-brace');
  }
  const measure=mark=>segment(mark.a,mark.b,'measure-edge')+brace(mark);
  const leftBase=[0,0],rightBase=[L,0];
  const wallTop=[[0,H],[L,H]];
  const [leftFloor,firstBreak,secondBreak,thirdBreak,fourthBreak,rightFloor]=topPoints;
  const slotEdges=G.slot.map(x=>[[x,H],[x,G.crest]]);
  const drawEdge=(a,b,y)=>({edge:[a,b],axon:axonSegment(a,b,y)});
  function transferHeight(a,b,side,y){
    return {source:frontMeasure(a,b,side),target:sectionMeasure(a,b,side),axon:axonSegment(a,b,y)};
  }
  function locateBreak(a,b,number,side=-1){
    return {source:planMeasure(a[0],b[0],cutY,side),target:sectionMeasure(a,b,side),
      axon:axonSegment(a,b),position:b,number};
  }
  const contourOperations=[
    {...drawEdge(leftBase,rightBase),source:frontMeasure(leftBase,rightBase,1),
      target:sectionMeasure([0,-10],[L,-10],1)},
    {...transferHeight(leftBase,wallTop[0],-1,G.walls[0]),edge:[leftBase,wallTop[0]]},
    drawEdge(...wallTop,G.walls[0]),
    {edge:[wallTop[1],rightBase]},
    transferHeight(leftBase,leftFloor,-1),
    locateBreak(leftFloor,firstBreak,1),
    drawEdge(leftFloor,firstBreak),
    transferHeight(leftBase,[0,G.crest],-1),
    locateBreak([0,G.crest],secondBreak,2),
    locateBreak(secondBreak,thirdBreak,3),
    drawEdge(secondBreak,thirdBreak),
    drawEdge(firstBreak,secondBreak),
    ...slotEdges.map(([a,b])=>({...drawEdge(a,b,G.walls[2]),
      source:planMeasure(0,a[0],G.walls[2],-1),target:sectionMeasure([0,H+10],[a[0],H+10],-1)})),
    transferHeight(rightBase,rightFloor,1),
    locateBreak(rightFloor,fourthBreak,4,1),
    drawEdge(fourthBreak,rightFloor),
    drawEdge(fourthBreak,thirdBreak)
  ];
  const contourPhases=contourOperations.length*3;
  function sectionDrawing(){
    if(step<2)return step===1?txt(SX,70,'待作 1—1 剖面图','view-title'):'';
    let out=step>=3?sectionMaterial():'';
    if(step===steps.length-1){
      for(const [a,b] of [[[0,G.floor],[0,H]],[[L,G.floor],[L,H]],wallTop,...slotEdges]){
        out+=sectionLine(a,b,'result-behind');
      }
      return out+path(sectionFill,'result-cut')+cutLabel();
    }
    const drawing=step===2;
    let points='';
    for(const [index,item] of contourOperations.entries()){
      const progress=drawing?phase-3*index:3;
      if(progress<1)break;
      const cls=progress===2?'drawing-edge':'process';
      if(item.edge&&progress>=2){
        const [a,b]=item.edge;
        out+=cls==='drawing-edge'?tracedLine(section(a),section(b),cls):sectionLine(a,b,cls);
      }
      if(drawing&&item.position)points+=breakPoint(item);
    }
    return out+points+(step>=3?cutLabel():'');
  }
  function measurementMarks(){
    const item=step===2?contourOperations[Math.floor(phase/3)]:null;
    if(!item)return '';
    let out='';
    if(item.axon){
      const [a,b]=item.axon.map(axonProject);
      out+=ln(a.x,a.y,b.x,b.y,'measure-edge');
    }
    if(item.source)out+=measure(item.source);
    if(item.target&&phase%3===1)out+=measure(item.target);
    return out;
  }
  /* SECTION_LINE_TRACE */

  function render2D(){
    scene.innerHTML=knownViews()+axonView+sectionDrawing()+measurementMarks();
    scene.setAttribute('transform',`translate(${505*(1-zoom)+panX} ${300*(1-zoom)+panY}) scale(${zoom})`);
    startLineTrace();
    $('count').textContent=step===0?'准备 · 读题':`步骤 ${String(step).padStart(2,'0')} / ${String(steps.length-1).padStart(2,'0')}`;
    $('stepTitle').textContent=steps[step].title;
    $('action').textContent=steps[step].action;
    $('prev').disabled=step===0;$('next').disabled=step===steps.length-1;
    $('progress').value=String(step);$('progressText').textContent=`${step} / ${steps.length-1}`;
    $('zoomValue').textContent=`${Math.round(zoom*100)}%`;
    for(const button of $('steps').children)button.setAttribute('aria-current',Number(button.dataset.step)===step?'step':'false');
  }
  const sourceTime=850,transferTime=750,drawDuration=1000;
  function phaseDuration(index){
    const item=contourOperations[Math.floor(index/3)];
    if(index%3===0)return item.source||item.axon?sourceTime:0;
    if(index%3===1)return item.target?transferTime:0;
    return item.edge?drawDuration:0;
  }
  function setStep(value){
    clearTimeout(stepTimer);
    step=Math.max(0,Math.min(steps.length-1,Number(value)));phase=0;
    const count=step===2?contourPhases:0;
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(reduced)phase=count;
    function showPhase(){
      render2D();
      if(phase<count)stepTimer=setTimeout(()=>{phase++;showPhase()},phaseDuration(phase));
    }
    showPhase();
    return reduced?0:Array.from({length:count},(_,index)=>phaseDuration(index)).reduce((sum,time)=>sum+time,0);
  }
  function stopPlay(){playing=false;clearTimeout(playTimer);$('play').textContent='播放'}
  function playNext(){
    if(!playing)return;
    if(step>=steps.length-1){stopPlay();return}
    const duration=setStep(step+1);
    playTimer=setTimeout(playNext,Math.max(2500,duration+900));
  }
  $('prev').addEventListener('click',()=>{stopPlay();setStep(step-1)});
  $('next').addEventListener('click',()=>{stopPlay();setStep(step+1)});
  $('restart').addEventListener('click',()=>{stopPlay();setStep(0)});
  $('complete').addEventListener('click',()=>{stopPlay();setStep(steps.length-1)});
  $('play').addEventListener('click',()=>{if(playing){stopPlay();return}playing=true;$('play').textContent='暂停';playNext()});
  $('progress').addEventListener('input',event=>{stopPlay();setStep(event.target.value)});
  steps.forEach((item,index)=>{const button=document.createElement('button');button.type='button';button.dataset.step=String(index);button.textContent=(index===0?'准备':String(index).padStart(2,'0'))+' '+item.title;button.addEventListener('click',()=>{stopPlay();setStep(index)});$('steps').append(button)});
  const changeZoom=value=>{zoom=Math.max(.75,Math.min(2.8,value));render2D()};
  $('zoomIn').addEventListener('click',()=>changeZoom(zoom*1.2));
  $('zoomOut').addEventListener('click',()=>changeZoom(zoom/1.2));
  $('fit').addEventListener('click',()=>{zoom=1;panX=0;panY=0;render2D()});
  $('canvas').addEventListener('wheel',event=>{event.preventDefault();changeZoom(zoom*(event.deltaY<0?1.12:1/1.12))},{passive:false});
  $('canvas').addEventListener('pointerdown',event=>{if(zoom<=1)return;diagramDrag={x:event.clientX,y:event.clientY};$('canvas').setPointerCapture(event.pointerId)});
  $('canvas').addEventListener('pointermove',event=>{if(!diagramDrag)return;const rect=diagram.getBoundingClientRect();panX+=(event.clientX-diagramDrag.x)*1010/rect.width;panY+=(event.clientY-diagramDrag.y)*600/rect.height;diagramDrag={x:event.clientX,y:event.clientY};render2D()});
  for(const type of ['pointerup','pointercancel'])$('canvas').addEventListener(type,()=>{diagramDrag=null});
  $('fullscreen').addEventListener('click',async()=>{if(document.fullscreenElement)await document.exitFullscreen();else await $('app').requestFullscreen()});
  addEventListener('keydown',event=>{if(document.activeElement===$('modelStage'))return;if(['INPUT','BUTTON'].includes(document.activeElement?.tagName))return;if(event.key==='ArrowRight'){event.preventDefault();stopPlay();setStep(step+1)}else if(event.key==='ArrowLeft'){event.preventDefault();stopPlay();setStep(step-1)}else if(event.code==='Space'){event.preventDefault();$('play').click()}});

  // Closed solid is divided at y=cutY only when the opening animation runs.
  // Front and back halves use the same x/z profile and wall slots as the projections.
  const X=modelX,Y=modelY;
  const faces=[];
  const partOf=yi=>yi<3?'back':'front';
  function topHeight(xi,yi,x){
    if(yi===0||yi===5)return G.height;
    if(yi===1||yi===4)return X[xi]===G.slot[0]&&X[xi+1]===G.slot[1]?G.crest:G.height;
    return profile(x);
  }
  function addFace(points,part,kind){
    const a=points[0],b=points[1],c=points[2];
    const u=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],v=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];
    const cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
    const size=Math.hypot(...cross);if(size<.0001)return;
    faces.push({points,part,kind,normal:cross.map(value=>value/size)});
  }
  for(let yi=0;yi<6;yi++)for(let xi=0;xi<7;xi++){
    const [x0,x1]=[X[xi],X[xi+1]],[y0,y1]=[Y[yi],Y[yi+1]];
    addFace([[x0,y0,topHeight(xi,yi,x0)],[x1,y0,topHeight(xi,yi,x1)],[x1,y1,topHeight(xi,yi,x1)],[x0,y1,topHeight(xi,yi,x0)]],partOf(yi),'top');
  }
  for(let yi=0;yi<6;yi++)for(let k=0;k<X.length;k++){
    const x=X[k],left=k===0?0:topHeight(k-1,yi,x),right=k===X.length-1?0:topHeight(k,yi,x);
    if(Math.abs(left-right)<.001)continue;
    const low=Math.min(left,right),high=Math.max(left,right);
    addFace([[x,Y[yi],low],[x,Y[yi+1],low],[x,Y[yi+1],high],[x,Y[yi],high]],partOf(yi),'sideX');
  }
  for(let j=0;j<Y.length;j++){
    if(j===3)continue;
    for(let xi=0;xi<7;xi++){
      const x0=X[xi],x1=X[xi+1],left0=j===0?0:topHeight(xi,j-1,x0),left1=j===0?0:topHeight(xi,j-1,x1);
      const right0=j===Y.length-1?0:topHeight(xi,j,x0),right1=j===Y.length-1?0:topHeight(xi,j,x1);
      if(Math.abs(left0-right0)+Math.abs(left1-right1)<.001)continue;
      addFace([[x0,Y[j],left0],[x1,Y[j],left1],[x1,Y[j],right1],[x0,Y[j],right0]],j<3?'back':'front','sideY');
    }
  }
  addFace([[0,0,0],[G.length,0,0],[G.length,G.cutY,0],[0,G.cutY,0]],'back','bottom');
  addFace([[0,G.cutY,0],[G.length,G.cutY,0],[G.length,G.depth,0],[0,G.depth,0]],'front','bottom');
  for(const part of ['back','front'])for(let xi=0;xi<7;xi++){
    const x0=X[xi],x1=X[xi+1];
    addFace([[x0,G.cutY,0],[x1,G.cutY,0],[x1,G.cutY,profile(x1)],[x0,G.cutY,profile(x0)]],part,'cut');
  }
  const canvas=$('modelCanvas'),stage=$('modelStage'),ctx=canvas.getContext('2d');
  const camera={yaw:-.82,pitch:.55,zoom:1,panX:0,panY:0,open:0,mode:'rotate'};
  let modelDrag=null,animationToken=0,animationTarget=null,planeVisible=false;
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  function project(point,part,width,height,scale){
    const separation=140*camera.open;
    const dx=point[0]-G.length/2,dy=point[1]+(part==='front'?separation:0)-(G.depth+separation)/2,dz=point[2]-G.height/2;
    const cy=Math.cos(camera.yaw),sy=Math.sin(camera.yaw),cp=Math.cos(camera.pitch),sp=Math.sin(camera.pitch);
    const rx=dx*cy-dy*sy,ry=dx*sy+dy*cy;
    return {x:width/2+camera.panX+rx*scale,y:height/2+camera.panY+(ry*sp-dz*cp)*scale,d:ry*cp+dz*sp};
  }
  const vertexKey=point=>point.map(value=>value.toFixed(3)).join(',');
  const dot=(a,b)=>a.reduce((sum,value,index)=>sum+value*b[index],0);
  function physicalEdges(surfaces,separateParts){
    const map=new Map();
    const vertices=[...new Map(surfaces.flatMap(face=>face.points.map(point=>[vertexKey(point),point]))).values()];
    for(const face of surfaces){
      const {points,part}=face;
      for(let i=0;i<points.length;i++){
        const start=points[i],end=points[(i+1)%points.length];
        const direction=end.map((value,index)=>value-start[index]);
        const lengthSquared=dot(direction,direction);
        if(!lengthSquared)continue;
        // Subdivide long boundaries at every collinear vertex to match adjacent short faces.
        const splits=[[0,start],[1,end]];
        for(const point of vertices){
          const delta=point.map((value,index)=>value-start[index]);
          const t=dot(delta,direction)/lengthSquared;
          if(t<=0||t>=1)continue;
          if(delta.every((value,index)=>Math.abs(value-t*direction[index])<1e-7))splits.push([t,point]);
        }
        splits.sort((a,b)=>a[0]-b[0]);
        for(let j=1;j<splits.length;j++){
          const a=splits[j-1][1],b=splits[j][1],keys=[vertexKey(a),vertexKey(b)].sort();
          const key=(separateParts?part+'|':'')+keys.join('|');
          if(!map.has(key))map.set(key,{a,b,part,adjacent:[]});
          map.get(key).adjacent.push(face);
        }
      }
    }
    return [...map.values()].filter(({adjacent})=>adjacent.some(face=>Math.abs(dot(adjacent[0].normal,face.normal))<1-1e-8));
  }
  const closedFaces=faces.filter(face=>face.kind!=='cut');
  const closedEdges=physicalEdges(closedFaces,false),openEdges=physicalEdges(faces,true);
  const cross2=(ax,ay,bx,by)=>ax*by-ay*bx;
  function projectSurfaces(surfaces,projectPoint){
    return surfaces.map(source=>{
      const projected=source.points.map(point=>projectPoint(point,source.part));
      const [a,b,c]=projected;
      const determinant=cross2(b.x-a.x,b.y-a.y,c.x-a.x,c.y-a.y);
      if(Math.abs(determinant)<1e-7)return {source,projected,orientation:0};
      return {source,projected,orientation:Math.sign(determinant),
        depthX:cross2(b.d-a.d,b.y-a.y,c.d-a.d,c.y-a.y)/determinant,
        depthY:cross2(b.x-a.x,b.d-a.d,c.x-a.x,c.d-a.d)/determinant};
    });
  }
  function occludedInterval(a,b,face){
    const {projected,orientation,depthX,depthY}=face;
    if(!orientation)return null;
    // Clip against the projected convex face and then against its depth plane.
    let from=0,to=1;
    for(let i=0;i<projected.length;i++){
      const p=projected[i],q=projected[(i+1)%projected.length];
      const dx=q.x-p.x,dy=q.y-p.y;
      const tolerance=1e-8*Math.hypot(dx,dy);
      const side=r=>{
        const value=orientation*cross2(dx,dy,r.x-p.x,r.y-p.y);
        return Math.abs(value)<=tolerance?0:value;
      };
      const atStart=side(a),atEnd=side(b);
      if(atStart<0&&atEnd<0)return null;
      if(atStart<0)from=Math.max(from,atStart/(atStart-atEnd));
      if(atEnd<0)to=Math.min(to,atStart/(atStart-atEnd));
      if(to<=from)return null;
    }
    const p=projected[0];
    const depthDifference=r=>p.d+depthX*(r.x-p.x)+depthY*(r.y-p.y)-r.d-1e-6;
    const atStart=depthDifference(a),atEnd=depthDifference(b);
    if(atStart<=0&&atEnd<=0)return null;
    if(atStart<=0)from=Math.max(from,atStart/(atStart-atEnd));
    if(atEnd<=0)to=Math.min(to,atStart/(atStart-atEnd));
    return to>from?[from,to]:null;
  }
  function visibleSegments(edge,projectedFaces,projectPoint){
    const a=projectPoint(edge.a,edge.part),b=projectPoint(edge.b,edge.part);
    if(Math.hypot(b.x-a.x,b.y-a.y)<1e-7)return [];
    const hidden=[];
    for(const face of projectedFaces){
      if(edge.adjacent.includes(face.source))continue;
      const interval=occludedInterval(a,b,face);
      if(interval)hidden.push(interval);
    }
    hidden.sort((left,right)=>left[0]-right[0]);
    const visible=[];
    const pointAt=t=>[a.x+t*(b.x-a.x),a.y+t*(b.y-a.y)];
    let from=0;
    for(const [start,end] of hidden){
      if(start-from>1e-7)visible.push([pointAt(from),pointAt(start)]);
      from=Math.max(from,end);
    }
    if(1-from>1e-7)visible.push([pointAt(from),pointAt(1)]);
    return visible;
  }
  function axonProject([x,y,z]){
    const diagonal=.48/Math.sqrt(3);
    return {x:630+.48*(x+y),y:548+diagonal*(y-x-2*z),d:-x+y+z};
  }
  const axonFaces=faces.filter(face=>face.part==='back');
  const axonSurfaces=projectSurfaces(axonFaces,axonProject);
  const axonCut=topPoints.concat([[L,0],[0,0]]).map(([x,z])=>axonProject([x,cutY,z]));
  const axonView=path('M'+axonCut.map(p=>`${n(p.x)} ${n(p.y)}`).join(' L')+' Z','axon-cut')+
    physicalEdges(axonFaces,false).flatMap(edge=>visibleSegments(edge,axonSurfaces,axonProject))
      .map(([a,b])=>segment(a,b,'given axon-edge')).join('')+txt(SX,340,'剖开后的轴测图','view-title');
  function faceColor(kind){return kind==='cut'?[240,233,220]:kind==='top'?[204,229,225]:kind==='bottom'?[142,185,179]:kind==='sideX'?[162,201,195]:[175,212,207]}
  const textureScale=3,texture=document.createElement('canvas');
  texture.width=L*textureScale;texture.height=G.crest*textureScale;
  const textureContext=texture.getContext('2d');
  textureContext.fillStyle=`rgb(${faceColor('cut').join(',')})`;
  textureContext.fillRect(0,0,texture.width,texture.height);
  textureContext.setTransform(textureScale,0,0,textureScale,0,texture.height);
  textureContext.strokeStyle=hatchInk;textureContext.lineWidth=.75;
  textureContext.stroke(new Path2D(hatchPath));
  textureContext.strokeStyle=aggregateInk;textureContext.lineWidth=.85;
  textureContext.stroke(new Path2D(trianglePath));
  textureContext.fillStyle=aggregateInk;
  for(const {x,z,r} of dots){
    textureContext.beginPath();textureContext.arc(x,-z,r,0,Math.PI*2);textureContext.fill();
  }
  const material=textureContext.getImageData(0,0,texture.width,texture.height).data;
  // A depth buffer keeps concave channel faces from painting through the nearer wall.
  function rasterFaces(projectedFaces,pixelWidth,pixelHeight,ratio){
    const pixels=ctx.createImageData(pixelWidth,pixelHeight),rgba=pixels.data;
    const depthBuffer=new Float32Array(pixelWidth*pixelHeight);depthBuffer.fill(-1e9);
    for(const face of projectedFaces){
      const color=faceColor(face.source.kind),p=face.projected.map(q=>({x:q.x*ratio,y:q.y*ratio,d:q.d}));
      for(let i=1;i<p.length-1;i++){
        const a=p[0],b=p[i],c=p[i+1];
        const denom=(b.y-c.y)*(a.x-c.x)+(c.x-b.x)*(a.y-c.y);
        if(Math.abs(denom)<.001)continue;
        const minX=clamp(Math.floor(Math.min(a.x,b.x,c.x)),0,pixelWidth-1),maxX=clamp(Math.ceil(Math.max(a.x,b.x,c.x)),0,pixelWidth-1);
        const minY=clamp(Math.floor(Math.min(a.y,b.y,c.y)),0,pixelHeight-1),maxY=clamp(Math.ceil(Math.max(a.y,b.y,c.y)),0,pixelHeight-1);
        for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
          const px=x+.5,py=y+.5;
          const wa=((b.y-c.y)*(px-c.x)+(c.x-b.x)*(py-c.y))/denom;
          if(wa<0||wa>1)continue;
          const wb=((c.y-a.y)*(px-c.x)+(a.x-c.x)*(py-c.y))/denom;
          if(wb<0||wa+wb>1)continue;
          const wc=1-wa-wb,index=y*pixelWidth+x,z=wa*a.d+wb*b.d+wc*c.d;
          if(z<=depthBuffer[index])continue;
          depthBuffer[index]=z;
          const offset=index*4;
          if(face.source.kind==='cut'){
            const v=face.source.points,x3=wa*v[0][0]+wb*v[i][0]+wc*v[i+1][0],z3=wa*v[0][2]+wb*v[i][2]+wc*v[i+1][2];
            const tx=clamp(Math.floor(x3*textureScale),0,texture.width-1);
            const ty=clamp(Math.floor((G.crest-z3)*textureScale),0,texture.height-1);
            const sample=(ty*texture.width+tx)*4;
            rgba[offset]=material[sample];rgba[offset+1]=material[sample+1];rgba[offset+2]=material[sample+2];
          }else{rgba[offset]=color[0];rgba[offset+1]=color[1];rgba[offset+2]=color[2]}
          rgba[offset+3]=255;
        }
      }
    }
    ctx.setTransform(1,0,0,1,0,0);ctx.putImageData(pixels,0,0);
  }
  function drawModel(){
    const width=stage.clientWidth,height=stage.clientHeight;
    if(width<20||height<20)return;
    const ratio=Math.min(1.5,window.devicePixelRatio||1);
    if(canvas.width!==Math.round(width*ratio)||canvas.height!==Math.round(height*ratio)){
      canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
    }
    ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,width,height);
    const scale=Math.min(width/(560+camera.open*100),height/(420+camera.open*45))*camera.zoom;
    const opened=camera.open>0;
    const projectPoint=(point,part)=>project(point,part,width,height,scale);
    const projectedFaces=projectSurfaces(opened?faces:closedFaces,projectPoint);
    rasterFaces(projectedFaces,canvas.width,canvas.height,ratio);
    ctx.setTransform(ratio,0,0,ratio,0,0);
    ctx.lineCap='butt';
    if(planeVisible){
      const plane=[[0,cutY,0],[L,cutY,0],[L,cutY,H],[0,cutY,H]];
      ctx.beginPath();
      for(const [index,a] of plane.entries()){
        const edge={a,b:plane[(index+1)%plane.length],part:'back',adjacent:[]};
        for(const [start,end] of visibleSegments(edge,projectedFaces,projectPoint)){
          ctx.moveTo(...start);ctx.lineTo(...end);
        }
      }
      ctx.setLineDash([5,4]);ctx.strokeStyle='rgba(22,134,128,.72)';ctx.lineWidth=1;ctx.stroke();ctx.setLineDash([]);
    }
    ctx.strokeStyle='#416b69';ctx.lineWidth=1.3;
    ctx.beginPath();
    for(const edge of opened?openEdges:closedEdges){
      for(const [start,end] of visibleSegments(edge,projectedFaces,projectPoint)){
        ctx.moveTo(...start);ctx.lineTo(...end);
      }
    }
    ctx.stroke();
    if(camera.open>.04){ctx.fillStyle='#0b6f6b';ctx.font='bold 12px Microsoft YaHei';ctx.fillText('1—1 剖切面',10,20)}
  }
  function openControls(){
    $('openRange').value=String(Math.round(camera.open*100));
    $('openValue').textContent=camera.open<.01?'合拢':camera.open>.99?'剖开':`${Math.round(camera.open*100)}%`;
    $('openModel').textContent=animationTarget!==null?'暂停动画':camera.open>.5?'播放合拢动画':'播放剖开动画';
  }
  function setOpen(value){camera.open=clamp(value,0,1);openControls();drawModel()}
  function animateOpen(target){
    const token=++animationToken,start=camera.open,started=performance.now();
    animationTarget=target;
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,duration=reduced?0:850;
    const intro=target===1&&start<.01&&!reduced ? .18 : 0;
    function frame(now){
      if(token!==animationToken)return;
      const t=duration?clamp((now-started)/duration,0,1):1;
      planeVisible=t<intro;
      const move=intro?clamp((t-intro)/(1-intro),0,1):t;
      setOpen(start+(target-start)*(move*move*(3-2*move)));
      if(t<1)requestAnimationFrame(frame);
      else{animationTarget=null;planeVisible=false;openControls();drawModel()}
    }
    requestAnimationFrame(frame);
  }
  $('openModel').addEventListener('click',()=>{
    if(animationTarget!==null){animationToken++;animationTarget=null;planeVisible=false;openControls();drawModel();return}
    animateOpen(camera.open>.5?0:1);
  });
  $('openRange').addEventListener('input',event=>{animationToken++;animationTarget=null;planeVisible=false;setOpen(Number(event.target.value)/100)});
  function mode(value){camera.mode=value;$('rotateMode').setAttribute('aria-pressed',String(value==='rotate'));$('panMode').setAttribute('aria-pressed',String(value==='pan'))}
  $('rotateMode').addEventListener('click',()=>mode('rotate'));
  $('panMode').addEventListener('click',()=>mode('pan'));
  $('modelReset').addEventListener('click',()=>{camera.yaw=-.82;camera.pitch=.55;camera.zoom=1;camera.panX=0;camera.panY=0;drawModel()});
  stage.addEventListener('pointerdown',event=>{modelDrag={x:event.clientX,y:event.clientY,mode:event.shiftKey?'pan':camera.mode};stage.setPointerCapture(event.pointerId)});
  stage.addEventListener('pointermove',event=>{
    if(!modelDrag)return;
    const dx=event.clientX-modelDrag.x,dy=event.clientY-modelDrag.y;
    if(modelDrag.mode==='pan'){camera.panX+=dx;camera.panY+=dy}else{camera.yaw+=dx*.008;camera.pitch+=dy*.008}
    modelDrag.x=event.clientX;modelDrag.y=event.clientY;drawModel();
  });
  for(const type of ['pointerup','pointercancel'])stage.addEventListener(type,()=>{modelDrag=null});
  stage.addEventListener('wheel',event=>{event.preventDefault();camera.zoom=clamp(camera.zoom*(event.deltaY<0?1.11:1/1.11),.5,2.8);drawModel()},{passive:false});
  stage.addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;
    event.preventDefault();const sx=event.key==='ArrowRight'?1:event.key==='ArrowLeft'?-1:0,sy=event.key==='ArrowDown'?1:event.key==='ArrowUp'?-1:0;
    if(event.shiftKey){camera.panX+=sx*16;camera.panY+=sy*16}else{camera.yaw+=sx*.12;camera.pitch+=sy*.12}drawModel();
  });
  if('ResizeObserver'in window)new ResizeObserver(drawModel).observe(stage);else addEventListener('resize',drawModel);
  setStep(0);openControls();drawModel();
})();
