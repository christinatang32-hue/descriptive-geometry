  const cross=(ax,ay,bx,by)=>ax*by-ay*bx;
  const dot=(a,b)=>a.reduce((sum,value,i)=>sum+value*b[i],0);
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
  // Split collinear edges at junctions before testing face/footprint adjacency.
  function partitionEdges(polygons,partFor=()=>0){
    const lines=[],precision=v=>Math.round(v*1e5);
    for(const owner of polygons)for(const [a,b] of polyEdges(owner.points,true)){
      const delta=b.map((v,i)=>v-a[i]),length=Math.hypot(...delta);
      if(length<1e-6)continue;
      const sign=Math.sign(delta.find(v=>Math.abs(v)>1e-7));
      const dir=delta.map(v=>sign*v/length),part=partFor(owner);
      const offset=dot(a,dir),origin=a.map((v,i)=>v-dir[i]*offset);
      let group=lines.find(line=>line.part===part&&line.dir.every((d,i)=>Math.abs(d-dir[i])<5e-6)&&
        line.origin.every((value,i)=>Math.abs(value-origin[i])<.001));
      if(!group){
        group={key:lines.length,part,dir,origin,positions:new Map(),intervals:[]};
        lines.push(group);
      }
      const ta=dot(a,group.dir),tb=dot(b,group.dir);
      const start=precision(Math.min(ta,tb)),end=precision(Math.max(ta,tb));
      group.positions.set(precision(ta),a);group.positions.set(precision(tb),b);
      group.intervals.push({start,end,owner});
    }
    const segments=[];
    for(const {key,part,positions,intervals} of lines){
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

  function cellsOnGrid(xs,ys){
    return xs.slice(1).flatMap((right,i)=>ys.slice(1).map((top,j)=>
      ({points:rect(xs[i],ys[j],right,top),u:(xs[i]+right)/2,v:(ys[j]+top)/2})));
  }
  // Keep circular facets aligned at both axes and at every intersected grid line.
  function circularPartition(cells,cu,cv,r,xs,ys,tag,extra=[]){
    const tau=2*Math.PI;
    const angles=Array.from({length:64},(_,i)=>tau*i/64).concat(extra);
    for(const x of xs){
      const f=(x-cu)/r;
      if(Math.abs(f)<1){const t=Math.acos(f);angles.push(t,tau-t)}
    }
    for(const y of ys){
      const f=(y-cv)/r;
      if(Math.abs(f)<1){const t=Math.asin(f);angles.push((t+tau)%tau,Math.PI-t)}
    }
    angles.sort((a,b)=>a-b);
    const ring=angles.filter((t,i)=>!i||t-angles[i-1]>1e-8)
      .map(t=>[cu+r*Math.cos(t),cv+r*Math.sin(t)]);
    const sides=polyEdges(ring,true);
    return cells.flatMap(cell=>{
      let rest=cell.points;
      const pieces=[],intersections=[];
      for(const [a,b] of sides){
        const distances=rest.map(p=>cross(b[0]-a[0],b[1]-a[1],p[0]-a[0],p[1]-a[1]));
        if(Math.max(...distances)<=1e-8)return [{...cell,[tag]:false}];
        if(Math.min(...distances)<-1e-8)intersections.push([a,b]);
      }
      for(const [a,b] of intersections){
        if(!rest.length)break;
        const [inner,outer]=splitPolygon(rest,a,b);
        if(outer.length)pieces.push({...cell,points:outer,[tag]:false});
        rest=inner;
      }
      if(rest.length)pieces.push({...cell,points:rest,[tag]:true});
      return pieces;
    });
  }

  const centerOf=points=>points.reduce(([x,y],p)=>[x+p[0]/points.length,y+p[1]/points.length],[0,0]);
  function cutCells(cells,a,b){
    return cells.flatMap(cell=>splitPolygon(cell.points,a,b).filter(points=>points.length).map(points=>({...cell,points})));
  }
  const toZ=(u,v,t)=>[u,v,t],toY=(u,v,t)=>[u,t,v],toX=(u,v,t)=>[t,u,v];

  // Build each surface from one convex cross-section cell and its adjacent material.
  function sweep(cells,levels,occupied,partFor,map,{cap=()=>true,side=()=>true,curve=()=>false}={}){
    const footprints=partitionEdges(cells);
    const faces=[];
    function add(points,normal,part,cut=false,curved=false){
      faces.push({points,normal,part,cut,curved});
    }
    for(let i=1;i<levels.length;i++){
      const low=levels[i-1],high=levels[i],mid=(low+high)/2;
      const filled=new Set(cells.filter(cell=>occupied(cell,mid)));
      for(const cell of filled){
        const part=partFor(cell,mid);
        const before=i>1?(levels[i-2]+low)/2:null,after=i<levels.length-1?(high+levels[i+1])/2:null;
        for(const [level,against,sign] of [[low,before,-1],[high,after,1]]){
          const neighbor=against!==null&&occupied(cell,against);
          const cut=neighbor&&partFor(cell,against)!==part;
          if(cut||(!neighbor&&cap(cell,level,sign)))add(cell.points.map(([u,v])=>map(u,v,level)),map(0,0,sign),part,cut);
        }
      }
      for(const {a,b,adjacent} of footprints){
        const incident=adjacent.filter(cell=>filled.has(cell));
        const cut=incident.length===2&&partFor(incident[0],mid)!==partFor(incident[1],mid);
        if(!incident.length||(incident.length===2&&!cut)||!side(a,b,mid))continue;
        const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);
        for(const cell of incident){
          const [u,v]=centerOf(cell.points),sign=Math.sign(cross(dx,dy,u-a[0],v-a[1]));
          const normal=map(sign*dy/length,-sign*dx/length,0);
          add([map(...a,low),map(...b,low),map(...b,high),map(...a,high)],normal,partFor(cell,mid),cut,!cut&&curve(cell,adjacent));
        }
      }
    }
    return faces;
  }
  function finishMesh(faces){
    const edges=[],smooth=[];
    for(const edge of partitionEdges(faces,face=>face.part)){
      const [first,second]=edge.adjacent;
      if(!second)continue;
      if(first.curved&&second.curved){smooth.push(edge);continue}
      if(Math.abs(dot(first.normal,second.normal))>.999)continue;
      const last=edges.at(-1);
      if(last?.key===edge.key&&last.b.every((value,i)=>Math.abs(value-edge.a[i])<1e-6)){
        last.b=edge.b;
        last.adjacent=[...new Set([...last.adjacent,...edge.adjacent])];
      }else edges.push(edge);
    }
    const vertices=[...new Map(faces.flatMap(({points,part})=>
      points.map(point=>[part+'|'+point.join(','),{point,part}]))).values()];
    return {faces,edges,smooth,vertices};
  }
  function silhouettes(mesh,direction){
    return mesh.smooth.filter(({adjacent:[a,b]})=>dot(a.normal,direction)*dot(b.normal,direction)<0);
  }
