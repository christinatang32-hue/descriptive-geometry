(()=>{
  'use strict';
  const G=__SECTION_GEOMETRY__;
  const {width:L,height:H,depth:D,bottom:F,backWall:T,shoulder:S,rearSlotInset:A,frontSlotInset:B,holeRadius:R}=G;
  const mid=L/2,centerZ=F+R,topHole=F+2*R;
  const steps=[
    {title:'读题',action:'对照两幅已知投影，辨认背板、两侧槽肩和底板。圆孔沿前后方向穿过背板，孔的最低点与槽底同高。'},
    {title:'判定剖切位置和视向',action:'A—A 经过左右对称中心，也通过圆孔轴线。沿正面投影中 A 符号的视向，自左向右观察，移去左半体。剖面图左边对应背面，右边对应前缘。'},
    {title:'绘制轮廓线',short:'绘制轮廓线',action:'先用细实线绘制出所有的轮廓线。量取尺寸时，对照剖开后轴测图中同步标出的线段和点位。\n1. 从水平投影量取总厚，从左向右画底边。从底边左端向上转移总高，画左竖线。再量取顶边长度，从左向右画顶边，直接连接上下两边的右端点。\n2. 从水平投影量取背板厚度，圈出圆孔的最高点和最低点，转移高程后从左向右画内侧水平线。孔口下边与槽底线重合，画成一条。\n3. 从已有的顶边向下画背板内缘，再量取槽肩位置，从顶边向下画槽肩竖线。'},
    {title:'填充钢筋混凝土图例',short:'填充钢筋混凝土图例',action:'保留细实线轮廓。在上方背板和下方底板的切面内画连续的 45° 细实线，再散布小三角和小点。'},
    {title:'加粗结果并核对',short:'加粗结果并核对',action:'本题取 b = 0.8 mm。切到的轮廓用 0.7b 中粗实线（0.56 mm），未切到的可见轮廓用 0.5b 中实线（0.40 mm）。核对孔口和槽底高程、背板厚度及槽肩位置。'}
  ];
  const $=id=>document.getElementById(id),diagram=$('diagram'),scene=$('scene');
  const media=matchMedia('(max-width: 750px)'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const wide={size:[820,640],front:[88,384],plan:[88,507],section:[514,384],axon:[467,449,777,601]};
  const narrow={size:[618,679],front:[49,378],plan:[49,501],section:[455,378],axon:[385,448,601,640]};
  let layout=media.matches?narrow:wide;
  let step=0,phase=0,playing=false,stepTimer=0,playTimer=0,zoom=1,panX=0,panY=0,diagramDrag=null;
  const n=v=>Math.round(v*100)/100;
  const xy=([x,y])=>`${n(x)} ${n(y)}`;
  const line=(a,b,cls)=>`<line class="${cls}" x1="${n(a[0])}" y1="${n(a[1])}" x2="${n(b[0])}" y2="${n(b[1])}"/>`;
  const path=(d,cls)=>`<path class="${cls}" d="${d}"/>`;
  const trace=(pts,close=false)=>'M'+pts.map(xy).join(' L')+(close?' Z':'');
  const text=([x,y],label,cls='',anchor='start')=>`<text class="${cls}" x="${x}" y="${y}" text-anchor="${anchor}">${label}</text>`;
  function viewPoint(view,[u,v]){
    const [x,y]=layout[view];
    return [x+u,y+(view==='plan'?v:-v)];
  }
  const viewLine=(view,a,b,cls)=>line(viewPoint(view,a),viewPoint(view,b),cls);
  const viewPath=(view,pts,cls,close=false)=>path(trace(pts.map(point=>viewPoint(view,point)),close),cls);
  const rect=(left,bottom,right,top)=>[[left,bottom],[right,bottom],[right,top],[left,top]];
  const pair=(view,a,b,side=1)=>({view,a,b,side});
  const section=(a,b)=>pair('section',a,b);
  const sectionBase=rect(0,0,D,F),sectionBack=rect(0,topHole,T,H);
  const visibleBack=[section([0,F],[0,topHole]),section([T,F],[T,topHole]),
    section([T,H],[D,H]),section([D,F],[D,H]),section([S,F],[S,H])];
  const exterior=rect(0,0,L,H),planOuter=rect(0,0,L,D);
  const slotFront=[[B,H],[B,F],[L-B,F],[L-B,H]];
  const slotPlan=[[B,D],[B,S],[A,S],[A,T],[L-A,T],[L-A,S],[L-B,S],[L-B,D]];
  function givenViews(){
    let out=viewPath('front',exterior,'given',true)+viewPath('front',slotFront,'given');
    for(const [a,b] of [[A,B],[L-A,L-B]])out+=viewPath('front',[[a,H],[a,F],[b,F]],'hidden-line');
    const [cx,cy]=viewPoint('front',[mid,centerZ]);
    out+=`<circle class="given hole-rim" cx="${cx}" cy="${cy}" r="${R}"/>`;
    out+=viewLine('front',[mid-R-12,centerZ],[mid+R+12,centerZ],'axis-line');
    out+=viewLine('front',[mid,step===1?-19:F-10],[mid,step===1?H+19:topHole+10],step===1?'axis-line cut-active':'axis-line');
    for(const [z,inward] of [[H+49,-1],[-49,1]]){
      out+=viewPath('front',[[mid+20,z],[mid,z],[mid,z+27*inward]],'given cut-symbol');
      out+=text(viewPoint('front',[mid+28,z-5]),'A');
    }
    out+=viewPath('plan',planOuter,'given',true)+viewPath('plan',slotPlan,'given');
    for(const x of [mid-R,mid+R])out+=viewLine('plan',[x,0],[x,T],'hidden-line');
    out+=viewLine('plan',[mid,-13],[mid,D+13],'axis-line');
    return out;
  }
  const cutPoint=([y,z])=>[mid,y,z];
  function depthMeasure(x,y,axon,level=-12){
    return {source:pair('plan',[x,0],[x,y],-1),target:pair('section',[0,level],[y,level],level<0?1:-1),axon};
  }
  const contourOperations=[
    depthMeasure(L,D,[[0,0],[D,0]].map(cutPoint)),
    {edge:section([0,0],[D,0])},
    {source:pair('front',[0,0],[0,H],-1),target:pair('section',[0,0],[0,H],-1),axon:[[L,0,0],[L,0,H]]},
    {edge:section([0,0],[0,H])},
    depthMeasure(L,D,[[L,0,H],[L,D,H]],H+12),
    {edge:section([0,H],[D,H])},
    {edge:section([D,H],[D,0])},
    depthMeasure(A,T,[[0,topHole],[T,topHole]].map(cutPoint)),
    {sample:topHole},{sample:topHole,edge:section([0,topHole],[T,topHole])},
    {sample:F},{sample:F,edge:section([0,F],[D,F])},
    {edge:section([T,H],[T,F])},
    depthMeasure(B,S,[[L-B,0,H],[L-B,S,H]]),
    {edge:section([S,H],[S,F])}
  ];
  const contourPhases=contourOperations.length*2;

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
  function drawEdge({view,a,b},cls){
    const render=cls==='drawing-edge'?tracedLine:line;
    return render(viewPoint(view,a),viewPoint(view,b),cls);
  }
  function dotAt(view,point){
    const [x,y]=viewPoint(view,point);
    return `<circle class="transfer-point" cx="${n(x)}" cy="${n(y)}" r="3.25"/>`;
  }
  function transferPoints(){
    if(step!==2||phase===contourPhases)return '';
    let out='';
    for(const [index,z] of [topHole,F].entries()){
      const start=contourOperations.findIndex(item=>item.sample===z)*2;
      const progress=phase-start;
      if(progress<0)continue;
      if(progress===1){
        out+=line(viewPoint('front',[mid,z]),viewPoint('plan',[mid,T]),'guide');
      }
      if(progress===2){
        const [a,b]=[viewPoint('front',[mid,z]),viewPoint('section',[T,z])];
        out+=line(a,b,'guide');
        out+=viewLine('section',[T,z-10],[T,z+10],'guide');
      }
      out+=dotAt('front',[mid,z]);
      if(progress>=1&&index===0)for(const y of [0,T])out+=dotAt('plan',[mid,y]);
      if(progress>=1&&progress<=3){
        for(const y of [0,T])out+=axonPoint(axonView,cutPoint([y,z]));
      }
      if(progress>=2)for(const y of [0,T])out+=dotAt('section',[y,z]);
    }
    return out;
  }
  const hatchSpacing=15;
  const aggregate=[];
  for(const [x0,z0,x1,z1] of [[0,0,D,F],[0,topHole,T,H]]){
    const count=Math.round((x1-x0)*(z1-z0)/155);
    for (let i=0;i<count;i++){
      const triangle=i%4===0;
      const x=x0+4+(x1-x0-8)*Math.random(),z=z0+4+(z1-z0-8)*Math.random();
      if(aggregate.some(mark=>Math.hypot(mark.x-x,mark.z-z)<4.2))continue;
      aggregate.push({x,z,triangle,r:triangle?2.2+Math.random():.65+.45*Math.random(),angle:Math.random()*2*Math.PI});
    }
  }
  function trianglePoints({x,z,r,angle}){
    return [0,1,2].map(index=>[x+r*Math.cos(angle+index*2*Math.PI/3),z+r*Math.sin(angle+index*2*Math.PI/3)]);
  }
  function concrete(showAggregate=true){
    const regions=[sectionBase,sectionBack].map(points=>trace(points.map(point=>viewPoint('section',point)),true));
    const clip=`<defs><clipPath id="concrete-cut">${path(regions.join(' '),'clip-shape')}</clipPath></defs>`;
    const strokes=[];
    for(let x=-H;x<D;x+=hatchSpacing)strokes.push(`M${xy(viewPoint('section',[x,0]))} L${xy(viewPoint('section',[x+H,H]))}`);
    let out=path(strokes.join(' '),'material-line');
    for(const mark of showAggregate?aggregate:[]){
      if(mark.triangle)out+=viewPath('section',trianglePoints(mark),'aggregate-triangle',true);
      else{
        const [x,y]=viewPoint('section',[mark.x,mark.z]);
        out+=`<circle class="aggregate-dot" cx="${n(x)}" cy="${n(y)}" r="${n(mark.r)}"/>`;
      }
    }
    return clip+`<g clip-path="url(#concrete-cut)">${out}</g>`;
  }
  function sectionCaption(){
    const [x,y]=viewPoint('section',[D/2,-44]);
    return '<g class="section-caption">'+text([x,y],'A—A 剖面图','section-name','middle')+
      line([x,y+6],[x,y+6],'section-underline')+'</g>';
  }
  function drawResults(){
    if(step<2)return '';
    if(step===steps.length-1)return concrete()+
      visibleBack.map(edge=>drawEdge(edge,'result-behind')).join('')+
      viewPath('section',sectionBase,'result-cut',true)+viewPath('section',sectionBack,'result-cut',true)+sectionCaption();
    let out=step===3?concrete(phase>0):'';
    for(const [index,item] of contourOperations.entries()){
      const reveal=2*index+1;
      if(step===2&&phase<reveal)break;
      if(item.edge)out+=drawEdge(item.edge,step===2&&phase===reveal?'drawing-edge':'process');
    }
    return out+sectionCaption()+transferPoints();
  }
  function drawMeasurements(){
    const item=step===2?contourOperations[Math.floor(phase/2)]:null;
    if(!item)return '';
    return (item.source?measurement(item.source):'')+(item.target&&phase%2?measurement(item.target):'')+
      (item.axon?axonMeasurement(axonView,item.axon,-1):'');
  }

  // Generate each face from the right half and mirror it about the section plane.
  // The circular opening is split at its extrema and at the rays to the rectangle corners.
  const faces=[],edges=[];
  function addFace(points,axis,direction,kind='flat'){
    const unique=[...new Map(points.map(point=>[point.join(','),point])).values()];
    if(unique.length>=3)faces.push({points:unique,axis,direction,kind,cut:kind==='cut'});
  }
  const yFace=(y,x0,z0,x1,z1,direction)=>addFace(rect(x0,z0,x1,z1).map(([x,z])=>[x,y,z]),1,direction);
  const zFace=(z,x0,y0,x1,y1,direction)=>addFace(rect(x0,y0,x1,y1).map(([x,y])=>[x,y,z]),2,direction);
  const xFace=(x,y0,z0,y1,z1,direction,kind)=>addFace(rect(y0,z0,y1,z1).map(([y,z])=>[x,y,z]),0,direction,kind);
  const addEdge=(a,b)=>edges.push({a,b,adjacent:[]});
  function perimeter(points){
    for(let i=0;i<points.length;i++)addEdge(points[i],points[(i+1)%points.length]);
  }
  const outer=L,groove=L-A,mouth=L-B;
  const circleAngles=Array.from({length:81},(_,i)=>Math.PI*(i/80-.5));
  for(const [x,z] of [[outer,0],[outer,H],[groove,F],[groove,H]]){
    circleAngles.push(Math.atan2(z-centerZ,x-mid));
  }
  circleAngles.sort((a,b)=>a-b);
  const radial=circleAngles.filter((angle,index)=>index===0||angle-circleAngles[index-1]>1e-9).map(angle=>{
    const cx=Math.cos(angle)<1e-10?0:Math.cos(angle),cz=Math.sin(angle);
    return {cx,cz};
  });
  const holePoint=({cx,cz},y)=>[mid+R*cx,y,centerZ+R*cz];
  function rectanglePoint({cx,cz},y,farX,lowZ){
    const radiusX=cx>0?(farX-mid)/cx:Infinity;
    const radiusZ=cz>0?(H-centerZ)/cz:cz<0?(centerZ-lowZ)/-cz:Infinity;
    const radius=Math.min(radiusX,radiusZ);
    return [mid+radius*cx,y,centerZ+radius*cz];
  }
  for(let i=1;i<radial.length;i++){
    const a=radial[i-1],b=radial[i];
    for(const [y,x,z,direction] of [[0,outer,0,-1],[T,groove,F,1]]){
      addFace([holePoint(a,y),rectanglePoint(a,y,x,z),rectanglePoint(b,y,x,z),holePoint(b,y)],1,direction);
      addEdge(holePoint(a,y),holePoint(b,y));
    }
    addFace([holePoint(a,0),holePoint(a,T),holePoint(b,T),holePoint(b,0)],1,1,'cylinder');
  }
  xFace(outer,0,0,D,H,1);
  yFace(D,mid,0,outer,F,1);yFace(D,mouth,F,outer,H,1);
  yFace(S,mouth,F,groove,H,-1);
  zFace(0,mid,0,outer,D,-1);
  zFace(H,mid,0,outer,T,1);zFace(H,groove,T,outer,S,1);zFace(H,mouth,S,outer,D,1);
  zFace(F,mid,T,groove,S,1);zFace(F,mid,S,mouth,D,1);
  xFace(groove,T,F,S,H,-1);xFace(mouth,S,F,D,H,-1);

  perimeter(rect(0,0,D,H).map(([y,z])=>[outer,y,z]));
  for(const [y,z,x] of [[0,0,outer],[0,H,outer],[D,0,outer],[D,F,mouth],[T,H,groove],[T,F,groove]]){
    addEdge([mid,y,z],[x,y,z]);
  }
  addEdge([mouth,D,H],[outer,D,H]);
  for(const [x,y0,y1] of [[groove,T,S],[mouth,S,D]]){
    for(const z of [F,H])addEdge([x,y0,z],[x,y1,z]);
    for(const y of [y0,y1])addEdge([x,y,F],[x,y,H]);
  }
  for(const z of [F,H])addEdge([mouth,S,z],[groove,S,z]);
  const rightFaces=faces.slice(),rightEdges=edges.slice();
  xFace(mid,0,0,D,F,-1,'cut');xFace(mid,0,topHole,T,H,-1,'cut');
  for(const outline of [sectionBase,sectionBack])perimeter(outline.map(([y,z])=>[mid,y,z]));
  function mesh(halfFaces,halfEdges,open){
    const reflect=([x,y,z])=>[L-x,y,z];
    const modelFaces=halfFaces.flatMap(face=>[
      {...face,part:0},
      {...face,part:open?1:0,points:face.points.map(reflect),direction:face.axis===0?-face.direction:face.direction}
    ]);
    const modelEdges=halfEdges.flatMap(edge=>{
      const right={...edge,part:0};
      if(!open&&edge.a[0]===mid&&edge.b[0]===mid)return [right];
      return [right,{...edge,part:open?1:0,a:reflect(edge.a),b:reflect(edge.b)}];
    });
    const unique=new Map();
    for(const {part,points} of modelFaces)for(const point of points)unique.set(part+'|'+point.join(','),{part,point});
    return {faces:modelFaces,edges:modelEdges,vertices:[...unique.values()]};
  }
  const modelClosed=mesh(rightFaces,rightEdges,false),modelOpen=mesh(faces,edges,true);

  const cross=(ax,ay,bx,by)=>ax*by-ay*bx;
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
    axonView=createSectionAxon(modelOpen,layout.axon,'A—A 剖开后的轴测图');
    render2D();
  }
  const measureDuration=425,transferDuration=375,drawDuration=500;
  function phaseDuration(index){
    if(step===3)return 450;
    const item=contourOperations[Math.floor(index/2)];
    if(index%2&&item?.edge)return drawDuration;
    if(item?.sample===undefined&&!item?.source&&!item?.target)return 0;
    return index%2?transferDuration:measureDuration;
  }
  function setStep(value){
    clearTimeout(stepTimer);
    step=Math.max(0,Math.min(steps.length-1,Number(value)));phase=0;
    const count=step===2?contourPhases:step===3?1:0;
    const duration=Array.from({length:count},(_,index)=>phaseDuration(index)).reduce((sum,time)=>sum+time,0);
    if(reduced.matches)phase=count;
    function drawPhase(){
      render2D();
      if(phase<count)stepTimer=setTimeout(()=>{phase++;drawPhase()},phaseDuration(phase));
    }
    drawPhase();
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
    const moveX=-179*camera.opening;
    const cy=Math.cos(camera.yaw),sy=Math.sin(camera.yaw),cp=Math.cos(camera.pitch),sp=Math.sin(camera.pitch);
    const rotated=([x,y,z],part)=>{
      const dx=x+part*moveX,dy=y,dz=z;
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
  function faceColor({cut,axis,direction,kind,points}){
    if(cut)return [243,235,218];
    if(kind==='cylinder'){
      const z=(points[0][2]+points[2][2])/2;
      const shade=Math.round(36*(centerZ-z)/R);
      return [145+shade,184+shade,179+shade];
    }
    if(axis===2)return direction>0?[208,231,226]:[139,178,175];
    return axis===0?[159,192,190]:[177,212,207];
  }
  const hatchColor=[112,105,91];
  const textureScale=3,texture=document.createElement('canvas');
  texture.width=Math.ceil(D*textureScale);texture.height=Math.ceil(H*textureScale);
  const textureCtx=texture.getContext('2d');
  textureCtx.setTransform(textureScale,0,0,-textureScale,0,H*textureScale);
  textureCtx.lineWidth=.85;
  for(const mark of aggregate){
    textureCtx.beginPath();
    if(mark.triangle){
      for(const [i,point] of trianglePoints(mark).entries()){
        if(i===0)textureCtx.moveTo(...point);else textureCtx.lineTo(...point);
      }
      textureCtx.closePath();textureCtx.stroke();
    }else{textureCtx.arc(mark.x,mark.z,mark.r,0,2*Math.PI);textureCtx.fill()}
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
        let hatchStart=0,hatchU=0,hatchV=0,pixelSpan=0;
        const p0=source.points[0],p1=source.points[i],p2=source.points[i+1];
        if(source.cut){
          const coordinate=p=>p[1]-p[2]+H;
          hatchStart=coordinate(source.points[0]);
          hatchU=coordinate(source.points[i])-hatchStart;
          hatchV=coordinate(source.points[i+1])-hatchStart;
          pixelSpan=(Math.abs(cross(hatchU,by,hatchV,cy))+Math.abs(cross(bx,hatchU,cx,hatchV)))/Math.abs(det);
        }
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
            const stripe=(hatchStart+u*hatchU+v*hatchV)%hatchSpacing;
            const distance=Math.min(stripe,hatchSpacing-stripe),stroke=1.45;
            const covered=clamp((pixelSpan+stroke)/2-distance,0,Math.min(pixelSpan,stroke));
            coverage=pixelSpan>=hatchSpacing?stroke/hatchSpacing:covered/Math.max(1e-7,pixelSpan);
            const tu=clamp(Math.floor((w*p0[1]+u*p1[1]+v*p2[1])*textureScale),0,texture.width-1);
            const tv=clamp(Math.floor((H-w*p0[2]-u*p1[2]-v*p2[2])*textureScale),0,texture.height-1);
            coverage=Math.max(coverage,aggregateAlpha[(tv*texture.width+tu)*4+3]/255);
          }
          const offset=index*4;
          rgba[offset]=color[0]+(hatchColor[0]-color[0])*coverage;
          rgba[offset+1]=color[1]+(hatchColor[1]-color[1])*coverage;
          rgba[offset+2]=color[2]+(hatchColor[2]-color[2])*coverage;
          rgba[offset+3]=255;
        }
      }
    }
    ctx.putImageData(pixels,0,0);
  }
  const plane=[[mid,-10,-6],[mid,D+12,-6],[mid,D+12,H+15],[mid,-10,H+15]];
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
    strokeSegments(mesh.edges,faces,project);
    if(showPlanes){
      ctx.setLineDash([5,4]);ctx.strokeStyle='#198681';ctx.lineWidth=1.1;
      const edges=plane.map((a,index)=>({a,b:plane[(index+1)%plane.length],part:0,adjacent:[]}));
      strokeSegments(edges,faces,project);ctx.setLineDash([]);
    }
    if(camera.opening>.035){
      ctx.fillStyle='#0b6f6b';ctx.font='bold 12px Microsoft YaHei';
      ctx.fillText('A—A 剖面',10,19);
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
