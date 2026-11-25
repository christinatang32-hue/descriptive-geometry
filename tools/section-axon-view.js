  // Use the same open mesh and edge-occlusion calculation as the rotating model.
  function createSectionAxon(model,[left,top,right,bottom],label,silhouettes=[]){
    const iso=([x,y,z])=>[x+y,(y-x-2*z)/Math.sqrt(3),-x+y+z];
    const faces=model.faces.filter(face=>face.part===0);
    const vertices=model.vertices.filter(vertex=>vertex.part===0).map(({point})=>iso(point));
    const xs=vertices.map(point=>point[0]),ys=vertices.map(point=>point[1]);
    const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
    const scale=Math.min((right-left)/(maxX-minX),(bottom-top)/(maxY-minY));
    const centerX=(left+right)/2,centerY=(top+bottom)/2;
    const project=point=>{
      const [u,v,depth]=iso(point);
      return [centerX+(u-(minX+maxX)/2)*scale,centerY+(v-(minY+maxY)/2)*scale,depth];
    };
    const surfaces=projectSurfaces(faces,project);
    const edges=model.edges.filter(edge=>edge.part===0).concat(silhouettes);
    const cutPath=surfaces.filter(face=>face.source.cut).map(face=>trace(face.points,true)).join(' ');
    const edgePath=edges.flatMap(edge=>visibleSegments(edge,surfaces,project))
      .filter(([a,b])=>Math.hypot(b[0]-a[0],b[1]-a[1])>.05)
      .map(segment=>trace(segment)).join(' ');
    const drawing=`<g class="axon-view"><title>${label}</title>`+
      path(cutPath,'axon-cut')+path(edgePath,'given axon-edge')+
      `<text class="view-title" x="${centerX}" y="${bottom+23}" text-anchor="middle">${label}</text></g>`;
    return {drawing,project};
  }

  function axonMeasurement(view,[a,b],side=1){
    const p=view.project(a),q=view.project(b);
    return `<g class="axon-measure">${line(p,q,'measure-edge')}${brace(p,q,side)}</g>`;
  }

  function axonPoint(view,point){
    const [x,y]=view.project(point);
    return `<circle class="transfer-point axon-point" cx="${n(x)}" cy="${n(y)}" r="3"/>`;
  }
