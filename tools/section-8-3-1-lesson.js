  function createLesson(g){
    const {length,halfWidth:w,division:u,fullHeight:h,endHeight:e,ledgeHeight:t,
      slopeFoot:f,slopeCrest:c,upperStart:start,transition:mid,upperEnd:end,stations}=g;
    const high=x=>x>start&&x<end?h:e;
    const low=(x,y)=>x<mid?f+(y+w)*(c-f)/(u+w):Math.min(high(x),t);
    const views=['a','b','c'],numbers=['1—1','2—2','3—3'];
    const sections=stations.map((x,mode)=>({
      id:views[mode],mode,drawAt:mode+2,label:numbers[mode]+' 断面图',caption:[0,-33],
      loops:[pointsToEdges([[-w,0],[w,0],[w,high(x)],[u,high(x)],[u,low(x,u)],[-w,low(x,-w)]])],
      behind:[],axes:[]
    }));
    function outline(section,x){
      const top=high(x),foot=low(x,-w),crest=low(x,u),id=section.id;
      const across=(a,b,z)=>dimension(mark('side',[-a,z],[-b,z]),mark(id,[a,z],[b,z]),
        [[x,a,z],[x,b,z]]);
      const rise=(y,a,b)=>dimension(mark('front',[x,a],[x,b]),mark(id,[y,a],[y,b]),
        [[x,y,a],[x,y,b]]);
      const add=(edge,...marks)=>operation(section,edge,...marks);
      return [
        add(horizontal(0,-w,w),across(-w,w,0)),
        add(vertical(-w,0,foot),rise(-w,0,foot)),
        add(vertical(w,0,top),rise(w,0,top)),
        add(horizontal(top,u,w),across(u,w,top)),
        add(vertical(u,top,crest),rise(u,top,crest)),
        add(segment([-w,foot],[u,crest]))
      ];
    }
    const shared='先用细实线绘制所有轮廓线。沿三图共用的底部基准，从侧面投影量取梁的全宽，画底边。';
    const steps=[
      {title:'读题',action:'读出楼梯平台梁的立面和侧面。沿梁长辨认低梁端、斜托段及水平挑边段。梁宽和宽度分界从侧面量取，高度由各剖切位置的立面确定。'},
      {title:'判定剖切位置和视向',action:'从立面左端向右定位三个剖切面。1—1 切在左端低梁段，2—2 切在带斜托的高梁段，3—3 切在带水平挑边的高梁段。由右向左观察，三个移出断面画在相应标记的正下方，轴测图的断面朝右下。'},
      {title:'绘制 1—1 断面轮廓线',mode:0,operations:outline(sections[0],stations[0]),
        action:shared+'从左端向上量坡脚，从右端向上量低梁端总高。从侧面量取上部宽度，画出顶边，再从内端向下定位坡顶，连接坡脚与坡顶。'},
      {title:'绘制 2—2 断面轮廓线',mode:1,operations:outline(sections[1],stations[1]),
        action:shared+'从底边左端定位坡脚，右端量取高梁段总高。由顶边内端向下定位坡顶，再连接两个坡面端点。核对斜托与 1—1 相同。'},
      {title:'绘制 3—3 断面轮廓线',mode:2,operations:outline(sections[2],stations[2]),
        action:shared+'从底边左、右两端分别量取水平挑边高度与高梁段总高。画顶边和台阶竖边，最后从左向右连接至台阶脚，形成水平挑边。'},
      {title:'填充钢筋混凝土图例',action:'在三个封闭断面内铺设连续、等距的 45° 细实线，散布小三角和小点。'},
      {title:'加粗结果并核对',action:'基本线宽 b = 0.8 mm。三图中实际切到的轮廓均用 0.7b 中粗实线（0.56 mm）。核对断面在各自剖切位置正下方、底边和图名平齐，清除辅助线。'}
    ];
    function given(step){
      let out=viewPath('front',[[0,0],[length,0],[length,e],[end,e],[end,h],[start,h],[start,e],[0,e]],'given',true)+
        viewPath('front',[[0,f],[mid,f],[mid,t],[end,t]],'given')+
        viewLine('front',[0,c],[mid,c],'given');
      out+=viewPath('side',[[-w,0],[w,0],[w,t],[-u,t],[-u,h],[-w,h]],'given',true)+
        viewPath('side',[[-u,t],[-u,c],[w,f]],'given')+
        viewLine('side',[-w,e],[-u,e],'given')+viewLine('side',[-u,e],[w,e],'hidden-line');
      for(const [i,x] of stations.entries()){
        const number=String(i+1);
        out+=glyph('front',[[x,h+21],[x,h+46]],number,[x-20,h+27])+
          glyph('front',[[x,-21],[x,-46]],number,[x-20,-39]);
        if(step===1)out+=viewLine('front',[x,-19],[x,h+19],'axis-line cut-active');
        if(step===i+2){
          const a=viewPoint('front',[x,-46]),b=viewPoint(views[i],[0,high(x)]);
          out+=line(a,[b[0],b[1]-8],'guide');
        }
      }
      if(step>=2&&step<=4)
        out+=viewLine(views[0],[-w-12,0],[stations[2]-stations[0]+w+12,0],'guide');
      return out;
    }
    const cells=cutCells(cellsOnGrid([-w,u,w],[0,f,c,e,t,h]),[-w,f],[u,c]);
    for(const cell of cells)[cell.u,cell.v]=centerOf(cell.points);
    const levels=[0,...stations,start,mid,end,length].sort((a,b)=>a-b);
    const mesh=mode=>finishMesh(sweep(cells,levels,({u:y,v:z},x)=>z<(y<u?low(x,y):high(x)),
      (_,x)=>Number(mode!==null&&x>stations[mode]),toX));
    const cuts=stations.map((x,i)=>({label:numbers[i],modelLabel:numbers[i]+' 断面',
      planes:planeOutline([[x,-w-14,-9],[x,w+14,-9],[x,w+14,h+11],[x,-w-14,h+11]]),
      move:[112,100,0],eye:[1,-1,1]}));
    function layout(size,front,side,base,axons){
      const origins={front,side};
      stations.forEach((x,i)=>{origins[views[i]]=[front[0]+x,base]});
      return {size,views:origins,axons};
    }
    const wide=layout([1130,755],[83,217],[1038,217],440,
      [[30,540,233,688],[262,540,574,688],[615,513,1092,688]]);
    const narrow=layout([1130,830],[83,234],[1038,234],476,
      [[31,585,273,754],[290,585,591,754],[610,555,1092,754]]);
    const modelCamera={yaw:.76+Math.PI/2,rightSign:-1};
    return {steps,given,sections,cuts,mesh,wide,narrow,concrete:true,modelCamera};
  }
