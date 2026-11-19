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
    {title:'读题',action:'观察正面投影与水平投影。闸室由底板、两侧立墙、中央变坡底面和相向的门槽组成；1—1 剖切线通过通道中部，视向指向后墙。题图没有毫米尺寸，以下长度按图示比例从对应投影量取。'},
    {title:'确定剖切位置',action:'在水平投影中确认 1—1 剖切线贯穿闸室中部，并按箭头方向观察。切面穿过底板和中央凸起；近侧立墙移去，后侧立墙保留为剖切面后方可见的形体。'},
    {title:'量取总长与总高',action:'从正面投影量取两端之间的总长和底边至墙顶的总高，在剖面图位置建立相同长、高的外轮廓。两图的左右端点和高程基准严格对应。'},
    {title:'作底板和变坡',action:'由正面投影量取低台面与凸台顶面的高度；由水平投影依次量取左坡起点、左坡终点、右坡起点、右坡终点的位置。先画两端低台面与中央顶面，再连接两条斜坡，封闭被剖到的混凝土轮廓。'},
    {title:'作后墙门槽',action:'在水平投影中量取门槽两侧至左端的距离，投射到剖面图的后墙。两条竖线从墙顶向下到中央凸台顶面；它们是剖切面后方可见的门槽边，不作为被剖材料加粗。'},
    {title:'填充混凝土图例',action:'仅在剖切面真正切到的底板及中央凸台范围内绘制钢筋混凝土材料图例。后墙、门槽和空腔都不填图例。'},
    {title:'加粗结果并核对',action:'加粗被剖材料的边界，后墙可见轮廓保持较细，标注“1—1 剖面图”。核对总长、墙高、两级高程、四处变坡位置及门槽宽度与已知投影一一对应。'}
  ];
  const $=id=>document.getElementById(id);
  const scene=$('scene'),diagram=$('diagram');
  let step=0,playing=false,playTimer=0,zoom=1,panX=0,panY=0,diagramDrag=null;
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
  const sectionProfile=polyline(topPoints,SX,fy);
  const sectionFill=sectionProfile+` L${SX+G.length} ${FY} L${SX} ${FY} Z`;
  const cutLabel=()=>txt(SX+110,316,'1—1 剖面图','section-name');
  function knownViews(){
    let out=`<defs><pattern id="concrete" patternUnits="userSpaceOnUse" width="26" height="26"><path d="M-3 26L26 -3 M20 32L32 20" stroke="#82969a" stroke-width="1.2" fill="none"/><path d="M5 18l5 -2 -2 5z M18 7l4 2 -3 2z" fill="none" stroke="#8fa0a2" stroke-width=".9"/></pattern></defs>`;
    out+=txt(FX,70,'正面投影','view-title')+txt(FX,320,'水平投影','view-title');
    out+=`<rect class="given" x="${FX}" y="${FY-G.height}" width="${G.length}" height="${G.height}"/>`;
    out+=path(elevationProfile,'hidden-line');
    for(const x of G.slot)out+=ln(px(x),fy(G.height),px(x),fy(G.crest),'hidden-line');
    out+=`<rect class="given" x="${FX}" y="${PY}" width="${G.length}" height="${G.depth}"/>`;
    const [,notchBack,innerBack,innerFront,notchFront]=G.walls,[slotLeft,slotRight]=G.slot;
    out+=path(`M${px(0)} ${py(innerBack)} L${px(slotLeft)} ${py(innerBack)} L${px(slotLeft)} ${py(notchBack)} L${px(slotRight)} ${py(notchBack)} L${px(slotRight)} ${py(innerBack)} L${px(G.length)} ${py(innerBack)}`,'given');
    out+=path(`M${px(0)} ${py(innerFront)} L${px(slotLeft)} ${py(innerFront)} L${px(slotLeft)} ${py(notchFront)} L${px(slotRight)} ${py(notchFront)} L${px(slotRight)} ${py(innerFront)} L${px(G.length)} ${py(innerFront)}`,'given');
    for(const x of G.breaks)out+=ln(px(x),py(innerBack),px(x),py(innerFront),'given');
    out+=ln(px(-42),py(G.cutY),px(G.length+42),py(G.cutY),'axis-line');
    for(const x of [-37,G.length+37]){
      out+=path(`M${px(x)-8} ${py(G.cutY)-17} L${px(x)-8} ${py(G.cutY)} L${px(x)+8} ${py(G.cutY)}`,'given');
      out+=txt(px(x)-3,py(G.cutY)-22,'1');
    }
    return out;
  }
  function measurementMarks(){
    let out='';
    if(step===1){
      out+=ln(px(0),py(G.cutY),px(G.length),py(G.cutY),'fresh','stroke-dasharray="12 5 2 5"');
      out+=txt(FX+115,py(G.cutY)-12,'1—1 剖切位置','measure-label');
    }
    if(step===2){
      out+=ln(FX,82,FX+G.length,82,'fresh');
      out+=ln(FX,77,FX,88,'fresh')+ln(FX+G.length,77,FX+G.length,88,'fresh');
      out+=ln(SX,82,SX+G.length,82,'fresh');
      out+=ln(SX,77,SX,88,'fresh')+ln(SX+G.length,77,SX+G.length,88,'fresh');
      out+=txt(FX+157,77,'总长','measure-label');
      out+=ln(FX+G.length+17,FY-G.height,FX+G.length+17,FY,'fresh');
      out+=ln(FX+G.length+12,FY-G.height,FX+G.length+22,FY-G.height,'fresh')+ln(FX+G.length+12,FY,FX+G.length+22,FY,'fresh');
      out+=ln(SX+G.length+17,FY-G.height,SX+G.length+17,FY,'fresh');
      out+=txt(SX+G.length+22,fy(90),'总高','measure-label');
    }
    if(step===3){
      out+=path(elevationProfile,'fresh','stroke-dasharray="7 5"');
      for(const x of G.breaks){out+=ln(px(x),py(G.walls[2]-6),px(x),py(G.walls[3]+4),'fresh','stroke-dasharray="3 5"');out+=ln(sx(x),fy(profile(x))-8,sx(x),fy(profile(x))+8,'fresh')}
      out+=ln(FX+G.length+20,fy(G.floor),SX-15,fy(G.floor),'guide');
      out+=ln(FX+G.length+20,fy(G.crest),SX-15,fy(G.crest),'guide');
      out+=txt(SX-78,fy(G.crest)-7,'顶面高程','measure-label')+txt(SX-78,fy(G.floor)-7,'底板高程','measure-label');
    }
    if(step===4){
      for(const x of G.slot){out+=ln(px(x),py(G.walls[1]),px(x),py(G.walls[2]),'fresh');out+=ln(sx(x),fy(G.height),sx(x),fy(G.crest),'fresh')}
      out+=txt(SX+120,fy(G.crest)-9,'门槽','measure-label');
    }
    return out;
  }
  function sectionDrawing(){
    if(step<2)return step>=1?txt(SX,70,'待作 1—1 剖面图','view-title'):'';
    const final=step===6,behind=final?'result-behind':'process',cut=final?'result-cut':'process';
    let out='';
    out+=ln(SX,fy(G.height),SX+G.length,fy(G.height),behind);
    out+=ln(SX,fy(G.height),SX,FY,behind)+ln(SX+G.length,fy(G.height),SX+G.length,FY,behind);
    if(step>=5)out+=path(sectionFill,'hatch');
    if(step>=3){
      out+=path(sectionProfile,cut);
      out+=ln(SX,FY,SX+G.length,FY,cut);
      if(final){out+=ln(SX,fy(G.floor),SX,FY,cut)+ln(SX+G.length,fy(G.floor),SX+G.length,FY,cut)}
    }
    if(step>=4)for(const x of G.slot)out+=ln(sx(x),fy(G.height),sx(x),fy(G.crest),behind);
    if(step>=5)out+=cutLabel();
    return out;
  }
  function render2D(){
    scene.innerHTML=knownViews()+sectionDrawing()+measurementMarks();
    scene.setAttribute('transform',`translate(${505*(1-zoom)+panX} ${300*(1-zoom)+panY}) scale(${zoom})`);
    $('count').textContent=step===0?'准备 · 读题':`步骤 ${String(step).padStart(2,'0')} / 06`;
    $('stepTitle').textContent=steps[step].title;
    $('action').textContent=steps[step].action;
    $('prev').disabled=step===0;$('next').disabled=step===steps.length-1;
    $('progress').value=String(step);$('progressText').textContent=`${step} / ${steps.length-1}`;
    $('zoomValue').textContent=`${Math.round(zoom*100)}%`;
    for(const button of $('steps').children)button.setAttribute('aria-current',Number(button.dataset.step)===step?'step':'false');
  }
  function setStep(value){step=Math.max(0,Math.min(steps.length-1,Number(value)));render2D()}
  function stopPlay(){playing=false;clearTimeout(playTimer);$('play').textContent='播放'}
  function playNext(){if(!playing)return;if(step>=steps.length-1){stopPlay();return}setStep(step+1);playTimer=setTimeout(playNext,step===5?4300:3900)}
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
  render2D();

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
  function edgeMap(projectedFaces){
    const map=new Map();
    for(const face of projectedFaces){
      const {points,part,normal}=face.source;
      for(let i=0;i<points.length;i++){
        const a=points[i],b=points[(i+1)%points.length],aKey=vertexKey(a),bKey=vertexKey(b);
        const key=part+'|'+(aKey<bKey?aKey+'|'+bKey:bKey+'|'+aKey);
        if(!map.has(key))map.set(key,{a,b,part,normals:[]});
        map.get(key).normals.push(normal);
      }
    }
    return [...map.values()].filter(edge=>edge.normals.length<2||edge.normals.some(normal=>{
      const first=edge.normals[0],dot=Math.abs(first[0]*normal[0]+first[1]*normal[1]+first[2]*normal[2]);
      return dot<.995;
    }));
  }
  function faceColor(kind){return kind==='cut'?[240,233,220]:kind==='top'?[204,229,225]:kind==='bottom'?[142,185,179]:kind==='sideX'?[162,201,195]:[175,212,207]}
  function polygon(projected){ctx.beginPath();ctx.moveTo(projected[0].x,projected[0].y);for(let i=1;i<projected.length;i++)ctx.lineTo(projected[i].x,projected[i].y);ctx.closePath()}
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
            const stripe=((z3-x3)%21+21)%21;
            if(stripe<1.8){rgba[offset]=143;rgba[offset+1]=132;rgba[offset+2]=113}
            else{rgba[offset]=color[0];rgba[offset+1]=color[1];rgba[offset+2]=color[2]}
          }else{rgba[offset]=color[0];rgba[offset+1]=color[1];rgba[offset+2]=color[2]}
          rgba[offset+3]=255;
        }
      }
    }
    ctx.setTransform(1,0,0,1,0,0);ctx.putImageData(pixels,0,0);
    return depthBuffer;
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
    const projectedFaces=faces.filter(face=>face.kind!=='cut'||camera.open>.005).map(source=>{
      const projected=source.points.map(point=>project(point,source.part,width,height,scale));
      return {source,projected,depth:projected.reduce((sum,p)=>sum+p.d,0)/projected.length};
    }).sort((a,b)=>a.depth-b.depth);
    const depthBuffer=rasterFaces(projectedFaces,canvas.width,canvas.height,ratio);
    ctx.setTransform(ratio,0,0,ratio,0,0);
    if(planeVisible||camera.open>.015){
      const plane=[[0,G.cutY,0],[G.length,G.cutY,0],[G.length,G.cutY,G.height],[0,G.cutY,G.height]].map(point=>project(point,'back',width,height,scale));
      polygon(plane);ctx.setLineDash([5,4]);ctx.strokeStyle='rgba(22,134,128,.55)';ctx.lineWidth=1;ctx.stroke();ctx.setLineDash([]);
    }
    ctx.strokeStyle='#416b69';ctx.lineWidth=1.3;ctx.lineCap='round';ctx.lineJoin='round';
    for(const edge of edgeMap(projectedFaces)){
      if(camera.open<.005&&Math.abs(edge.a[1]-G.cutY)<.001&&Math.abs(edge.b[1]-G.cutY)<.001)continue;
      const a=project(edge.a,edge.part,width,height,scale),b=project(edge.b,edge.part,width,height,scale);
      const segments=Math.max(1,Math.ceil(Math.hypot(a.x-b.x,a.y-b.y)/7));
      for(let i=0;i<segments;i++){
        const t=(i+.5)/segments,mid={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,d:a.d+(b.d-a.d)*t};
        const pixelX=Math.floor(mid.x*ratio),pixelY=Math.floor(mid.y*ratio);
        let nearestDepth=Infinity;
        for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++){
          const x=pixelX+ox,y=pixelY+oy;
          if(x>=0&&x<canvas.width&&y>=0&&y<canvas.height)nearestDepth=Math.min(nearestDepth,depthBuffer[y*canvas.width+x]);
        }
        if(nearestDepth>mid.d+2.5)continue;
        const t0=i/segments,t1=(i+1)/segments;
        ctx.beginPath();ctx.moveTo(a.x+(b.x-a.x)*t0,a.y+(b.y-a.y)*t0);ctx.lineTo(a.x+(b.x-a.x)*t1,a.y+(b.y-a.y)*t1);ctx.stroke();
      }
    }
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
  openControls();drawModel();
})();
