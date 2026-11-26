  // Animate the endpoint in drawing coordinates so zoom cannot change the traced fraction.
  let traceFrame=0,traceStage=-1,tracePhase=-1,traceStarted=0;
  function tracedLine(a,b,cls){
    const [x,y]=a.map(n);
    return `<line class="${cls}" x1="${x}" y1="${y}" x2="${x}" y2="${y}"
      data-end-x="${n(b[0])}" data-end-y="${n(b[1])}"/>`;
  }
  function tracedCurve([x,y],radius,start,sweep,cls){
    return `<path class="${cls}" data-arc="${x} ${y} ${radius} ${start} ${sweep}"/>`;
  }
  function traceCurvePath(element,progress){
    const [x,y,r,start,sweep]=element.dataset.arc.split(' ').map(Number);
    const point=angle=>xy([x+r*Math.cos(angle),y+r*Math.sin(angle)]);
    const travel=sweep*progress;
    const command=(angle,large)=>`A${r} ${r} 0 ${large} ${sweep>0?1:0} ${point(angle)}`;
    const curve=Math.abs(travel)>=2*Math.PI-1e-6?
      command(start+travel/2,0)+command(start,0):command(start+travel,Math.abs(travel)>Math.PI?1:0);
    element.setAttribute('d','M'+point(start)+curve);
  }
  function startLineTrace(){
    if(traceFrame)cancelAnimationFrame(traceFrame);
    const edge=scene.querySelector('.drawing-edge');
    if(!edge){traceStage=-1;return}
    if(traceStage!==step||tracePhase!==phase){
      traceStage=step;
      tracePhase=phase;
      traceStarted=performance.now();
    }
    const isLine=edge.localName==='line';
    const x=isLine?edge.x1.baseVal.value:0,y=isLine?edge.y1.baseVal.value:0;
    const dx=Number(edge.dataset.endX)-x,dy=Number(edge.dataset.endY)-y;
    function draw(now){
      const progress=Math.max(0,Math.min(1,(now-traceStarted)/drawDuration));
      if(isLine){
        edge.setAttribute('x2',x+dx*progress);
        edge.setAttribute('y2',y+dy*progress);
      }else if(edge.dataset.arc)traceCurvePath(edge,progress);
      traceFrame=progress<1?requestAnimationFrame(draw):0;
    }
    draw(performance.now());
  }
