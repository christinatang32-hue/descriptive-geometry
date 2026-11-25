  function createLesson(g){
    const {halfWidth:w,height:h,rearHeight:b,rearDepth:a,shoulderDepth:s,depth:d,
      slotHalfWidth:k,innerFoot:f,innerTop:t,breakHeight:e}=g;
    const cut=rect(0,0,a,b);
    const section={id:'a',mode:0,drawAt:2,label:'A—A 剖面图',caption:[d/2,-34],
      loops:[pointsToEdges(cut)],axes:[],
      behind:[horizontal(0,a,d),vertical(a,b,h),horizontal(h,a,d),vertical(s,h,0),
        vertical(d,h,0),horizontal(e,s,d)]};
    const add=(edge,...marks)=>operation(section,edge,...marks);
    const depth=(from,to,z)=>dimension(mark('plan',[w,from],[w,to],-1),
      mark('a',[from,z],[to,z]),[[0,from,z],[0,to,z]]);
    const rise=(y,from,to,x)=>dimension(mark('front',[x,from],[x,to]),
      mark('a',[y,from],[y,to]),[[x,y,from],[x,y,to]]);
    const steps=[
      {title:'读题',action:'在两个投影中找出后壁、凸肩与前伸的两条斜边侧壁，认清中央缺口。'},
      {title:'判定剖切位置和视向',action:'A—A 为通过中央缺口的竖直剖切面。沿剖切标记的方向看，剖切面切到后壁。凸肩、前侧壁和坡折棱是剖切面后的可见轮廓。'},
      {title:'绘制轮廓线',operations:[
        add(horizontal(0,0,d),depth(0,d,0)),
        add(vertical(0,0,b),rise(0,0,b,0)),
        add(horizontal(b,0,a),depth(0,a,b)),
        add(vertical(a,b,h),rise(a,b,h,k)),
        add(horizontal(h,a,d),depth(a,d,h)),
        add(vertical(d,h,0)),
        add(vertical(a,b,0)),
        add(vertical(s,h,0),depth(a,s,h)),
        add(horizontal(e,s,d),rise(s,0,e,f))
      ],action:'先用细实线绘制所有轮廓。先作底边，从左端向上量取后壁高度，再向右量取后壁厚度。由台阶端点向上量取高差，依次画顶边和右侧竖线。最后量取凸肩的进深和坡折高度，随即补画内边线。'},
      {title:'填充通用材料图例',action:'仅在左侧被剖切面切到的后壁矩形区域内，填充间距均匀的 45° 连续细实线。'},
      {title:'加粗结果并核对',action:'切到的轮廓用 0.7b 中粗实线（0.56 mm），未切到的可见轮廓用 0.5b 中实线（0.40 mm），b = 0.8 mm。核对后壁厚度、凸肩进深和坡折位置，清除作图线。'}
    ];
    function given(step){
      let out=viewPath('front',[[-w,0],[w,0],[w,h],[k,h],[k,b],[-k,b],[-k,h],[-w,h]],'given',true);
      for(const sign of [-1,1]){
        out+=viewPath('front',[[sign*t,h],[sign*f,e],[sign*f,0]],'given')+
          viewLine('front',[sign*k,b],[sign*k,0],'given')+
          viewLine('front',[sign*w,b],[sign*k,b],'hidden-line');
      }
      out+=viewPath('plan',[[-w,0],[w,0],[w,d],[f,d],[f,s],[k,s],[k,a],[-k,a],[-k,s],[-f,s],[-f,d],[-w,d]],'given',true)+
        viewLine('plan',[-w,a],[w,a],'given');
      for(const sign of [-1,1]){
        out+=viewLine('plan',[sign*k,s],[sign*t,s],'given')+
          viewLine('plan',[sign*t,s],[sign*t,d],'given');
      }
      out+=glyph('front',[[0,h+19],[0,h+43],[17,h+43]],'A',[24,h+39])+
        glyph('front',[[0,-19],[0,-43],[17,-43]],'A',[24,-47]);
      if(step===1)out+=viewLine('front',[0,-17],[0,h+17],'axis-line cut-active');
      return out;
    }
    let cells=cellsOnGrid([-w,-f,-k,0,k,f,w],[0,e,b,h]);
    cells=cutCells(cells,[f,e],[t,h]);
    cells=cutCells(cells,[-f,e],[-t,h]);
    for(const cell of cells)[cell.u,cell.v]=centerOf(cell.points);
    const inner=z=>f+(t-f)*Math.max(0,z-e)/(h-e);
    const mesh=mode=>finishMesh(sweep(cells,[0,a,s,d],({u,v},y)=>
      y<a?v<b:y<s?Math.abs(u)>k:Math.abs(u)>inner(v),
      ({u})=>Number(mode!==null&&u<0),toY));
    const planes=planeOutline([[0,-14,-10],[0,d+13,-10],[0,d+13,h+15],[0,-14,h+15]]);
    const wide={size:[960,650],views:{front:[230,216],plan:[230,333],a:[548,216]},axons:[[461,292,899,598]]};
    const narrow={size:[715,850],views:{front:[198,220],plan:[198,322],a:[405,746]},axons:[[389,279,701,530]]};
    return {steps,given,sections:[section],cuts:[{label:'A—A',planes,move:[-127,0,0]}],mesh,wide,narrow};
  }
