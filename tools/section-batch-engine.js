(()=>{
  'use strict';
  const G=__SECTION_GEOMETRY__;
  const $=id=>document.getElementById(id),diagram=$('diagram'),scene=$('scene');
  const media=matchMedia('(max-width: 750px)'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let layout,mode=0;
  let step=0,phase=0,playing=false,stepTimer=0,playTimer=0,zoom=1,panX=0,panY=0,diagramDrag=null;
  const n=v=>Math.round(v*100)/100;
  const xy=([x,y])=>`${n(x)} ${n(y)}`;
  const line=(a,b,cls)=>`<line class="${cls}" x1="${n(a[0])}" y1="${n(a[1])}" x2="${n(b[0])}" y2="${n(b[1])}"/>`;
  const path=(d,cls)=>`<path class="${cls}" d="${d}"/>`;
  const trace=(pts,close=false)=>'M'+pts.map(xy).join(' L')+(close?' Z':'');
  const text=([x,y],label,cls='',anchor='start')=>`<text class="${cls}" x="${n(x)}" y="${n(y)}" text-anchor="${anchor}">${label}</text>`;
  const rect=(x0,y0,x1,y1)=>[[x0,y0],[x1,y0],[x1,y1],[x0,y1]];
  const polyEdges=(pts,closed=false)=>pts.slice(closed?0:1).map((b,i)=>[pts[(i+(closed?pts.length-1:0))%pts.length],b]);
  function viewPoint(view,[u,v]){
    const [x,y]=layout.views[view];
    return [x+u,y+(view==='plan'?v:-v)];
  }
  const viewLine=(view,a,b,cls)=>line(viewPoint(view,a),viewPoint(view,b),cls);
  const viewPath=(view,pts,cls,close=false)=>path(trace(pts.map(point=>viewPoint(view,point)),close),cls);
  const pointsToEdges=(points,closed=true)=>polyEdges(points,closed).map(([a,b])=>({a,b}));
  const segment=(a,b)=>({a,b});
  const horizontal=(z,a,b)=>segment([Math.min(a,b),z],[Math.max(a,b),z]);
  const vertical=(x,from,to)=>segment([x,from],[x,to]);
  const arc=(a,b,r,sweep=1)=>({a,b,r,sweep});
  const compassArc=(edge,center)=>({...edge,center});
  const compassCircle=(center,r)=>({center,r});
  const mark=(view,a,b,side=1)=>({view,a,b,side});
  const dimension=(source,target,space)=>({source,target,space});
  const operation=(section,edge,...marks)=>({section,edge,marks});
  const located=(section,points,...marks)=>({section,points,marks});
  function ring(view,p,r,cls='given hole-rim'){
    const [x,y]=viewPoint(view,p);
    return `<circle class="${cls}" cx="${n(x)}" cy="${n(y)}" r="${n(r)}"/>`;
  }
  function glyph(view,points,label,position){
    return viewPath(view,points,'given cut-symbol')+text(viewPoint(view,position),label);
  }
  function commands(view,edge){
    const end=xy(viewPoint(view,edge.b));
    return edge.r?`A${n(edge.r)} ${n(edge.r)} 0 0 ${edge.sweep} ${end}`:'L'+end;
  }
  const outlinePath=(view,loop)=>'M'+xy(viewPoint(view,loop[0].a))+
    loop.map(edge=>commands(view,edge)).join(' ')+'Z';
  function showEdge(view,edge,cls,active=false){
    if(edge.center&&active) {
      const center=viewPoint(view,edge.center);
      const angle=p=>Math.atan2(p[1]-center[1],p[0]-center[0]);
      const fullTurn=2*Math.PI;
      const start=edge.a?angle(viewPoint(view,edge.a)):0;
      const end=edge.b?angle(viewPoint(view,edge.b)):fullTurn;
      const positive=(end-start+fullTurn)%fullTurn;
      const sweep=edge.a?(edge.sweep?positive:positive-fullTurn):fullTurn;
      return tracedCurve(center,edge.r,start,sweep,cls);
    }
    if(!edge.a)return ring(view,edge.center,edge.r,cls+' hole-rim');
    const a=viewPoint(view,edge.a),b=viewPoint(view,edge.b);
    if(edge.r)return path('M'+xy(a)+commands(view,edge),cls);
    return (active?tracedLine:line)(a,b,cls);
  }
  const planeOutline=points=>polyEdges(points,true).map(([a,b])=>({a,b,part:0,adjacent:[]}));

  /* SECTION_BATCH_MESH */
  /* SECTION_BATCH_LESSON */

  const lesson=createLesson(G),steps=lesson.steps;
  const closedMesh=lesson.mesh(null),openMeshes=lesson.cuts.map((_,index)=>lesson.mesh(index));
  function brace(a,b,side){
    const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);
    const at=(t,offset)=>xy([a[0]+t*dx-side*offset*dy/length,a[1]+t*dy+side*offset*dx/length]);
    const tip=Math.min(.22,12/length);
    return path(`M${at(0,4)} C${at(0,10)} ${at(tip/2,10)} ${at(tip,10)} L${at(.5-tip,10)} `+
      `Q${at(.5,10)} ${at(.5,16)} Q${at(.5,10)} ${at(.5+tip,10)} L${at(1-tip,10)} `+
      `C${at(1-tip/2,10)} ${at(1,10)} ${at(1,4)}`,'measure-brace');
  }
  function measurement({view,a,b,side}){
    const p=viewPoint(view,a),q=viewPoint(view,b);
    return line(p,q,'measure-edge')+brace(p,q,side);
  }
  function projectSurfaces(faces,project){
    return faces.map(source=>{
      const points=source.points.map(point=>project(point,source.part));
      const [a,b]=points;
      const c=points.slice(2).find(p=>Math.abs(cross(b[0]-a[0],b[1]-a[1],p[0]-a[0],p[1]-a[1]))>1e-7)??points[2];
      const dx=b[0]-a[0],dy=b[1]-a[1],ex=c[0]-a[0],ey=c[1]-a[1];
      const denominator=cross(dx,dy,ex,ey);
      const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
      const bounds=[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)];
      if(Math.abs(denominator)<1e-7)return {source,points,bounds,orientation:0};
      const dz=b[2]-a[2],ez=c[2]-a[2];
      return {source,points,bounds,orientation:Math.sign(denominator),
        depthX:cross(dz,dy,ez,ey)/denominator,depthY:cross(dx,dz,ex,ez)/denominator};
    });
  }
  function hiddenInterval(a,b,face){
    const {orientation,points,depthX,depthY,bounds}=face;
    if(!orientation)return null;
    if(Math.max(a[0],b[0])<bounds[0]-1e-8||Math.min(a[0],b[0])>bounds[2]+1e-8||
       Math.max(a[1],b[1])<bounds[1]-1e-8||Math.min(a[1],b[1])>bounds[3]+1e-8)return null;
    let from=0,to=1;
    // Clip the screen segment to the face, then keep the interval in front of the edge.
    for(const [index,p] of points.entries()){
      const q=points[(index+1)%points.length];
      const dx=q[0]-p[0],dy=q[1]-p[1],tolerance=1e-8*Math.hypot(dx,dy);
      const side=r=>{
        const value=orientation*cross(dx,dy,r[0]-p[0],r[1]-p[1]);
        return Math.abs(value)<=tolerance?0:value;
      };
      const start=side(a),end=side(b);
      if(start<0&&end<0)return null;
      if(start<0)from=Math.max(from,start/(start-end));
      if(end<0)to=Math.min(to,start/(start-end));
      if(to<=from)return null;
    }
    const [x,y,z]=points[0];
    const ahead=p=>z+depthX*(p[0]-x)+depthY*(p[1]-y)-p[2]-1e-6;
    const start=ahead(a),end=ahead(b);
    if(start<=0&&end<=0)return null;
    if(start<=0)from=Math.max(from,start/(start-end));
    if(end<=0)to=Math.min(to,start/(start-end));
    return to>from?[from,to]:null;
  }
  function visibleSegments(edge,faces,project){
    const a=project(edge.a,edge.part),b=project(edge.b,edge.part);
    const dx=b[0]-a[0],dy=b[1]-a[1];
    if(Math.hypot(dx,dy)<1e-7)return [];
    const hidden=[];
    for(const face of faces){
      if(edge.adjacent.includes(face.source))continue;
      const interval=hiddenInterval(a,b,face);
      if(interval)hidden.push(interval);
    }
    hidden.sort(([start],[other])=>start-other);
    const visible=[],at=t=>[a[0]+t*dx,a[1]+t*dy];
    let from=0;
    for(const [start,end] of hidden){
      if(start-from>1e-7)visible.push([at(from),at(start)]);
      from=Math.max(from,end);
    }
    if(1-from>1e-7)visible.push([at(from),at(1)]);
    return visible;
  }
  /* SECTION_AXON_VIEW */
  /* SECTION_LINE_TRACE */


  let axons=[];
  function material(section){
    const {id,loops}=section;
    const cut=loops.map(loop=>outlinePath(id,loop)).join(' ');
    const [w,h]=layout.size;
    return `<defs><clipPath id="material-${id}">${path(cut,'clip-shape')}</clipPath>
      <pattern id="hatch-${id}" width="13" height="13" patternUnits="userSpaceOnUse">
      <path class="material-line" d="M-1 1 1 -1 M0 13 13 0 M12 14 14 12"/></pattern></defs>
      <g clip-path="url(#material-${id})"><rect class="hatch-area" width="${w}" height="${h}" fill="url(#hatch-${id})"/></g>`;
  }
  function caption(section){
    const [x,y]=viewPoint(section.id,section.caption);
    return '<g class="section-caption">'+text([x,y],section.label,'section-name','middle')+
      line([x,y+6],[x,y+6],'section-underline')+'</g>';
  }
  function drawResults(){
    let out='',points='';
    const final=step===steps.length-1;
    for(const section of lesson.sections){
      if(step<section.drawAt)continue;
      const {id,loops,behind,axes}=section;
      if(step>=steps.length-2)out+=material(section);
      if(final){
        for(const loop of loops)out+=path(outlinePath(id,loop),'result-cut');
        for(const edge of behind)out+=showEdge(id,edge,'result-behind');
      }
      for(const edge of axes)out+=showEdge(id,edge,'axis-line');
      out+=caption(section);
    }
    if(!final)for(let s=2;s<=step;s++){
      if(steps[s].rotation)continue;
      for(const [index,item] of (steps[s].operations??[]).entries()){
        const progress=s===step?phase-3*index:3;
        if(progress<1)break;
        if(s===step)for(const point of item.points??[]){
          points+=ring(point.view,point.p,3,'transfer-point');
          if(point.space)points+=axonPoint(axons[item.section.mode],point.space);
        }
        if(item.edge&&progress>=2&&(!item.construction||s===step)){
          const active=progress===2;
          out+=showEdge(item.section.id,item.edge,active?'process drawing-edge':item.construction?'guide':'process',active);
        }
      }
    }
    return out+points;
  }
  function drawMeasurements(){
    const item=steps[step].operations?.[Math.floor(phase/3)];
    return (item?.marks??[]).map(({source,target,space})=>measurement(source)+
      (phase%3===1?measurement(target):'')+
      (space?axonMeasurement(axons[item.section.mode],space,target.side):'')).join('');
  }
  let rotationFrame=0;
  function startRotation(){
    if(rotationFrame){cancelAnimationFrame(rotationFrame);rotationFrame=0}
    const group=scene.querySelector('[data-rotate-angle]');
    if(!group)return;
    const angle=Number(group.dataset.rotateAngle),{center}=group.dataset,started=performance.now();
    function update(now){
      const fraction=Math.min(1,(now-started)/950);
      group.setAttribute('transform',`rotate(${-angle*fraction} ${center})`);
      rotationFrame=fraction<1?requestAnimationFrame(update):0;
    }
    rotationFrame=requestAnimationFrame(update);
  }
  function render2D(){
    scene.innerHTML=lesson.given(step,phase)+axons.map(view=>view.drawing).join('')+drawResults()+drawMeasurements();
    const [width,height]=layout.size;
    scene.setAttribute('transform',`translate(${width*(1-zoom)/2+panX} ${height*(1-zoom)/2+panY}) scale(${zoom})`);
    startLineTrace();
    startRotation();
    for(const caption of scene.querySelectorAll('.section-caption')){
      const [label,underline]=caption.children;
      const x=+label.getAttribute('x'),half=label.getComputedTextLength()/2;
      underline.setAttribute('x1',n(x-half));underline.setAttribute('x2',n(x+half));
    }
    $('count').textContent=step===0?'准备 · 读题':`步骤 ${String(step).padStart(2,'0')} / ${String(steps.length-1).padStart(2,'0')}`;
    $('stepTitle').textContent=steps[step].title;
    $('action').textContent=steps[step].action;
    $('prev').disabled=step===0;$('next').disabled=step===steps.length-1;
    $('progress').value=String(step);$('progressText').textContent=`${step} / ${steps.length-1}`;
    $('zoomValue').textContent=`${Math.round(zoom*100)}%`;
    for(const button of $('steps').children)button.setAttribute('aria-current',Number(button.dataset.step)===step?'step':'false');
  }
  function setLayout(selected){
    layout=selected;
    diagram.setAttribute('viewBox',`0 0 ${layout.size.join(' ')}`);
    axons=openMeshes.map((mesh,index)=>createSectionAxon(mesh,layout.axons[index],lesson.cuts[index].label+' 剖开后的轴测图',
      silhouettes(mesh,[-1,1,1]).filter(edge=>edge.part===0)));
    render2D();
  }
  const measureDuration=425,transferDuration=375,drawDuration=500;
  function phaseDuration(index){
    const item=steps[step].operations[Math.floor(index/3)],part=index%3;
    if(steps[step].rotation)return [425,1050,425][part];
    if(part===2)return item.edge?drawDuration:0;
    return item.marks?.length||item.points?.length?(part===0?measureDuration:transferDuration):0;
  }
  function selectMode(value){
    if(mode!==value){mode=value;stopModel();camera.opening=0}
    [...$('cutModes').children].forEach((button,i)=>button.setAttribute('aria-pressed',String(i===mode)));
    updateModelControls();requestDraw();
  }
  function setStep(value){
    clearTimeout(stepTimer);
    step=Math.max(0,Math.min(steps.length-1,Number(value)));phase=0;
    if(steps[step].mode!==undefined)selectMode(steps[step].mode);
    const count=(steps[step].operations?.length??0)*3;
    const duration=Array.from({length:count},(_,i)=>phaseDuration(i)).reduce((sum,time)=>sum+time,0);
    if(reduced.matches)phase=count;
    function drawPhase(){
      render2D();
      if(phase<count)stepTimer=setTimeout(()=>{phase++;drawPhase()},phaseDuration(phase));
    }
    drawPhase();requestDraw();
    return reduced.matches?0:duration;
  }
  function stopPlay(){playing=false;clearTimeout(playTimer);$('play').textContent='播放'}
  function playNext(){
    if(!playing)return;
    if(step===steps.length-1){stopPlay();return}
    const duration=setStep(step+1);
    playTimer=setTimeout(playNext,Math.max(2500,duration+900));
  }
  $('prev').addEventListener('click',()=>{stopPlay();setStep(step-1)});
  $('next').addEventListener('click',()=>{stopPlay();setStep(step+1)});
  $('restart').addEventListener('click',()=>{stopPlay();setStep(0);resetModel()});
  $('complete').addEventListener('click',()=>{stopPlay();setStep(steps.length-1)});
  $('play').addEventListener('click',()=>{
    if(playing){stopPlay();return}
    if(step===steps.length-1)setStep(0);
    playing=true;$('play').textContent='暂停';playNext();
  });
  $('progress').addEventListener('input',event=>{stopPlay();setStep(event.target.value)});
  steps.forEach((item,index)=>{
    const button=document.createElement('button');
    button.type='button';button.dataset.step=String(index);
    button.textContent=index===0?'准备 · 读题':`${String(index).padStart(2,'0')} ${item.short??item.title}`;
    button.addEventListener('click',()=>{stopPlay();setStep(index)});
    $('steps').append(button);
  });
  const canvas2D=$('canvas');
  const changeZoom=value=>{zoom=clamp(value,.75,3);render2D()};
  $('zoomIn').addEventListener('click',()=>changeZoom(zoom*1.2));
  $('zoomOut').addEventListener('click',()=>changeZoom(zoom/1.2));
  $('fit').addEventListener('click',()=>{zoom=1;panX=0;panY=0;render2D()});
  canvas2D.addEventListener('wheel',event=>{event.preventDefault();changeZoom(zoom*(event.deltaY<0?1.12:1/1.12))},{passive:false});
  function diagramPoint(event){return new DOMPoint(event.clientX,event.clientY).matrixTransform(diagram.getScreenCTM().inverse())}
  canvas2D.addEventListener('pointerdown',event=>{
    if(zoom<=1)return;
    diagramDrag=diagramPoint(event);canvas2D.setPointerCapture(event.pointerId);
  });
  canvas2D.addEventListener('pointermove',event=>{
    if(!diagramDrag)return;
    const point=diagramPoint(event);
    panX+=point.x-diagramDrag.x;panY+=point.y-diagramDrag.y;diagramDrag=point;render2D();
  });
  for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas2D.addEventListener(type,()=>{diagramDrag=null});
  $('fullscreen').addEventListener('click',async()=>{
    if(document.fullscreenElement)await document.exitFullscreen();
    else await $('app').requestFullscreen();
  });
  addEventListener('keydown',event=>{
    if(event.defaultPrevented||document.activeElement===$('modelStage')||['INPUT','BUTTON'].includes(document.activeElement?.tagName))return;
    if(event.key==='ArrowRight'||event.key==='ArrowLeft'){
      event.preventDefault();stopPlay();setStep(step+(event.key==='ArrowRight'?1:-1));
    }else if(event.code==='Space'){event.preventDefault();$('play').click()}
  });

  const stage=$('modelStage'),canvas=$('modelCanvas'),ctx=canvas.getContext('2d');
  const defaultYaw=-.76,defaultPitch=.55;
  const camera={opening:0,yaw:defaultYaw,pitch:defaultPitch,zoom:1,x:0,y:0,mode:'rotate'};
  const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
  let modelDrag=null,pinchDistance=0,animation=0,animationTarget=null,showPlanes=false,drawFrame=0;
  const pointers=new Map();
  function modelProjection(width,height,mesh=camera.opening>0?openMeshes[mode]:closedMesh){
    const movement=lesson.cuts[mode].move.map(v=>v*camera.opening);
    const cy=Math.cos(camera.yaw),sy=Math.sin(camera.yaw),cp=Math.cos(camera.pitch),sp=Math.sin(camera.pitch);
    const rotated=([x,y,z],part)=>{
      const dx=x+part*movement[0],dy=y+part*movement[1],dz=z+part*movement[2];
      const rx=dx*cy-dy*sy,ry=dx*sy+dy*cy;
      return [rx,ry*sp-dz*cp,ry*cp+dz*sp];
    };
    const corners=mesh.vertices.map(({point,part})=>rotated(point,part));
    const xs=corners.map(p=>p[0]),ys=corners.map(p=>p[1]);
    const left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys);
    const scale=Math.min((width-30)/(right-left),(height-42)/(bottom-top))*camera.zoom;
    const centerX=(left+right)/2,centerY=(top+bottom)/2;
    return (point,part)=>{
      const [x,y,depth]=rotated(point,part);
      return [width/2+camera.x+(x-centerX)*scale,height/2+3+camera.y+(y-centerY)*scale,depth];
    };
  }


  function faceColor({cut,normal,curved}){
    if(cut)return [241,231,211];
    if(normal[2]>.999)return [211,231,225];
    if(normal[2]<-.999)return [147,180,177];
    const shade=curved?Math.round(16*normal[0]-14*normal[1]+8*normal[2]):0;
    return [164+shade,196+shade,192+shade];
  }
  function rasterFaces(faces,ratio){
    const {width,height}=canvas;
    const pixels=ctx.createImageData(width,height),rgba=pixels.data;
    const depths=new Float32Array(width*height);depths.fill(-Infinity);
    for(const face of faces){
      if(!face.orientation)continue;
      const {source}=face;
      const color=faceColor(source);
      const projected=face.points.map(([x,y,z])=>[x*ratio,y*ratio,z]);
      for(let i=1;i<projected.length-1;i++){
        const [a,b,c]=[projected[0],projected[i],projected[i+1]];
        const bx=b[0]-a[0],by=b[1]-a[1],cx=c[0]-a[0],cy=c[1]-a[1];
        const det=cross(bx,by,cx,cy);
        if(Math.abs(det)<1e-7)continue;
        const [p0,p1,p2]=[source.points[0],source.points[i],source.points[i+1]];
        const minX=clamp(Math.floor(Math.min(a[0],b[0],c[0])),0,width-1),maxX=clamp(Math.ceil(Math.max(a[0],b[0],c[0])),0,width-1);
        const minY=clamp(Math.floor(Math.min(a[1],b[1],c[1])),0,height-1),maxY=clamp(Math.ceil(Math.max(a[1],b[1],c[1])),0,height-1);
        for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
          const dx=x+.5-a[0],dy=y+.5-a[1];
          const u=cross(dx,dy,cx,cy)/det,v=cross(bx,by,dx,dy)/det;
          if(u<0||v<0||u+v>1)continue;
          const index=y*width+x,w=1-u-v,depth=w*a[2]+u*b[2]+v*c[2];
          if(depth<=depths[index])continue;
          depths[index]=depth;
          let coverage=0;
          if(source.cut){
            const pos=p0.map((value,i)=>w*value+u*p1[i]+v*p2[i]);
            const normal=source.normal;
            const coordinate=Math.abs(normal[2])>.99?pos[0]+pos[1]:Math.abs(normal[0])>.99?pos[1]+pos[2]:pos[0]+pos[2];
            const stripe=((coordinate%12)+12)%12;
            if(Math.min(stripe,12-stripe)<.65)coverage=.6;
          }
          const offset=index*4;
          for(let channel=0;channel<3;channel++)rgba[offset+channel]=color[channel]*(1-coverage)+102*coverage;
          rgba[offset+3]=255;
        }
      }
    }
    ctx.putImageData(pixels,0,0);
  }

  function strokeSegments(edges,faces,project){
    ctx.beginPath();
    for(const edge of edges)for(const [start,end] of visibleSegments(edge,faces,project)){
      ctx.moveTo(...start);ctx.lineTo(...end);
    }
    ctx.stroke();
  }
  function drawModel(){
    const width=stage.clientWidth,height=stage.clientHeight;
    if(width<20||height<20)return;
    const ratio=Math.min(1.5,devicePixelRatio||1);
    const px=Math.round(width*ratio),py=Math.round(height*ratio);
    if(canvas.width!==px||canvas.height!==py){canvas.width=px;canvas.height=py}
    const mesh=camera.opening>0?openMeshes[mode]:closedMesh;
    const project=modelProjection(width,height,mesh);
    const faces=projectSurfaces(mesh.faces,project);
    rasterFaces(faces,ratio);
    ctx.setTransform(ratio,0,0,ratio,0,0);
    ctx.lineCap='butt';ctx.lineWidth=1.26;ctx.strokeStyle='#3c6565';
    const direction=[Math.sin(camera.yaw)*Math.cos(camera.pitch),Math.cos(camera.yaw)*Math.cos(camera.pitch),Math.sin(camera.pitch)];
    strokeSegments(mesh.edges.concat(silhouettes(mesh,direction)),faces,project);
    if(showPlanes||(step===1&&camera.opening===0)){
      ctx.setLineDash([5,4]);ctx.strokeStyle='#198681';ctx.lineWidth=1.1;
      strokeSegments(lesson.cuts[mode].planes,faces,project);ctx.setLineDash([]);
    }
    if(camera.opening>.035){
      ctx.fillStyle='#0b6f6b';ctx.font='bold 12px Microsoft YaHei';
      const cut=lesson.cuts[mode];
      ctx.fillText(cut.modelLabel??cut.label+' 剖开',10,19);
    }
  }
  function requestDraw(){
    if(!drawFrame)drawFrame=requestAnimationFrame(()=>{drawFrame=0;drawModel()});
  }
  function updateModelControls(){
    $('openRange').value=String(Math.round(camera.opening*100));
    $('openValue').textContent=camera.opening===0?'合拢':camera.opening===1?'剖开':`${Math.round(camera.opening*100)}%`;
    $('openModel').textContent=animationTarget!==null?'暂停动画':camera.opening>.5?'播放合拢动画':'播放剖开动画';
  }
  function stopModel(){animation++;animationTarget=null;showPlanes=false}
  function resetCamera(){
    Object.assign(camera,{yaw:defaultYaw,pitch:defaultPitch,zoom:1,x:0,y:0});
  }
  function resetModel(){stopModel();camera.opening=0;resetCamera();updateModelControls();requestDraw()}
  function animateModel(target){
    const token=++animation,start=camera.opening,started=performance.now();
    const duration=reduced.matches?0:1000;
    const intro=target===1&&start===0&&duration ? .22 : 0;
    animationTarget=target;updateModelControls();
    function frame(now){
      if(token!==animation)return;
      const fraction=duration?clamp((now-started)/duration,0,1):1;
      showPlanes=fraction<intro;
      const t=clamp((fraction-intro)/(1-intro),0,1);
      camera.opening=start+(target-start)*(t*t*(3-2*t));
      if(fraction<1)requestAnimationFrame(frame);
      else animationTarget=null;
      updateModelControls();requestDraw();
    }
    requestAnimationFrame(frame);
  }
  $('openModel').addEventListener('click',()=>{
    if(animationTarget!==null){stopModel();updateModelControls();requestDraw();return}
    animateModel(camera.opening>.5?0:1);
  });
  $('openRange').addEventListener('input',event=>{
    stopModel();camera.opening=Number(event.target.value)/100;updateModelControls();requestDraw();
  });
  function modelMode(mode){
    camera.mode=mode;
    $('rotateMode').setAttribute('aria-pressed',String(mode==='rotate'));
    $('panMode').setAttribute('aria-pressed',String(mode==='pan'));
  }
  $('rotateMode').addEventListener('click',()=>modelMode('rotate'));
  $('panMode').addEventListener('click',()=>modelMode('pan'));
  $('modelReset').addEventListener('click',()=>{resetCamera();requestDraw()});
  function pointerDistance(){const [a,b]=pointers.values();return Math.hypot(a.x-b.x,a.y-b.y)}
  function cameraZoom(factor){camera.zoom=clamp(camera.zoom*factor,.54,3);requestDraw()}
  stage.addEventListener('pointerdown',event=>{
    if(pointers.size>=2)return;
    const point={x:event.clientX,y:event.clientY};
    pointers.set(event.pointerId,point);stage.setPointerCapture(event.pointerId);
    if(pointers.size===2){pinchDistance=pointerDistance();modelDrag=null}
    else modelDrag={...point,mode:event.shiftKey?'pan':camera.mode};
  });
  stage.addEventListener('pointermove',event=>{
    if(!pointers.has(event.pointerId))return;
    const point={x:event.clientX,y:event.clientY};pointers.set(event.pointerId,point);
    if(pointers.size===2){
      const distance=pointerDistance();
      if(distance>0&&pinchDistance>0)cameraZoom(distance/pinchDistance);
      pinchDistance=distance;return;
    }
    if(!modelDrag)return;
    const dx=point.x-modelDrag.x,dy=point.y-modelDrag.y;
    if(modelDrag.mode==='pan'){camera.x+=dx;camera.y+=dy}
    else{camera.yaw+=dx*.008;camera.pitch+=dy*.008}
    Object.assign(modelDrag,point);requestDraw();
  });
  for(const type of ['pointerup','pointercancel','lostpointercapture'])stage.addEventListener(type,event=>{
    if(!pointers.delete(event.pointerId))return;
    const [point]=pointers.values();modelDrag=point?{...point,mode:camera.mode}:null;
  });
  stage.addEventListener('wheel',event=>{event.preventDefault();cameraZoom(event.deltaY<0?1.11:1/1.11)},{passive:false});
  stage.addEventListener('keydown',event=>{
    const moves={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
    const move=moves[event.key];
    if(!move)return;
    event.preventDefault();
    const [x,y]=move;
    if(event.shiftKey){camera.x+=x*16;camera.y+=y*16}
    else{camera.yaw+=x*.12;camera.pitch+=y*.12}
    requestDraw();
  });
  media.addEventListener('change',()=>setLayout(media.matches?lesson.narrow:lesson.wide));
  if('ResizeObserver'in window)new ResizeObserver(requestDraw).observe(stage);
  else addEventListener('resize',requestDraw);
  for(const [index,cut] of lesson.cuts.entries()){
    if(lesson.cuts.length===1)break;
    const button=document.createElement('button');
    button.type='button';button.textContent=cut.modelLabel??cut.label;
    button.addEventListener('click',()=>selectMode(index));
    $('cutModes').append(button);
  }
  setLayout(media.matches?lesson.narrow:lesson.wide);setStep(0);selectMode(0);drawModel();
})();
