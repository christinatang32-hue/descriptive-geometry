  function createLesson(g){
    const {length,halfWidth:w,beamHalfWidth:b,top:h,slabBottom:s,crossBottom:t,mainBottom:m,
      columns,crossBeams,stations}=g;
    const tee=[[-b,m],[b,m],[b,s],[w,s],[w,h],[-w,h],[-w,s],[-b,s]];
    const sections=stations.map((_,i)=>({
      id:['a','b'][i],mode:i,drawAt:i+2,label:i===0?'1—1 剖面图':'2—2 断面图',
      caption:[0,i===0?-33:m-33],loops:[pointsToEdges(tee)],behind:[],axes:[]
    }));
    const [first,second]=sections;
    first.behind.push(
      horizontal(t,-w,-b),horizontal(t,b,w),vertical(-w,s,t),vertical(w,s,t),
      horizontal(0,-b,b),vertical(-b,m,0),vertical(b,m,0)
    );
    function outline(section,x){
      const {id}=section;
      const width=(a,b,z)=>dimension(mark('plan',[x,-a],[x,-b]),
        mark(id,[a,z],[b,z]),[[x,-a,z],[x,-b,z]]);
      const height=(y,a,b,sourceX=x)=>dimension(mark('front',[sourceX,a],[sourceX,b]),
        mark(id,[y,a],[y,b]),[[sourceX,-y,a],[sourceX,-y,b]]);
      const add=(edge,...marks)=>operation(section,edge,...marks);
      const edges=[
        add(horizontal(m,-b,b),height(-b,h,m),width(-b,b,m)),
        add(vertical(-b,m,s),height(-b,m,s)),
        add(vertical(b,m,s),height(b,m,s)),
        add(horizontal(s,-w,-b),width(-b,-w,s)),
        add(horizontal(s,b,w),width(b,w,s)),
        add(vertical(-w,s,h),height(-w,s,h)),
        add(vertical(w,s,h),height(w,s,h)),
        add(horizontal(h,-w,w),width(-w,w,h))
      ];
      if(section===first){
        const crossing=(crossBeams[1][0]+crossBeams[1][1])/2,column=(columns[1][0]+columns[1][1])/2;
        edges.push(
          add(first.behind[0],height(-w,s,t,crossing)),
          add(first.behind[1],height(w,s,t,crossing)),
          add(first.behind[2]),add(first.behind[3]),
          add(first.behind[4],height(-b,m,0,column)),
          add(first.behind[5]),add(first.behind[6])
        );
      }
      return edges;
    }
    const shared='先用细实线绘制所有轮廓线。以板顶高程为基准，确定纵梁底的位置。由水平投影量取梁宽，作梁底，从两端向上画梁侧，接着画两侧板底、板端和板顶，闭合 T 形切面。';
    const steps=[
      {title:'读题',action:'结合立面和水平投影辨认楼板、贯通的纵梁、三道横梁和两根柱。高度从立面量取，楼板、纵梁和柱的横向宽度由水平投影确定。'},
      {title:'判定剖切位置和视向',action:'1—1 按带方向的剖切符号向右看，切到楼板和纵梁，并显示后方可见的横梁和柱。2—2 以短线及编号标示截取位置，绘出该处实际切到的板和梁。'},
      {title:'绘制 1—1 剖面轮廓线',mode:0,operations:outline(first,stations[0]),
        action:shared+'再从立面量取后方横梁的梁底标高、柱底标高，补画两侧横梁的底边和端边，以及纵梁下方可见的柱轮廓。'},
      {title:'绘制 2—2 断面轮廓线',mode:1,operations:outline(second,stations[1]),
        action:shared+'在 1—1 右侧完成移出断面，核对两个板顶高平齐。'},
      {title:'填充钢筋混凝土图例',action:'按照参考图采用钢筋混凝土图例。两个 T 形切面内画连续、等距的 45° 细实线，并散布小三角和小点。1—1 中切面后方可见的横梁和柱留白。'},
      {title:'加粗结果并核对',action:'基本线宽 b = 0.8 mm。用 0.7b 中粗实线（0.56 mm）描出实际切到的轮廓，用 0.5b 中实线（0.40 mm）描出 1—1 切面后的可见轮廓。核对两图的板顶和立面板顶高平齐。'}
    ];
    function given(step){
      const [[leftA,rightA],[leftB,rightB]]=columns;
      let out=viewPath('front',[[0,h],[length,h],[length,m],[rightB,m],[rightB,0],[leftB,0],[leftB,m],
        [rightA,m],[rightA,0],[leftA,0],[leftA,m],[0,m]],'given',true);
      let previous=0;
      for(const [left,right] of crossBeams){
        out+=viewPath('front',[[previous,s],[left,s],[left,t],[right,t],[right,s]],'given');
        previous=right;
      }
      out+=viewLine('front',[previous,s],[length,s],'given');
      out+=viewPath('plan',rect(0,-w,length,w),'given',true);
      for(const y of [-b,b])out+=viewLine('plan',[0,y],[length,y],'hidden-line');
      for(const x of crossBeams.flat()){
        out+=viewLine('plan',[x,-w],[x,-b],'hidden-line');
        out+=viewLine('plan',[x,b],[x,w],'hidden-line');
      }
      for(const x of columns.flat())out+=viewLine('plan',[x,-b],[x,b],'hidden-line');
      const [a,d]=stations;
      out+=glyph('front',[[a,h+17],[a,h+42],[19+a,h+42]],'1',[a+25,h+36])+
        glyph('front',[[a,-17],[a,-42],[19+a,-42]],'1',[a+25,-48])+
        glyph('front',[[d,h+17],[d,h+42]],'2',[d+8,h+24])+
        glyph('front',[[d,-17],[d,-42]],'2',[d+8,-36]);
      if(step===1)for(const x of stations)out+=viewLine('front',[x,-15],[x,h+15],'axis-line cut-active');
      if(step===2||step===3){
        const a=viewPoint('front',[length,h]),b=viewPoint(sections[step-2].id,[-w,h]);
        out+=line(a,b,'guide');
      }
      return out;
    }
    const cells=cellsOnGrid([-w,-b,b,w],[0,m,t,s,h]);
    const levels=[0,...stations,...columns.flat(),...crossBeams.flat(),length].sort((a,b)=>a-b);
    const within=(x,intervals)=>intervals.some(([a,b])=>x>a&&x<b);
    const mesh=mode=>finishMesh(sweep(cells,levels,({u,v},x)=>
      v>s||(Math.abs(u)<b&&(v>m||within(x,columns)))||(v>t&&within(x,crossBeams)),
      (_,x)=>Number(mode!==null&&x<stations[mode]),toX));
    const cuts=stations.map((x,i)=>({label:i===0?'1—1':'2—2',modelLabel:i===0?'1—1 全剖':'2—2 断面',
      planes:planeOutline([[x,-w-15,-11],[x,w+15,-11],[x,w+15,h+13],[x,-w-15,h+13]]),move:[-165,-145,30]}));
    const wide={size:[1284,775],views:{front:[60,359],plan:[60,569],a:[887,359],b:[1140,359]},
      axons:[[782,429,1012,675],[1027,389,1258,675]]};
    const narrow={size:[1284,875],views:{front:[58,370],plan:[58,625],a:[882,370],b:[1139,370]},
      axons:[[777,453,1016,773],[1025,409,1258,773]]};
    return {steps,given,sections,cuts,mesh,wide,narrow,concrete:true};
  }
