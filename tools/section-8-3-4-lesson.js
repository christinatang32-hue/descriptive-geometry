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
    const b={id:'b',mode:1,drawAt:3,label:'B—B 剖面图',caption:[0,-30],
      loops:[pointsToEdges(rect(-d,0,-R,h)),pointsToEdges(rect(R,0,d,h))],
      behind:[horizontal(0,-R,R),horizontal(h,-R,R),vertical(-q,h,0),vertical(q,h,0),
        arc([-r,z],[r,z],r,1),arc([r,z],[-r,z],r,1)],
      axes:[horizontal(z,-r-8,r+8),vertical(0,z-r-8,z+r+8)]};
    const planMark=(a1,a2)=>dimension(mark('plan',a1,a2),mark('a',a1,a2),[[...a1,z],[...a2,z]]);
    const sideMark=(a1,a2)=>dimension(mark('side',a1,a2),mark('b',a1,a2),[[0,...a1],[0,...a2]]);
    const addA=(edge,...marks)=>operation(a,edge,...marks);
    const addB=(edge,...marks)=>operation(b,edge,...marks);
    const points=(view,ps,space)=>ps.map(p=>({view,p,space:space(p)}));
    const aOutline=[
      addA(horizontal(-d,-w,w),planMark([0,-d],[-w,-d]),planMark([0,-d],[w,-d])),
      addA(vertical(-w,-d,d),planMark([-w,-d],[-w,d])),
      addA(horizontal(d,-w,w),planMark([0,d],[-w,d]),planMark([0,d],[w,d])),
      addA(vertical(w,-d,d))
    ];
    for(const sign of [1,-1]){
      const edge=neck(sign);
      const ends=[[-p,sign*q],[-u,sign*q],[0,sign*R],[u,sign*q],[p,sign*q]];
      aOutline.push(located(a,[...points('plan',ends,v=>[...v,z]),...ends.map(p=>({view:'a',p}))],
        planMark([0,0],[0,sign*q]),planMark([0,sign*q],[u,sign*q])),
        addA(edge[4],planMark([-u,sign*q],[-p,sign*q])),addA(edge[3]),
        addA(edge[2],planMark([u,sign*q],[p,sign*q])));
    }
    for(const x of [-p,p])aOutline.push(addA(vertical(x,q,-q),planMark([x,q],[x,-q])));
    for(const sign of [1,-1]){
      const boreEdge=(x1,x2)=>dimension(mark('side',[0,z],[sign*r,z]),mark('a',[x1,0],[x1,sign*r]),
        [[x1,0,z],[x1,sign*r,z]]);
      aOutline.push(addA(horizontal(sign*r,-w,-p),boreEdge(-w,-p)),addA(horizontal(sign*r,p,w),boreEdge(w,p)));
    }
    const circlePoints=[[-r,z],[0,z+r],[r,z],[0,z-r]];
    const bOutline=[
      addB(horizontal(0,-d,d),sideMark([0,0],[-d,0]),sideMark([0,0],[d,0])),
      addB(vertical(-d,0,h),sideMark([-d,0],[-d,h])),
      addB(horizontal(h,-d,d),sideMark([0,h],[-d,h]),sideMark([0,h],[d,h])),
      addB(vertical(d,h,0)),
      ...[-R,R,-q,q].map(x=>addB(vertical(x,h,0),sideMark([x<0?-d:d,h],[x,h]))),
      located(b,[...points('side',circlePoints,v=>[p,...v]),...circlePoints.map(p=>({view:'b',p}))],
        dimension(mark('front',[-w,0],[-w,z]),mark('b',[0,0],[0,z]),[[0,0,0],[0,0,z]]),
        dimension(mark('side',[0,z],[r,z]),mark('b',[0,z],[r,z]),[[p,0,z],[p,r,z]])),
      addB(b.behind[4]),addB(b.behind[5])
    ];
    const steps=[
      {title:'读题',action:'从投影中找出竖向贯通的圆孔、两侧展宽的矩形槽，以及位于同一轴线上的两处横孔。'},
      {title:'判定剖切位置和视向',action:'A—A 沿两侧横孔中心高度水平切开，向下看。B—B 通过形体的竖向中心，沿侧向看，切到前后两道实体壁。'},
      {title:'绘制 A—A 轮廓线',mode:0,operations:aOutline,action:'先用细实线绘制外矩形。对称水平线从轴线向两侧各量半长，竖线从已作水平线的端点起画。标出圆与矩形槽的交点及圆弧最高、最低点，作直线与圆弧相接的内轮廓，最后由横孔中心各量一个半径，画两侧孔壁。'},
      {title:'绘制 B—B 轮廓线',mode:1,operations:bOutline,action:'按底边、左边、上边、右边的顺序用细实线绘制外框。从顶边端点向内量取壁厚及槽边位置，沿已作水平线向下绘制竖线。确定横孔圆心，量取半径，标出四个对应点并画圆。'},
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
    const wide={size:[1270,810],views:{front:[221,268],side:[542,268],plan:[221,505],a:[813,183],b:[1120,286]},
      axons:[[521,395,873,741],[890,395,1235,741]]};
    const narrow={size:[820,1220],views:{front:[202,260],side:[611,260],plan:[202,494],a:[611,505],b:[611,920]},
      axons:[[37,659,410,962],[426,967,791,1178]]};
    const cuts=[
      {label:'A—A',planes:planeOutline([[-w-15,-d-15,z],[w+15,-d-15,z],[w+15,d+15,z],[-w-15,d+15,z]]),move:[30,55,108]},
      {label:'B—B',planes:planeOutline([[0,-d-15,-13],[0,d+15,-13],[0,d+15,h+13],[0,-d-15,h+13]]),move:[-146,0,0]}
    ];
    return {steps,given,sections:[a,b],cuts,mesh,wide,narrow};
  }
