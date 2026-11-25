(()=>{
  'use strict';
  const G=__SECTION_GEOMETRY__;
  const {width:W,depth:D,height:H,wall:A,floor:F,overhang:E,portBottom:J,
    portCenterY:Yb,portCenterZ:Zb,portHalfDepth:B,portRadius:rb,tubeRadius:R,holeRadius:r,tubeTop:U,turnX:S}=G;
  const Cx=W/2,Cy=D/2,lo=Zb-rb,hi=Zb+rb;
  const steps=[
    {title:'读题',action:'对照两面投影，辨认左凸台、横向通孔、内腔和中央带孔圆形凸台。横孔在水平投影中由两条虚线表示，中央两圈分别对应凸台外缘和竖向通孔。各尺寸按题图比例转移。'},
    {title:'确定剖切位置与视向',short:'定剖切位置',action:'水平投影左段 A—A 穿过左凸台横孔的轴线，右段穿过中央凸台及竖向孔的轴线。两段从图下方朝图上方观察，并在同一立面合成。可播放三维剖开动画，查看两个平行剖切面及其转折。'},
    {title:'绘制轮廓线',action:'先用细实线绘制出所有的轮廓线。\n1. 从主体中心线向两侧量取底边半长，画底边。由左端逐段画出左凸台，由右端向上画右竖线，再连接两个顶端。\n2. 从外轮廓左、右竖线的上端分别向内量取，定出两条内壁的顶点。分别向下量取内壁高度并画竖线，再从各自下端向内量取并画两段底板面线。由这两段线的内端向上量取并画圆凸台的两条竖线，连接两条竖线的上端。\n3. 从中央轴线向两侧量取竖孔半径，定位并画出两条竖直转向线。\n4. 最后画横孔。从外轮廓顶边与最左竖线的交点向下量取孔轴位置，画水平细点划线。再从孔轴向上、向下分别量取半径，依次画出两条水平转向线。'},
    {title:'填充混凝土图例',action:'在实际切到的三个混凝土区域内散布不同方向的小三角和点。左横孔、中央竖孔和内腔都留白。'},
    {title:'加粗结果并核对',action:'本题取 b = 0.8 mm。切到的轮廓用 0.7b 中粗实线（0.56 mm），未切到的可见轮廓用 0.5b 中实线（0.40 mm）。核对两个通孔、底板和两段剖切的连续关系。'}
  ];
  const $=id=>document.getElementById(id),diagram=$('diagram'),scene=$('scene');
  const media=matchMedia('(max-width: 750px)'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const wide={size:[970,690],front:[117,230],plan:[117,320],section:[600,230],axon:[543,312,941,644]};
  const narrow={size:[725,900],front:[93,206],plan:[93,283],section:[352,812],axon:[415,298,711,566]};
  let layout=media.matches?narrow:wide;
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
    const [x,y]=layout[view];
    return [x+u,y+(view==='plan'?v:-v)];
  }
  const viewLine=(view,a,b,cls)=>line(viewPoint(view,a),viewPoint(view,b),cls);
  const viewPath=(view,pts,cls,close=false)=>path(trace(pts.map(point=>viewPoint(view,point)),close),cls);
  const h=(z,a,b)=>[[Math.min(a,b),z],[Math.max(a,b),z]];
  const v=(x,a,b)=>[[x,a],[x,b]];
  const portAxis=h(Zb,-E-13,A+12);
  const sectionRegions=[
    rect(-E,hi,A,H),
    [[-E,J],[0,J],[0,0],[Cx-r,0],[Cx-r,U],[Cx-R,U],[Cx-R,F],[A,F],[A,lo],[-E,lo]],
    [[Cx+r,0],[W,0],[W,H],[W-A,H],[W-A,F],[Cx+R,F],[Cx+R,U],[Cx+r,U]]
  ];
  const behind=[h(H,A,W-A),v(-E,lo,hi),v(A,lo,hi),h(0,Cx-r,Cx+r),h(U,Cx-r,Cx+r)];
  function circle(view,p,radius,cls){
    const [x,y]=viewPoint(view,p);
    return `<circle class="${cls}" cx="${n(x)}" cy="${n(y)}" r="${radius}"/>`;
  }
  function givenViews(){
    let out=viewPath('front',[[0,0],[W,0],[W,H],[-E,H],[-E,J],[0,J]],'given',true);
    out+=viewLine('front',[0,J],[0,H],'given');
    out+=viewPath('front',[[A,H],[A,F],[W-A,F],[W-A,H]],'hidden-line');
    out+=viewPath('front',[[Cx-R,F],[Cx-R,U],[Cx+R,U],[Cx+R,F]],'hidden-line');
    for(const x of [Cx-r,Cx+r])out+=viewLine('front',[x,0],[x,U],'hidden-line');
    for(const z of [lo,hi])out+=viewLine('front',[-E,z],[A,z],'hidden-line');
    out+=viewLine('front',[-E-12,Zb],[A+13,Zb],'axis-line')+viewLine('front',[Cx,-12],[Cx,H+12],'axis-line');
    out+=viewPath('plan',[[0,0],[W,0],[W,D],[0,D],[0,Yb+B],[-E,Yb+B],[-E,Yb-B],[0,Yb-B]],'given',true);
    out+=viewPath('plan',rect(A,A,W-A,D-A),'given',true);
    for(const d of [-rb,rb])out+=viewLine('plan',[-E,Yb+d],[A,Yb+d],'hidden-line');
    for(const radius of [R,r])out+=circle('plan',[Cx,Cy],radius,'given hole-rim');
    out+=viewLine('plan',[Cx,-15],[Cx,D+15],'axis-line');
    const cut=step===1?'axis-line cut-active':'axis-line';
    out+=viewLine('plan',[-E-25,Yb],[S,Yb],cut)+viewLine('plan',[S,Cy],[W+16,Cy],cut);
    if(step===1)out+=viewLine('plan',[S,Yb],[S,Cy],'guide');
    for(const [x,y,dx,dy] of [[-E-44,Yb,24,-18],[S,Yb,-19,16],[S,Cy,19,-17],[W+39,Cy,-25,-18]]){
      out+=viewPath('plan',[[x,y+dy],[x,y],[x+dx,y]],'given cut-symbol');
      out+=text(viewPoint('plan',[x+(dy>0?8:-3),y+(dy>0?12:-24)]),'A');
    }
    return out;
  }
  const mark=(view,a,b,side=1)=>({view,a,b,side});
  const op=(edge,...measures)=>({edge,measures});
  const locate=(points,...measures)=>({points,measures});
  function width(from,to,z,planY=Cy,axonY=planY){
    const side=Math.sign(to-from)*(z===0?1:-1);
    return {source:mark('plan',[from,planY],[to,planY],side),target:mark('section',[from,z],[to,z],side),
      axon:[[from,axonY,z],[to,axonY,z]],side};
  }
  function height(x,from,to,y,sourceX=x){
    const side=(x>Cx?1:-1)*Math.sign(to-from);
    return {source:mark('front',[sourceX,from],[sourceX,to],side),target:mark('section',[x,from],[x,to],side),
      axon:[[x,y,from],[x,y,to]],side};
  }
  function measuredWidth(z,from,to,y,axonY=y){return op(h(z,from,to),width(from,to,z,y,axonY))}
  function measuredWall(x,from,to,y,sourceX=x){return op(v(x,from,to),height(x,from,to,y,sourceX))}
  const sides=[-1,1];
  const contourOperations=[
    op(h(0,0,W),...sides.map(i=>width(Cx,Cx+i*Cx,0,D,0))),
    measuredWall(0,0,J,Yb),measuredWidth(J,0,-E,Yb),
    measuredWall(-E,J,H,Yb),measuredWall(W,0,H,Cy),op(h(H,-E,W)),
    locate([[A,H]],width(-E,A,H,Yb)),locate([[W-A,H]],width(W,W-A,H,Cy)),
    measuredWall(A,H,F,Yb),measuredWall(W-A,H,F,Cy),
    measuredWidth(F,A,Cx-R,Cy,Yb),measuredWidth(F,W-A,Cx+R,Cy),
    measuredWall(Cx-R,F,U,Cy),measuredWall(Cx+R,F,U,Cy),op(h(U,Cx-R,Cx+R)),
    locate(sides.map(i=>[Cx+i*r,U]),...sides.map(i=>width(Cx,Cx+i*r,U,Cy))),
    measuredWall(Cx-r,U,0,Cy),measuredWall(Cx+r,U,0,Cy),
    {...op(portAxis,height(-E,H,Zb,Yb)),axis:true,points:[[-E,Zb]]},
    op(h(hi,-E,A),height(-E,Zb,hi,Yb)),
    op(h(lo,-E,A),height(-E,Zb,lo,Yb))
  ];
  const insideSection=(x,z)=>sectionRegions.some(points=>{
    let inside=false;
    for(const [[a,b],[c,d]] of polyEdges(points,true))if((b>z)!==(d>z)&&x<a+(c-a)*(z-b)/(d-b))inside=!inside;
    return inside;
  });
  const aggregate=[];
  for(let i=0;i<240;i++){
    const x=-E+Math.random()*(W+E),z=Math.random()*H;
    const triangle=i%4===0,radius=triangle?1.7+1.3*Math.random():.55+.55*Math.random();
    if(!insideSection(x,z)||aggregate.some(mark=>Math.hypot(mark.x-x,mark.z-z)<3.1))continue;
    aggregate.push({x,z,triangle,radius,angle:Math.random()*Math.PI*2});
  }
  function trianglePoints({x,z,radius,angle}){
    return [0,1,2].map(i=>[x+radius*Math.cos(angle+i*2*Math.PI/3),z+radius*Math.sin(angle+i*2*Math.PI/3)]);
  }
  function concrete(){
    const outlines=sectionRegions.map(points=>trace(points.map(p=>viewPoint('section',p)),true)).join(' ');
    const clip=`<defs><clipPath id="concrete-cut">${path(outlines,'clip-shape')}</clipPath></defs>`;
    const pattern=aggregate.map(item=>item.triangle?viewPath('section',trianglePoints(item),'aggregate-triangle',true):
      circle('section',[item.x,item.z],item.radius,'aggregate-dot')).join('');
    return clip+`<g class="concrete-symbols" clip-path="url(#concrete-cut)">${pattern}</g>`;
  }
  function sectionCaption(){
    const [x,y]=viewPoint('section',[Cx,-41]);
    return '<g class="section-caption">'+text([x,y],'A—A 阶梯剖面图','section-name','middle')+
      line([x,y+6],[x,y+6],'section-underline')+'</g>';
  }
  function drawResults(){
    if(step<2)return '';
    let out=step>=3?concrete():'';
    if(step===4){
      out+=sectionRegions.map(points=>viewPath('section',points,'result-cut',true)).join('');
      out+=behind.map(([a,b])=>viewLine('section',a,b,'result-behind')).join('');
      out+=viewLine('section',...portAxis,'axis-line port-axis');
    }else{
      for(const [index,item] of contourOperations.entries()){
        const progress=step===2?phase-3*index:3;
        if(progress<1)break;
        if(item.points&&step===2){
          for(const point of item.points)out+=circle('section',point,3,'transfer-point');
        }
        if(item.edge&&progress>=2){
          const [a,b]=item.edge.map(p=>viewPoint('section',p)),active=progress===2;
          const style=item.axis?'axis-line port-axis'+(active?' drawing-edge':''):active?'drawing-edge':'process';
          out+=(active?tracedLine:line)(a,b,style);
        }
      }
    }
    return out+viewLine('section',[Cx,-12],[Cx,H+12],'axis-line')+sectionCaption();
  }
  function drawMeasurements(){
    const item=step===2?contourOperations[Math.floor(phase/3)]:null;
    if(!item)return '';
    return item.measures.map(({source,target,axon,side})=>
      measurement(source)+(phase%3===1?measurement(target):'')+axonMeasurement(axonView,axon,side)).join('');
  }

  /* OFFSET_SECTION_MESH */

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
      const [a,b,c]=points;
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

  let axonView;
  function render2D(){
    scene.innerHTML=givenViews()+axonView.drawing+drawResults()+drawMeasurements();
    const [width,height]=layout.size;
    scene.setAttribute('transform',`translate(${width*(1-zoom)/2+panX} ${height*(1-zoom)/2+panY}) scale(${zoom})`);
    startLineTrace();
    for(const caption of scene.querySelectorAll('.section-caption')){
      const [label,underline]=caption.children;
      const center=label.x.baseVal.getItem(0).value,halfWidth=label.getComputedTextLength()/2;
      underline.setAttribute('x1',n(center-halfWidth));
      underline.setAttribute('x2',n(center+halfWidth));
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
    axonView=createSectionAxon(modelOpen,layout.axon,'A—A 剖开后的轴测图',
      silhouettes(modelOpen,[-1,1,1]).filter(edge=>edge.part===0));
    render2D();
  }

  const measureDuration=425,transferDuration=375,drawDuration=500;
  function phaseDuration(index){
    const item=contourOperations[Math.floor(index/3)],part=index%3;
    if(part===2)return item.edge?drawDuration:0;
    return item.measures.length?(part===0?measureDuration:transferDuration):0;
  }
  function setStep(value){
    clearTimeout(stepTimer);
    step=Math.max(0,Math.min(steps.length-1,Number(value)));phase=0;
    const count=step===2?contourOperations.length*3:0;
    const duration=Array.from({length:count},(_,index)=>phaseDuration(index)).reduce((sum,time)=>sum+time,0);
    if(reduced.matches)phase=count;
    function drawPhase(){
      render2D();
      if(phase<count)stepTimer=setTimeout(()=>{phase++;drawPhase()},phaseDuration(phase));
    }
    drawPhase();
    requestDraw();
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
  const defaultYaw=-.76,defaultPitch=.43;
  const camera={opening:0,yaw:defaultYaw,pitch:defaultPitch,zoom:1,x:0,y:0,mode:'rotate'};
  const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
  let modelDrag=null,pinchDistance=0,animation=0,animationTarget=null,showPlanes=false,drawFrame=0;
  const pointers=new Map();
  function modelProjection(width,height,mesh=camera.opening>0?modelOpen:modelClosed){
    const moveY=122*camera.opening;
    const cy=Math.cos(camera.yaw),sy=Math.sin(camera.yaw),cp=Math.cos(camera.pitch),sp=Math.sin(camera.pitch);
    const rotated=([x,y,z],part)=>{
      const dx=x,dy=y+part*moveY,dz=z;
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
    if(cut)return [242,232,211];
    if(normal[2]>.999)return [208,231,226];
    if(normal[2]<-.999)return [139,178,175];
    const shade=curved?Math.round(22*normal[0]-9*normal[1]+18*normal[2]):0;
    return [166+shade,199+shade,195+shade];
  }
  const textureScale=2,texture=document.createElement('canvas');
  texture.width=Math.ceil((Math.max(W,D)+E)*textureScale);
  texture.height=Math.ceil(H*textureScale);
  const textureCtx=texture.getContext('2d');
  textureCtx.setTransform(textureScale,0,0,-textureScale,E*textureScale,H*textureScale);
  textureCtx.lineWidth=.9;
  for(const mark of aggregate){
    textureCtx.beginPath();
    if(mark.triangle){
      for(const [i,point] of trianglePoints(mark).entries()){
        if(i===0)textureCtx.moveTo(...point);else textureCtx.lineTo(...point);
      }
      textureCtx.closePath();textureCtx.stroke();
    }else{textureCtx.arc(mark.x,mark.z,mark.radius,0,2*Math.PI);textureCtx.fill()}
  }
  const aggregateAlpha=textureCtx.getImageData(0,0,texture.width,texture.height).data;
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
            const axis=source.normal[0]?1:0;
            const tu=clamp(Math.floor((w*p0[axis]+u*p1[axis]+v*p2[axis]+E)*textureScale),0,texture.width-1);
            const tv=clamp(Math.floor((H-w*p0[2]-u*p1[2]-v*p2[2])*textureScale),0,texture.height-1);
            coverage=aggregateAlpha[(tv*texture.width+tu)*4+3]/255;
          }
          const offset=index*4;
          rgba[offset]=color[0]+(112-color[0])*coverage;
          rgba[offset+1]=color[1]+(105-color[1])*coverage;
          rgba[offset+2]=color[2]+(91-color[2])*coverage;
          rgba[offset+3]=255;
        }
      }
    }
    ctx.putImageData(pixels,0,0);
  }

  const planeEdges=[
    [[-E-13,Yb,-6],[S,Yb,-6],[S,Yb,H+13],[-E-13,Yb,H+13]],
    [[S,Yb,-6],[S,Cy,-6],[S,Cy,H+13],[S,Yb,H+13]],
    [[S,Cy,-6],[W+13,Cy,-6],[W+13,Cy,H+13],[S,Cy,H+13]]
  ].flatMap(points=>polyEdges(points,true).map(([a,b])=>({a,b,part:0,adjacent:[]})));
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
    const mesh=camera.opening>0?modelOpen:modelClosed;
    const project=modelProjection(width,height,mesh);
    const faces=projectSurfaces(mesh.faces,project);
    rasterFaces(faces,ratio);
    ctx.setTransform(ratio,0,0,ratio,0,0);
    ctx.lineCap='butt';ctx.lineWidth=1.26;ctx.strokeStyle='#3c6565';
    const direction=[Math.sin(camera.yaw)*Math.cos(camera.pitch),Math.cos(camera.yaw)*Math.cos(camera.pitch),Math.sin(camera.pitch)];
    strokeSegments(mesh.edges.concat(silhouettes(mesh,direction)),faces,project);
    if(showPlanes||(step===1&&camera.opening===0)){
      ctx.setLineDash([5,4]);ctx.strokeStyle='#198681';ctx.lineWidth=1.1;
      strokeSegments(planeEdges,faces,project);ctx.setLineDash([]);
    }
    if(camera.opening>.035){
      ctx.fillStyle='#0b6f6b';ctx.font='bold 12px Microsoft YaHei';
      ctx.fillText('A—A 阶梯剖切',10,19);
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
  media.addEventListener('change',()=>setLayout(media.matches?narrow:wide));
  if('ResizeObserver'in window)new ResizeObserver(requestDraw).observe(stage);
  else addEventListener('resize',requestDraw);
  setLayout(layout);setStep(0);updateModelControls();drawModel();
})();
