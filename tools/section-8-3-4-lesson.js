  function createLesson(g){
    const {halfWidth:w,halfDepth:d,height:h,mainRadius:R,slotHalfWidth:p,slotHalfDepth:q,sideRadius:r}=g;
    const z=h/2,u=Math.sqrt(R*R-q*q);
    const neck=sign=>[
      horizontal(sign*r,p,w),vertical(p,sign*r,sign*q),horizontal(sign*q,u,p),
      arc([u,sign*q],[-u,sign*q],R,sign===1?0:1),horizontal(sign*q,-p,-u),
      vertical(-p,sign*q,sign*r),horizontal(sign*r,-w,-p)
    ];
    function cutBand(sign){
      return [
        segment([-w,sign*d],[w,sign*d]),vertical(w,sign*d,sign*r),
        ...neck(sign).map((edge,index)=>[0,2,4,6].includes(index)?{...edge,a:edge.b,b:edge.a}:edge),
        vertical(-w,sign*r,sign*d)
      ];
    }
    const a={id:'a',mode:0,drawAt:2,label:'A—A 剖面图',caption:[0,-d-30],
      loops:[cutBand(1),cutBand(-1)],behind:[-w,-p,p,w].map(x=>vertical(x,-r,r)),
      axes:[horizontal(0,-w-13,w+13),vertical(0,-d-13,d+13)]};
    const bore=compassCircle([0,z],r);
    const b={id:'b',mode:1,drawAt:3,label:'B—B 剖面图',caption:[0,-30],
      loops:[pointsToEdges(rect(-d,0,-R,h)),pointsToEdges(rect(R,0,d,h))],
      behind:[horizontal(0,-R,R),horizontal(h,-R,R),vertical(-q,h,0),vertical(q,h,0),
        bore],
      axes:[horizontal(z,-r-8,r+8),vertical(0,z-r-8,z+r+8)]};
    const planPoint=([x,y])=>[x,-y];
    const planMark=(from,to)=>dimension(mark('plan',planPoint(from),planPoint(to)),mark('a',from,to),
      [[...planPoint(from),z],[...planPoint(to),z]]);
    const sideMark=(a1,a2)=>dimension(mark('side',a1,a2),mark('b',a1,a2),[[0,...a1],[0,...a2]]);
    const addA=(edge,...marks)=>operation(a,edge,...marks);
    const addB=(edge,...marks)=>operation(b,edge,...marks);
    function perimeter(half,height,base,add,measure){
      return [
        add(horizontal(base,-half,half),measure([-half,base],[half,base])),
        add(vertical(-half,base,height),measure([-half,base],[-half,height])),
        add(horizontal(height,-half,half),measure([-half,height],[half,height])),
        add(vertical(half,height,base))
      ];
    }
    const slotGuide=(edge,...marks)=>({...addA(edge,...marks),construction:true});
    const aOutline=[
      ...perimeter(w,d,-d,addA,planMark),
      slotGuide(horizontal(-q,-p,p),planMark([-w,-q],[-p,-q]),planMark([-p,-d],[-p,-q]),
        planMark([-p,-q],[p,-q])),
      addA(vertical(-p,-q,q),planMark([-p,-q],[-p,q])),
      slotGuide(horizontal(q,-p,p),planMark([-p,q],[p,q])),
      addA(vertical(p,q,-q)),
      located(a,[{view:'plan',p:[0,0],space:[0,0,z]},{view:'a',p:[0,0]}],
        planMark([-w,0],[0,0]),planMark([0,-d],[0,0]))
    ];
    for(const sign of [1,-1]){
      const edge=neck(sign);
      aOutline.push(addA(compassArc(edge[3],[0,0]),planMark([0,0],[0,sign*R])));
    }
    for(const sign of [1,-1]){
      const edge=neck(sign);
      aOutline.push(addA(edge[4]),addA(edge[2]));
    }
    for(const sign of [1,-1]){
      const boreEdge=x=>dimension(mark('side',[0,z],[-sign*r,z]),mark('a',[x,0],[x,sign*r]),
        [[x,0,z],[x,-sign*r,z]]);
      aOutline.push(addA(horizontal(sign*r,-w,-p),boreEdge(-w)),addA(horizontal(sign*r,p,w),boreEdge(w)));
    }
    const bOutline=[
      ...perimeter(d,h,0,addB,sideMark),
      ...[-R,R,-q,q].map(x=>addB(vertical(x,h,0),sideMark([x<0?-d:d,h],[x,h]))),
      located(b,[{view:'side',p:[0,z],space:[p,0,z]},{view:'b',p:[0,z]}],
        sideMark([-d,0],[-d,z]),sideMark([-d,z],[0,z])),
      addB(bore,dimension(mark('side',[0,z],[r,z]),mark('b',[0,z],[r,z]),[[p,0,z],[p,r,z]]))
    ];
    const steps=[
      {title:'读题',action:'从投影中找出竖向贯通的圆孔、两侧展宽的矩形槽，以及位于同一轴线上的两处横孔。'},
      {title:'判定剖切位置和视向',action:'A—A 沿两侧横孔中心高度水平切开，向下看。B—B 通过形体的竖向中心，沿侧向看，切到前后两道实体壁。'},
      {title:'绘制 A—A 轮廓线',mode:0,operations:aOutline,action:'A—A 放在水平投影下方，两图长对正。先用细实线绘制所有轮廓线。按底、左、上、右的顺序作外框，两条水平边分别量取总长，从左向右一次画出。\n先定位矩形槽，再从水平投影移取圆心。以圆心量取半径，画与上、下槽边相交的两段圆弧，补齐保留的槽边和两侧横孔的孔壁。'},
      {title:'绘制 B—B 轮廓线',mode:1,operations:bOutline,action:'B—B 放在侧面投影右边，两图高平齐。先用细实线绘制所有轮廓线，按底、左、上、右的顺序作外框。由顶边两端向内量取壁厚及槽边位置，向下画出四条竖线。\n从侧面投影确定横孔圆心及其高度，直接量取半径，以该圆心一次画出整圆。'},
      {title:'填充通用材料图例',action:'A—A 在孔腔上下两块实体中填充图例，B—B 在剖面两侧实体壁中填充图例。采用均匀的 45° 连续细实线，孔洞和剖面后可见的槽面留白。'},
      {title:'加粗结果并核对',action:'切到的轮廓用 0.7b 中粗实线（0.56 mm），未切到的可见轮廓用 0.5b 中实线（0.40 mm），b = 0.8 mm。核对 A—A 的圆弧、槽口与横孔，以及 B—B 的壁厚和可见圆孔，清除作图线。'}
    ];
    function given(step){
      let out=viewPath('front',rect(-w,0,w,h),'given',true)+viewPath('side',rect(-d,0,d,h),'given',true);
      for(const x of [-p,-u,u,p])out+=viewLine('front',[x,0],[x,h],'hidden-line');
      for(const y of [-R,-q,q,R])out+=viewLine('side',[y,0],[y,h],'hidden-line');
      for(const sign of [-1,1])for(const height of [z-r,z+r])
        out+=viewLine('front',[sign*w,height],[sign*p,height],'hidden-line');
      out+=ring('side',[0,z],r)+viewLine('side',[-r-7,z],[r+7,z],'axis-line')+
        viewLine('side',[0,z-r-7],[0,z+r+7],'axis-line');
      const cut=step===1?'axis-line cut-active':'axis-line';
      out+=viewLine('front',[0,-13],[0,h+13],cut)+
        viewLine('front',[-w-13,z],[-p+10,z],cut)+viewLine('front',[p-10,z],[w+13,z],cut);
      out+=glyph('front',[[-w-24,z],[-w-46,z],[-w-46,z-19]],'A',[-w-53,z-36])+
        glyph('front',[[w+24,z],[w+46,z],[w+46,z-19]],'A',[w+40,z-36])+
        glyph('front',[[0,h+22],[0,h+42],[17,h+42]],'B',[24,h+37])+
        glyph('front',[[0,-22],[0,-42],[17,-42]],'B',[24,-47]);
      out+=viewPath('plan',rect(-w,-d,w,d),'given',true)+
        viewLine('plan',[0,-d-11],[0,d+11],'axis-line')+viewLine('plan',[-w-13,0],[w+13,0],'axis-line');
      for(const sign of [1,-1]){
        for(const edge of neck(sign).slice(2,5))
          out+=showEdge('plan',edge.r?{...edge,sweep:1-edge.sweep}:edge,'given');
        for(const y of [-r,r])out+=viewLine('plan',[sign*w,y],[sign*p,y],'hidden-line');
        out+=viewLine('plan',[sign*p,-q],[sign*p,q],'given');
      }
      if(step===2)for(const x of [-w,w]){
        out+=line(viewPoint('plan',[x,d]),viewPoint('a',[x,d]),'guide');
      }
      if(step===3)for(const height of [0,h]){
        out+=line(viewPoint('side',[d,height]),viewPoint('b',[-d,height]),'guide');
      }
      return out;
    }
    const ys=[-d,-q,0,q,d],zs=[0,z,h],xs=[-p,0,p];
    const core=circularPartition(cellsOnGrid(xs,ys),0,0,R,xs,ys,'bore');
    const ends=circularPartition(cellsOnGrid(ys,zs),0,z,r,ys,zs,'bore');
    function mesh(mode){
      const midSection=sweep(core,zs,({v,bore})=>Math.abs(v)>q&&!bore,
        ({u},level)=>Number(mode===0?level>z:mode===1&&u<0),toZ,{
          side:(a,b)=>![p,-p].some(x=>a[0]===x&&b[0]===x),
          curve:(cell,adjacent)=>adjacent.some(other=>other.bore&&Math.abs(other.v)>q)
        });
      const endSections=[[-w,-p],[p,w]].flatMap(levels=>sweep(ends,levels,({bore})=>!bore,
        ({v},level)=>Number(mode===0?v>z:mode===1&&level<0),toX,{
          cap:({u},level)=>Math.abs(level)===w||Math.abs(u)<q,
          curve:(cell,adjacent)=>adjacent.some(other=>other.bore)
        }));
      return finishMesh(midSection.concat(endSections));
    }
    const wide={size:[1120,886],views:{front:[221,263],side:[542,263],b:[848,263],plan:[221,449],a:[221,713]},
      axons:[[415,393,736,783],[759,393,1093,783]]};
    const narrow={size:[874,1070],views:{front:[218,256],side:[524,256],b:[747,256],plan:[218,451],a:[218,734]},
      axons:[[413,374,854,634],[413,680,854,1006]]};
    const cuts=[
      {label:'A—A',modelLabel:'A—A 全剖',planes:planeOutline([[-w-15,-d-15,z],[w+15,-d-15,z],[w+15,d+15,z],[-w-15,d+15,z]]),move:[30,55,108]},
      {label:'B—B',modelLabel:'B—B 全剖',planes:planeOutline([[0,-d-15,-13],[0,d+15,-13],[0,d+15,h+13],[0,-d-15,h+13]]),move:[-146,0,0]}
    ];
    return {steps,given,sections:[a,b],cuts,mesh,wide,narrow};
  }
