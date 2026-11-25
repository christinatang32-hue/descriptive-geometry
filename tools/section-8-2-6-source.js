(()=>{
  'use strict';
  const G=__SECTION_GEOMETRY__;
  const {radius:R,height:H,baseHalfLength:X,baseHalfDepth:Y,baseHeight:B,
    pocketHalfLength:P,pocketHalfDepth:Q,pocketFloor:F,
    wingHalfLength:U,wingHalfDepth:V,wingBottom:J,wingTop:K,
    windowHalfLength:M,windowBottom:N,windowTop:T}=G;
  const windowReach=Math.sqrt(R*R-M*M),wingJoin=Math.sqrt(R*R-V*V);
  const steps=[
    {title:'读题',action:'水平投影中的圆对应竖向圆柱。顶部矩形内腔向下伸入底座，底面低于底座顶面。前后侧窗通到内腔，两侧凸翼位于侧窗的高度范围内。尺寸按题图比例转移。'},
    {title:'确定剖切位置与视向',short:'定剖切视向',action:'A—A 通过圆柱轴线，由水平投影下方向上看，作全剖。B—B 也通过圆柱轴线，由左方向右看，左半保留外观，右半作剖面。'},
    {title:'绘制全剖轮廓线',short:'绘制全剖轮廓线',action:'先用细实线绘制出所有的轮廓线。量取时，对照 A—A 剖开后轴测图中同步标出的尺寸。\n1. 从中心线向两侧转移底座、圆柱、凸翼的半宽，从正面投影转移各层高程。外轮廓先从左向右画水平线，再从已画的水平线向下画竖线。\n2. 转移内腔半宽和底面高程。先从左向右画内腔底边与后方可见的窗上下边，再从已有的水平线向下画内腔和侧窗的竖边。'},
    {title:'绘制半剖轮廓线',short:'绘制半剖轮廓线',action:'先用细实线绘制出所有的轮廓线。量取时，对照 B—B 剖开后轴测图中同步标出的尺寸和点位。\n1. 把侧窗的竖边投到水平投影，与圆周求交。圈出交点，向侧面转移其前后位置，并与窗顶、窗底的高程线相交。由此确定侧窗范围内内收的圆柱轮廓。\n2. 先画外轮廓，再补左半凸翼及右半内腔边线。每组先从左向右画水平线，再从已有的水平线向下画竖线。'},
    {title:'填充通用材料图例',short:'填充通用材料图例',action:'保留细实线轮廓。在 A—A 的 U 形切面、B—B 右半的上下两块切面内分别填充等距的 45° 连续细实线。'},
    {title:'加粗结果并核对',short:'加粗结果并核对',action:'本题取 b = 0.8 mm。切到的轮廓用 0.7b 中粗实线（0.56 mm），未切到的可见轮廓用 0.5b 中实线（0.40 mm）。核对内腔底面、侧窗的上下高程和半剖对称符号。'}
  ];
  const $=id=>document.getElementById(id),diagram=$('diagram'),scene=$('scene');
  const media=matchMedia('(max-width: 750px)'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const wide={size:[1205,817],front:[248,354],plan:[248,586],full:[670,354],half:[1018,354],
    axons:{full:[503,485,814,746],half:[858,485,1179,746]}};
  const narrow={size:[867,1130],front:[244,351],plan:[244,586],full:[659,351],half:[659,750],
    axons:{full:[45,844,407,1087],half:[455,844,822,1087]}};
  let layout=media.matches?narrow:wide;
  let step=0,phase=0,playing=false,stepTimer=0,playTimer=0,zoom=1,panX=0,panY=0,diagramDrag=null;
  const n=v=>Math.round(v*100)/100;
  const xy=([x,y])=>`${n(x)} ${n(y)}`;
  const line=(a,b,cls)=>`<line class="${cls}" x1="${n(a[0])}" y1="${n(a[1])}" x2="${n(b[0])}" y2="${n(b[1])}"/>`;
  const path=(d,cls)=>`<path class="${cls}" d="${d}"/>`;
  const trace=(pts,close=false)=>'M'+pts.map(xy).join(' L')+(close?' Z':'');
  const txt=([x,y],label,cls='',anchor='start')=>`<text class="${cls}" x="${x}" y="${y}" text-anchor="${anchor}">${label}</text>`;
  function viewPoint(view,[u,v]){const [x,y]=layout[view];return [x+u,y+(view==='plan'?v:-v)]}
  const viewLine=(view,a,b,cls)=>line(viewPoint(view,a),viewPoint(view,b),cls);
  const viewPath=(view,pts,cls,close=false)=>path(trace(pts.map(point=>viewPoint(view,point)),close),cls);
  const rect=(x0,y0,x1,y1)=>[[x0,y0],[x1,y0],[x1,y1],[x0,y1]];
  const seg=(a,b)=>[a,b];
  const horizontal=(z,a,b)=>seg([a,z],[b,z]);
  const vertical=(x,a,b)=>seg([x,a],[x,b]);
  const polyEdges=(pts,closed=false)=>pts.slice(closed?0:1).map((b,i)=>[pts[(i+(closed?pts.length-1:0))%pts.length],b]);
  function orient(segments){
    return [...segments].sort(([a,b],[c,d])=>Number(a[1]!==b[1])-Number(c[1]!==d[1]))
      .map(([a,b])=>(a[1]===b[1]?a[0]>b[0]:a[1]<b[1])?[b,a]:[a,b]);
  }

  const aOutside=[[-X,0],[X,0],[X,B],[R,B],[R,J],[U,J],[U,K],[R,K],[R,H],[-R,H],[-R,K],[-U,K],[-U,J],[-R,J],[-R,B],[-X,B]];
  const aCut=[...aOutside.slice(0,9),[P,H],[P,F],[-P,F],[-P,H],...aOutside.slice(9)];
  const aWindow=rect(-M,N,M,T);
  const aBehind=[horizontal(H,-P,P),...polyEdges(aWindow,true)];
  const aInside=[horizontal(F,-P,P),horizontal(N,-M,M),horizontal(T,-M,M),vertical(-P,F,H),vertical(P,F,H),vertical(-M,N,T),vertical(M,N,T)];
  const bOutside=[[-Y,0],[Y,0],[Y,B],[R,B],[R,N],[windowReach,N],[windowReach,T],[R,T],[R,H],[-R,H],
    [-R,T],[-windowReach,T],[-windowReach,N],[-R,N],[-R,B],[-Y,B]];
  const bFoot=[[0,0],[Y,0],[Y,B],[R,B],[R,N],[Q,N],[Q,F],[0,F]];
  const bCap=rect(Q,T,R,H);
  const bInside=[horizontal(B,-Y,0),horizontal(J,-V,0),horizontal(K,-V,0),horizontal(F,0,Q),
    horizontal(N,Q,windowReach),horizontal(T,Q,windowReach),vertical(-V,J,K),vertical(Q,F,H)];
  const bBehind=[horizontal(0,-Y,0),horizontal(H,-R,Q),horizontal(B,-Y,0),horizontal(J,-V,0),horizontal(K,-V,0),vertical(-V,J,K),
    horizontal(T,-R,-windowReach),horizontal(N,-R,-windowReach),vertical(-R,T,H),vertical(-windowReach,N,T),
    vertical(-R,B,N),vertical(-Y,0,B),vertical(windowReach,N,T),vertical(Q,N,T)];

  function givenViews(){
    let out=viewPath('front',rect(-X,0,X,B),'given',true)+viewPath('front',rect(-M,N,M,T),'given',true);
    out+=viewLine('front',[-R,H],[R,H],'given');
    for(const side of [-1,1]){
      out+=viewLine('front',[side*R,B],[side*R,J],'given')+viewLine('front',[side*R,K],[side*R,H],'given');
      out+=viewPath('front',rect(side*wingJoin,J,side*U,K),'given',true);
    }
    out+=viewPath('front',[[-P,H],[-P,F],[P,F],[P,H]],'hidden-line');
    out+=viewLine('front',[0,-16],[0,H+16],'axis-line');
    for(const side of [-1,1]){
      const x=side*X;
      out+=viewLine('plan',[x,-Y],[x,-V],'given')+viewLine('plan',[x,V],[x,Y],'given');
      out+=viewLine('plan',[x,-V],[x,V],'hidden-line');
      out+=viewPath('plan',[[side*wingJoin,-V],[side*U,-V],[side*U,V],[side*wingJoin,V]],'given');
      for(const sy of [-1,1])out+=viewLine('plan',[side*M,sy*Q],[side*M,sy*windowReach],'hidden-line');
    }
    for(const y of [-Y,Y])out+=viewLine('plan',[-X,y],[X,y],'given');
    const [cx,cy]=viewPoint('plan',[0,0]);
    out+=`<circle class="given cylinder-rim" cx="${cx}" cy="${cy}" r="${R}"/>`;
    out+=viewPath('plan',rect(-P,-Q,P,Q),'given',true);
    const active=step===1?(phase<2?1:2):step===2?1:step===3?2:0;
    out+=viewLine('plan',[-U-21,0],[U+21,0],active===1?'axis-line cut-active':'axis-line');
    out+=viewLine('plan',[0,-Y-19],[0,Y+19],active===2?'axis-line cut-active':'axis-line');
    for(const side of [-1,1]){
      const x=side*(U+48),y=side*(Y+48);
      out+=viewPath('plan',[[x,-21],[x,0],[x-side*20,0]],'given cut-symbol');
      out+=txt(viewPoint('plan',[x,-28]),'A','','middle');
      out+=viewPath('plan',[[21,y],[0,y],[0,y-side*24]],'given cut-symbol');
      out+=txt(viewPoint('plan',[30,y+5]),'B');
    }
    return out;
  }
  const mark=(view,a,b,side=1)=>({view,a,b,side});
  const edge=(view,a,b)=>({view,a,b});
  const place=(view,segments)=>orient(segments).map(([a,b])=>({edge:edge(view,a,b)}));
  const transferZ=(view,x,z,u,[ax,ay])=>({source:mark('front',[x,0],[x,z],-1),
    target:mark(view,[u,0],[u,z],1),axon:[[ax,ay,0],[ax,ay,z]],axonSide:-1});
  const measureX=(x,y,z)=>({source:mark('plan',[0,y],[x,y],x<0?1:-1),
    target:mark('full',[0,-14],[x,-14],x<0?-1:1),axon:[[0,0,z],[x,0,z]],axonSide:x<0?-1:1});
  const measureY=(y,x,z,ax)=>({source:mark('plan',[x,0],[x,y],y<0?-1:1),
    target:mark('half',[0,-14],[y,-14],y<0?-1:1),axon:[[ax,0,z],[ax,y,z]],axonSide:y<0?-1:1});
  const operations={
    1:[{},{}],
    2:[
      ...[-1,1].flatMap(sign=>[measureX(sign*X,-Y,0),measureX(sign*R,0,H),measureX(sign*U,-V,K)]),
      transferZ('full',-R,H,-U-22,[-R,0]),transferZ('full',-X,B,-U-22,[-X,0]),
      transferZ('full',-U,J,-U-22,[-U,0]),transferZ('full',-U,K,-U-22,[-U,0]),
      ...place('full',polyEdges(aOutside,true)),
      ...[-1,1].flatMap(sign=>[measureX(sign*P,-Q,F),{source:mark('front',[0,T],[sign*M,T],sign<0?1:-1),
        target:mark('full',[0,T+12],[sign*M,T+12],sign<0?1:-1),
        axon:[[0,-Q,T],[sign*M,-Q,T]],axonSide:sign}]),
      transferZ('full',-P,F,-U-22,[-P,0]),transferZ('full',-M,N,-U-22,[-M,-Q]),
      transferZ('full',-M,T,-U-22,[-M,-Q]),
      ...place('full',aInside)
    ],
    3:[
      ...[-1,1].flatMap(sign=>[measureY(sign*Y,X,0,0),measureY(sign*R,0,H,0)]),
      transferZ('half',R,H,Y+20,[0,R]),transferZ('half',X,B,Y+20,[0,Y]),
      {sample:1},{sample:2},{sample:3},
      ...place('half',polyEdges(bOutside,true)),
      measureY(-V,-U,K,-U),measureY(Q,P,F,0),transferZ('half',-U,J,Y+20,[-U,-V]),
      transferZ('half',-U,K,Y+20,[-U,-V]),transferZ('half',-P,F,Y+20,[0,Q]),
      ...place('half',bInside)
    ]
  };

  function sampleMarks(){
    if(step!==3||phase>=operations[3].length*2)return '';
    const start=operations[3].findIndex(item=>item.sample===1)*2;
    const progress=phase-start;
    if(progress<0)return '';
    const circle=(view,p)=>{const [x,y]=viewPoint(view,p);return `<circle class="transfer-point" cx="${n(x)}" cy="${n(y)}" r="3"/>`};
    let guides='',marks='';
    for(const direction of [-1,1]){
      const x=direction*M,reach=direction*windowReach;
      for(const z of [N,T])marks+=circle('front',[x,z]);
      if(progress===1)guides+=line(viewPoint('front',[x,N]),viewPoint('plan',[x,windowReach]),'guide');
      if(progress>=1){
        for(const y of [-windowReach,windowReach])marks+=circle('plan',[x,y]);
      }
      if(progress===2)guides+=measurement(mark('plan',[x,0],[x,reach],direction));
      if(progress===3)guides+=measurement(mark('half',[0,-13],[reach,-13],direction));
      if(progress===2||progress===3)guides+=axonMeasurement(axonViews.half,[[x,0,T],[x,reach,T]],direction);
      if(progress>=1&&progress<=4){
        for(const z of [N,T])marks+=axonPoint(axonViews.half,[x,reach,z]);
      }
      if(progress===3||progress===4){
        for(const z of [N,T]){
          if(layout===wide)guides+=line(viewPoint('front',[x,z]),viewPoint('half',[reach,z]),'guide');
          else{
            guides+=viewLine('front',[x,z],[direction*(U+12),z],'guide');
            guides+=viewLine('half',[reach,z],[direction*(Y+12),z],'guide');
          }
        }
      }
      if(progress>=4)for(const z of [N,T])marks+=circle('half',[reach,z]);
    }
    return guides+marks;
  }
  const hatchSpacing=15;
  function hatch(view,regions,width,rising){
    const id='material-'+view;
    const outlines=regions.map(points=>trace(points.map(p=>viewPoint(view,p)),true)).join(' ');
    const strokes=[];
    for(let x=-width-H;x<width+H;x+=hatchSpacing){
      strokes.push(`M${xy(viewPoint(view,[x,0]))} L${xy(viewPoint(view,[x+rising*H,H]))}`);
    }
    return `<defs><clipPath id="${id}"><path d="${outlines}"/></clipPath></defs>`+
      `<g clip-path="url(#${id})">${path(strokes.join(' '),'metal-line')}</g>`;
  }
  function sectionCaption(view,label){
    const [x,y]=viewPoint(view,[0,-49]);
    return '<g class="section-caption">'+txt([x,y],label,'section-name','middle')+
      line([x,y+6],[x,y+6],'section-underline')+'</g>';
  }
  function centerLine(view){
    let out=viewLine(view,[0,-22],[0,H+30],'axis-line');
    if(view==='half')for(const z of [-13,-20,H+21,H+28])out+=viewLine(view,[-9,z],[9,z],'symmetry-mark');
    return out;
  }
  function drawResults(){
    if(step<2)return '';
    let out=step>=4?hatch('full',[aCut],U,1)+hatch('half',[bFoot,bCap],Y,-1):'';
    const stroke=(view,segments,cls)=>segments.map(([a,b])=>viewLine(view,a,b,cls)).join('');
    if(step===steps.length-1){
      out+=viewPath('full',aCut,'result-cut',true)+stroke('full',aBehind,'result-behind');
      out+=viewPath('half',bFoot,'result-cut')+viewPath('half',bCap,'result-cut',true)+stroke('half',bBehind,'result-behind');
    }else{
      for(const stage of [2,3]){
        if(step<stage)break;
        for(const [i,item] of operations[stage].entries()){
          const reveal=2*i+1;
          if(step===stage&&phase<reveal)break;
          if(item.edge){
            const {view,a,b}=item.edge,active=step===stage&&phase===reveal;
            const render=active?tracedLine:line;
            out+=render(viewPoint(view,a),viewPoint(view,b),active?'drawing-edge':'process');
          }
        }
      }
    }
    out+=centerLine('full')+sectionCaption('full','A—A 剖面图');
    if(step>=3)out+=centerLine('half')+sectionCaption('half','B—B 半剖面图');
    return out+sampleMarks();
  }
  function drawMeasurements(){
    const item=operations[step]?.[Math.floor(phase/2)];
    if(!item)return '';
    return (item.source?measurement(item.source):'')+(item.target&&phase%2?measurement(item.target):'')+
      (item.axon?axonMeasurement(axonViews[item.target.view],item.axon,item.axonSide):'');
  }

  // Partition the plan at every vertical feature plane and at the cylinder wall.
  // Every footprint polygon is convex and belongs wholly inside or outside the cylinder.
  const cross=(ax,ay,bx,by)=>ax*by-ay*bx;
  const dot=(a,b)=>a.reduce((sum,value,i)=>sum+value*b[i],0);
  const levels=[0,F,B,N,J,K,T,H];
  const signedGrid=dimensions=>[-1,1].flatMap(sign=>dimensions.map(value=>sign*value)).concat(0).sort((a,b)=>a-b);
  const gridX=signedGrid([M,P,R,X,U]),gridY=signedGrid([Q,V,R,Y]);
  const angles=Array.from({length:96},(_,i)=>i*Math.PI/48);
  for(const x of gridX.filter(value=>Math.abs(value)<R)){
    const theta=Math.acos(x/R);angles.push(theta,2*Math.PI-theta);
  }
  for(const y of gridY.filter(value=>Math.abs(value)<R)){
    const theta=Math.asin(y/R);angles.push((theta+2*Math.PI)%(2*Math.PI),Math.PI-theta);
  }
  angles.sort((a,b)=>a-b);
  const circle=angles.filter((theta,i)=>theta<2*Math.PI-1e-9&&(i===0||theta-angles[i-1]>1e-9))
    .map(theta=>[R*Math.cos(theta),R*Math.sin(theta)]);
  const cleanNumber=v=>Math.round(v*1e8)/1e8;
  function cleanPolygon(points){
    const unique=[...new Map(points.map(p=>[p.map(cleanNumber).join(','),p.map(cleanNumber)])).values()];
    if(unique.length<3)return [];
    const pruned=unique.filter((p,i)=>{
      const a=unique[(i+unique.length-1)%unique.length],b=unique[(i+1)%unique.length];
      return Math.abs(cross(p[0]-a[0],p[1]-a[1],b[0]-p[0],b[1]-p[1]))>1e-7;
    });
    return pruned.length>=3?pruned:[];
  }
  function splitPolygon(points,a,b){
    const dx=b[0]-a[0],dy=b[1]-a[1];
    const distance=p=>{const value=cross(dx,dy,p[0]-a[0],p[1]-a[1]);return Math.abs(value)<1e-7?0:value};
    const inside=[],outside=[];
    for(const [p,q] of polyEdges(points,true)){
      const dp=distance(p),dq=distance(q);
      if(dp>=0)inside.push(p);
      if(dp<=0)outside.push(p);
      if(dp*dq<0){const t=dp/(dp-dq),hit=p.map((v,i)=>v+t*(q[i]-v));inside.push(hit);outside.push(hit)}
    }
    return [cleanPolygon(inside),cleanPolygon(outside)];
  }
  const discEdges=polyEdges(circle,true),footprints=[];
  function footprint(points,inside,x,y){if(points.length)footprints.push({points,inside,x,y})}
  for(let i=1;i<gridX.length;i++)for(let j=1;j<gridY.length;j++){
    const [left,right]=[gridX[i-1],gridX[i]],[back,front]=[gridY[j-1],gridY[j]];
    const x=(left+right)/2,y=(back+front)/2;
    let rest=rect(left,back,right,front);
    const intersections=[];
    for(const [a,b] of discEdges){
      const distances=rest.map(p=>cross(b[0]-a[0],b[1]-a[1],p[0]-a[0],p[1]-a[1]));
      if(Math.max(...distances)<=1e-8){footprint(rest,false,x,y);rest=[];break}
      if(Math.min(...distances)<-1e-8)intersections.push([a,b]);
    }
    // Collect the disjoint outside pieces and carry the still-inside piece forward.
    for(const [a,b] of intersections){
      if(!rest.length)break;
      const [inside,outside]=splitPolygon(rest,a,b);
      footprint(outside,false,x,y);rest=inside;
    }
    footprint(rest,true,x,y);
  }

  // Split collinear edges at junctions before testing face/footprint adjacency.
  function partitionEdges(polygons,partFor=()=>0){
    const lines=new Map(),precision=v=>Math.round(v*1e6);
    for(const owner of polygons)for(const [a,b] of polyEdges(owner.points,true)){
      const delta=b.map((v,i)=>v-a[i]),length=Math.hypot(...delta);
      if(length<1e-6)continue;
      const sign=Math.sign(delta.find(v=>Math.abs(v)>1e-7));
      const dir=delta.map(v=>sign*v/length),ta=dot(a,dir),tb=dot(b,dir);
      const origin=a.map((v,i)=>v-dir[i]*ta),part=partFor(owner);
      const key=part+'|'+[...dir,...origin].map(precision).join(',');
      if(!lines.has(key))lines.set(key,{part,positions:new Map(),intervals:[]});
      const group=lines.get(key),start=precision(Math.min(ta,tb)),end=precision(Math.max(ta,tb));
      group.positions.set(precision(ta),a);group.positions.set(precision(tb),b);
      group.intervals.push({start,end,owner});
    }
    const segments=[];
    for(const [key,{part,positions,intervals}] of lines){
      const sorted=[...positions.keys()].sort((a,b)=>a-b);
      for(let i=1;i<sorted.length;i++){
        const [lo,hi]=[sorted[i-1],sorted[i]];
        if(hi-lo<=2)continue;
        const adjacent=intervals.filter(({start,end})=>start<=lo&&end>=hi).map(({owner})=>owner);
        if(adjacent.length)segments.push({key,a:positions.get(lo),b:positions.get(hi),part,adjacent});
      }
    }
    return segments;
  }
  const footprintEdges=partitionEdges(footprints);
  function solidAt({x,y,inside},z){
    if(z>=F&&Math.abs(x)<P&&Math.abs(y)<Q)return false;
    if(z>N&&z<T&&Math.abs(x)<M)return false;
    if(z<B)return Math.abs(x)<X&&Math.abs(y)<Y;
    return inside||(z>J&&z<K&&Math.abs(x)<U&&Math.abs(y)<V);
  }
  function buildMesh(mode){
    const partFor=({x,y})=>mode===1?Number(y>0):mode===2?Number(x<0&&y>0):0;
    const faces=[];
    const face=(points,normal,part,cut=false,curved=false)=>faces.push({points,normal,part,cut,curved});
    for(let i=1;i<levels.length;i++){
      const [low,high]=[levels[i-1],levels[i]],current=(low+high)/2;
      const below=i===1?-1:(levels[i-2]+low)/2,above=i===levels.length-1?H+1:(high+levels[i+1])/2;
      const occupied=new Set(footprints.filter(cell=>solidAt(cell,current)));
      for(const cell of occupied){
        const part=partFor(cell);
        for(const [adjacent,z,sign] of [[below,low,-1],[above,high,1]]){
          if(adjacent<0||adjacent>H||!solidAt(cell,adjacent))face(cell.points.map(([x,y])=>[x,y,z]),[0,0,sign],part);
        }
      }
      for(const {a,b,adjacent} of footprintEdges){
        const filled=adjacent.filter(cell=>occupied.has(cell));
        if(!filled.length)continue;
        const cut=filled.length===2&&partFor(filled[0])!==partFor(filled[1]);
        if(filled.length===2&&!cut)continue;
        const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);
        const curved=Math.abs(dx)>1e-6&&Math.abs(dy)>1e-6;
        if(curved&&!filled[0].inside)continue;
        for(const cell of filled){
          const normal=curved?[(a[0]+b[0])/(2*R),(a[1]+b[1])/(2*R),0]:
            Math.abs(dx)<1e-6?[Math.sign(a[0]-cell.x),0,0]:[0,Math.sign(a[1]-cell.y),0];
          face([[...a,low],[...b,low],[...b,high],[...a,high]],normal,partFor(cell),cut,curved);
        }
      }
    }
    const edges=[];
    for(const segment of partitionEdges(faces,face=>face.part)){
      const {adjacent}=segment;
      if(!adjacent.some((face,i)=>i>0&&!(face.curved&&adjacent[0].curved)&&Math.abs(dot(face.normal,adjacent[0].normal))<.999))continue;
      const previous=edges.at(-1);
      if(previous?.key===segment.key&&previous.b.every((value,i)=>Math.abs(value-segment.a[i])<1e-6)){
        previous.b=segment.b;
        previous.adjacent=[...new Set([...previous.adjacent,...adjacent])];
      }else edges.push(segment);
    }
    const vertices=[...new Map(faces.flatMap(({points,part})=>points.map(point=>[part+'|'+point.join(','),{point,part}]))).values()];
    return {faces,edges,vertices};
  }
  const modelClosed=buildMesh(0),modelOpen={1:buildMesh(1),2:buildMesh(2)};

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

  function cylinderSilhouettes(model){
    const facing=face=>-face.normal[0]+face.normal[1];
    return partitionEdges(model.faces.filter(face=>face.curved&&face.part===0),face=>face.part)
      .filter(({adjacent})=>adjacent.length===2&&facing(adjacent[0])*facing(adjacent[1])<0);
  }
  const axonSilhouettes={full:cylinderSilhouettes(modelOpen[1]),half:cylinderSilhouettes(modelOpen[2])};
  let axonViews;
  function render2D(){
    scene.innerHTML=givenViews()+axonViews.full.drawing+axonViews.half.drawing+drawResults()+drawMeasurements();
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
    axonViews={
      full:createSectionAxon(modelOpen[1],layout.axons.full,'A—A 剖开后的轴测图',axonSilhouettes.full),
      half:createSectionAxon(modelOpen[2],layout.axons.half,'B—B 剖开后的轴测图',axonSilhouettes.half)
    };
    render2D();
  }
  const measureDuration=850,drawDuration=1000;
  function phaseDuration(index){
    const item=operations[step]?.[Math.floor(index/2)];
    if(index%2&&item?.edge)return drawDuration;
    return item?.sample||item?.source||item?.target||step===1?measureDuration:0;
  }
  function setStep(value){
    clearTimeout(stepTimer);
    step=Math.max(0,Math.min(steps.length-1,Number(value)));phase=0;
    if(step<=2)setCut(1);
    if(step===3)setCut(2);
    const count=(operations[step]?.length??0)*2;
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
    button.textContent=index===0?'准备 · 读题':`${String(index).padStart(2,'0')} ${item.short}`;
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
  const defaultYaw={1:-.63,2:-1.2},defaultPitch=.53;
  const displacement={1:[0,218],2:[-140,188]};
  const camera={cut:1,opening:0,yaw:defaultYaw[1],pitch:defaultPitch,zoom:1,x:0,y:0,mode:'rotate'};
  const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
  let modelDrag=null,pinchDistance=0,animation=0,animationTarget=null,showPlanes=false,drawFrame=0;
  const pointers=new Map();
  function modelProjection(width,height,mesh=camera.opening>0?modelOpen[camera.cut]:modelClosed){
    const [moveX,moveY]=displacement[camera.cut].map(value=>camera.opening*value);
    const cy=Math.cos(camera.yaw),sy=Math.sin(camera.yaw),cp=Math.cos(camera.pitch),sp=Math.sin(camera.pitch);
    const rotated=([x,y,z],part)=>{
      const dx=x+part*moveX,dy=y+part*moveY,dz=z;
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
    if(cut)return [245,236,216];
    if(normal[2])return normal[2]>0?[205,230,225]:[139,178,175];
    const amount=normal[0]*.62+normal[1]*.37;
    const shade=curved?Math.round(30*amount):Math.round(22*amount);
    return [164+shade,202+shade,198+shade];
  }
  const hatchColor=[125,116,100];
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
        if(source.cut){
          const coordinate=p=>(source.normal[0]?p[1]+p[2]:p[0]-p[2])+U+Y+H;
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
  const plane1=[[-U-14,0,-8],[U+14,0,-8],[U+14,0,H+15],[-U-14,0,H+15]];
  const quarterPlanes=[[[0,0,-8],[0,Y+14,-8],[0,Y+14,H+15],[0,0,H+15]],
    [[-U-14,0,-8],[0,0,-8],[0,0,H+15],[-U-14,0,H+15]]];
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
    const mesh=camera.opening>0?modelOpen[camera.cut]:modelClosed;
    const project=modelProjection(width,height,mesh);
    const faces=projectSurfaces(mesh.faces,project);
    rasterFaces(faces,ratio);
    ctx.setTransform(ratio,0,0,ratio,0,0);
    ctx.lineCap='butt';ctx.lineWidth=1.26;ctx.strokeStyle='#3c6565';
    strokeSegments(mesh.edges,faces,project);
    if(showPlanes){
      ctx.setLineDash([5,4]);ctx.strokeStyle='#198681';ctx.lineWidth=1.1;
      const planes=camera.cut===1?[plane1]:quarterPlanes;
      const edges=planes.flatMap(plane=>plane.map((a,index)=>({a,b:plane[(index+1)%4],part:0,adjacent:[]})));
      strokeSegments(edges,faces,project);ctx.setLineDash([]);
    }
    if(camera.opening>.035){
      ctx.fillStyle='#0b6f6b';ctx.font='bold 12px Microsoft YaHei';
      ctx.fillText(camera.cut===1?'A—A 全剖':'B—B 半剖',10,19);
    }
  }
  function requestDraw(){
    if(!drawFrame)drawFrame=requestAnimationFrame(()=>{drawFrame=0;drawModel()});
  }
  function updateModelControls(){
    $('openRange').value=String(Math.round(camera.opening*100));
    $('openValue').textContent=camera.opening===0?'合拢':camera.opening===1?'剖开':`${Math.round(camera.opening*100)}%`;
    $('openModel').textContent=animationTarget!==null?'暂停动画':camera.opening>.5?'播放合拢动画':'播放剖开动画';
    $('cutFull').setAttribute('aria-pressed',String(camera.cut===1));
    $('cutHalf').setAttribute('aria-pressed',String(camera.cut===2));
  }
  function stopModel(){animation++;animationTarget=null;showPlanes=false}
  function resetCamera(){
    Object.assign(camera,{yaw:defaultYaw[camera.cut],pitch:defaultPitch,zoom:1,x:0,y:0});
  }
  function resetModel(){stopModel();camera.opening=0;resetCamera();updateModelControls();requestDraw()}
  function setCut(cut){
    if(camera.cut===cut)return;
    camera.cut=cut;resetModel();
  }
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
  $('cutFull').addEventListener('click',()=>setCut(1));
  $('cutHalf').addEventListener('click',()=>setCut(2));
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
