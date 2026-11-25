  // Animate the endpoint in drawing coordinates so zoom cannot change the traced fraction.
  let traceFrame=0,traceStage=-1,tracePhase=-1,traceStarted=0;
  function tracedLine(a,b,cls){
    const [x,y]=a.map(n);
    return `<line class="${cls}" x1="${x}" y1="${y}" x2="${x}" y2="${y}"
      data-end-x="${n(b[0])}" data-end-y="${n(b[1])}"/>`;
  }
  function startLineTrace(){
    if(traceFrame)cancelAnimationFrame(traceFrame);
    const line=scene.querySelector('.drawing-edge');
    if(!line){traceStage=-1;return}
    if(traceStage!==step||tracePhase!==phase){
      traceStage=step;
      tracePhase=phase;
      traceStarted=performance.now();
    }
    const x=line.x1.baseVal.value,y=line.y1.baseVal.value;
    const dx=Number(line.dataset.endX)-x,dy=Number(line.dataset.endY)-y;
    function draw(now){
      const progress=Math.max(0,Math.min(1,(now-traceStarted)/drawDuration));
      line.setAttribute('x2',x+dx*progress);
      line.setAttribute('y2',y+dy*progress);
      traceFrame=progress<1?requestAnimationFrame(draw):0;
    }
    draw(performance.now());
  }
