  function createLesson(g){
    const {radius:R,plate:B,height:H,pitch:p,hub:hub,centerHole:c,leftHole:l,boss:s,bossHole:r,offsetHole:o}=g;
    const [dx,dy]=g.direction,angle=Math.atan2(dy,dx),dir=[Math.cos(angle),Math.sin(angle)];
    const polar=(d,t=angle)=>[d*Math.cos(t),d*Math.sin(t)];
    const [bx,by]=polar(p),sideHoles=[[-p,0,l],[0,-p,o],[0,p,o]];
    const bores=[...sideHoles,[0,0,c],[bx,by,r]];
    const regions=[
      rect(-R,0,-p-l,B),
      [[-p+l,0],[-c,0],[-c,H],[-hub,H],[-hub,B],[-p+l,B]],
      [[c,0],[p-r,0],[p-r,H],[p-s,H],[p-s,B],[hub,B],[hub,H],[c,H]],
      [[p+r,0],[R,0],[R,B],[p+s,B],[p+s,H],[p+r,H]]
    ];
    const section={id:'a',mode:0,drawAt:3,label:'A—A 剖面图（展开）',caption:[0,-40],
      loops:regions.map(points=>pointsToEdges(points)),behind:[],
      axes:[vertical(-p,-11,B+11),vertical(0,-11,H+11),vertical(p,-11,H+11)]};
    const holes=[[-p,l,B],[0,c,H],[p,r,H]];
    for(const [x,rr,h] of holes)section.behind.push(horizontal(0,x-rr,x+rr),horizontal(h,x-rr,x+rr));
    const planPoint=x=>x<=0?[x,0]:polar(x);
    const world=(x,z)=>[...planPoint(x),z];
    const planMark=(a,b,z,anchor=0)=>dimension(mark('plan',planPoint(a),planPoint(b)),
      mark('a',[a,z],[b,z]),[world(a,z),world(b,z),world(anchor,z)]);
    const riseMark=(x,from,to)=>dimension(mark('front',[planPoint(x)[0],from],[planPoint(x)[0],to]),
      mark('a',[x,from],[x,to]),[world(x,from),world(x,to)]);
    const add=(edge,...marks)=>operation(section,edge,...marks);
    const outline=[
      add(horizontal(0,-R,R),planMark(0,-R,0),planMark(0,R,0)),
      add(vertical(-R,0,B),riseMark(-R,0,B)),
      add(horizontal(B,-R,-hub),planMark(-R,-hub,B,-R)),
      add(vertical(-hub,B,H),riseMark(-hub,B,H)),
      add(horizontal(H,-hub,hub),planMark(0,-hub,H),planMark(0,hub,H)),
      add(vertical(hub,H,B)),
      add(horizontal(B,hub,p-s),planMark(hub,p-s,B,hub)),
      add(vertical(p-s,B,H),riseMark(p-s,B,H)),
      add(horizontal(H,p-s,p+s),planMark(p,p-s,H,p),planMark(p,p+s,H,p)),
      add(vertical(p+s,H,B)),
      add(horizontal(B,p+s,R),planMark(p+s,R,B,p+s)),
      add(vertical(R,B,0))
    ];
    for(const [x,rr,h] of holes){
      outline.push(add(vertical(x-rr,h,0),planMark(x,x-rr,h,x)),
        add(vertical(x+rr,h,0),planMark(x,x+rr,h,x)));
    }
    const steps=[
      {title:'读题',action:'从两面投影认出圆盘、中央凸台、斜向小凸台及各通孔。剖切面通过左孔、圆盘与中央孔的轴线，以及斜向小凸台和小孔的轴线。'},
      {title:'判定剖切位置和视向',action:'以圆盘轴线为两剖切面的交线。对照剖切符号，辨认左侧径向剖切面与通过右下小孔的斜向剖切面。'},
      {title:'旋转斜向剖切面',rotation:true,operations:[{}],action:'将右侧斜向剖切面绕圆盘轴线旋转到与左侧剖切面共面。小凸台、小孔与圆盘外缘的交点按各自到圆心的距离转到水平基线上，各点高度保持一致。'},
      {title:'绘制轮廓线',operations:outline,action:'先用细实线绘制所有轮廓线。从轴线向两侧各量半径，作圆盘底边。由底边端点量取板厚，再从左向右绘制盘顶、中央凸台和旋转后的小凸台。各孔从轴线向两侧各量半径，随即从已作水平线向下画出孔壁。'},
      {title:'填充金属图例',action:'在剖切面实际切到的四片实体内画间距均匀、方向一致的 45° 连续细实线。三个通孔留白。'},
      {title:'加粗结果并核对',action:'切到的轮廓用 0.7b 中粗实线（0.56 mm），未切到的可见轮廓用 0.5b 中实线（0.40 mm），b = 0.8 mm。保留细点划轴线，核对三个通孔和右侧凸台的展开位置，清除作图线。'}
    ];
    const radii=[p-s,p-r,p,p+r,p+s,R];
    function given(step,phase){
      let out=viewPath('front',rect(-R,0,R,B),'given',true)+
        viewPath('front',[[-hub,B],[-hub,H],[hub,H],[hub,B]],'given')+
        viewPath('front',[[bx-s,B],[bx-s,H],[bx+s,H],[bx+s,B]],'given');
      for(const [x,rr,top] of [[-p,l,B],[0,c,H],[bx,r,H]]){
        out+=viewLine('front',[x,-12],[x,top+12],'axis-line');
        for(const offset of [-rr,rr])out+=viewLine('front',[x+offset,0],[x+offset,top],'hidden-line');
      }
      out+=ring('plan',[0,0],R)+ring('plan',[0,0],hub)+ring('plan',[bx,by],s)+
        ring('plan',[0,0],p,'axis-line')+bores.map(([x,y,rr])=>ring('plan',[x,y],rr)).join('');
      out+=viewLine('plan',[0,-R-10],[0,R+10],'axis-line')+
        viewLine('plan',[-R-12,0],[R+12,0],'axis-line');
      const active=step===1?'axis-line cut-active':'axis-line';
      out+=viewLine('plan',[-R-23,0],[0,0],active)+viewLine('plan',[0,0],polar(R+23),active);
      out+=glyph('plan',[[-R-43,-18],[-R-43,0],[-R-23,0]],'A',[-R-49,-24])+
        glyph('plan',[[-15,0],[0,0],polar(15)],'A',[6,-7])+
        glyph('plan',[polar(R+23),polar(R+43),[...polar(R+43)].map((v,i)=>v+18*[dir[1],-dir[0]][i])],
          'A',[polar(R+43)[0]+15,polar(R+43)[1]-15]);
      if(step===2){
        for(const d of radii)out+=ring('plan',polar(d),2.6,'transfer-point');
        if(phase>=1){
          for(const d of radii)out+=showEdge('plan',arc(polar(d),[d,0],d,0),'guide');
          const group=viewLine('plan',[0,0],polar(R),'measure-edge')+
            radii.map(d=>ring('plan',polar(d),2.6,'transfer-point')).join('');
          if(phase===1)out+=`<g data-rotate-angle="${angle*180/Math.PI}" data-center="${xy(viewPoint('plan',[0,0]))}">${group}</g>`;
          else out+=viewLine('plan',[0,0],[R,0],'measure-edge')+radii.map(d=>ring('plan',[d,0],2.6,'transfer-point')).join('');
        }
      }
      return out;
    }
    const grid=[-R,0,R];
    const circle=(cells,x,y,rr,key)=>circularPartition(cells,x,y,rr,grid,grid,key,[angle,angle+Math.PI]);
    let cells=circle(cellsOnGrid(grid,grid),0,0,R,'outer').filter(cell=>cell.outer);
    cells=cutCells(cells,[0,0],dir);
    cells=circle(cells,0,0,hub,'hub');
    cells=circle(cells,bx,by,s,'boss');
    for(const [x,y,rr] of bores){
      const solid=cells.filter(cell=>!cell.bore);
      cells=cells.filter(cell=>cell.bore).concat(circle(solid,x,y,rr,'bore'));
    }
    for(const cell of cells){
      const [x,y]=centerOf(cell.points);
      cell.removed=y>1e-7&&cross(dir[0],dir[1],x,y)>1e-7;
    }
    const mesh=mode=>finishMesh(sweep(cells,[0,B,H],(cell,z)=>!cell.bore&&(z<B||cell.hub||cell.boss),
      cell=>Number(mode!==null&&cell.removed),toZ,{curve:(cell,adjacent)=>
        adjacent.length===1||adjacent.some(other=>other.bore||other.hub!==cell.hub||other.boss!==cell.boss)}));
    const planes=[[-R-15,0],polar(R+15)].flatMap(([x,y])=>
      planeOutline([[0,0,-8],[x,y,-8],[x,y,H+12],[0,0,H+12]]));
    const wide={size:[980,660],views:{front:[236,183],plan:[236,426],a:[716,183]},axons:[[504,272,936,602]]};
    const narrow={size:[700,860],views:{front:[197,156],plan:[197,378],a:[473,696]},axons:[[392,234,679,524]]};
    return {steps,given,sections:[section],cuts:[{label:'A—A',planes,move:[-40,115,0]}],mesh,wide,narrow};
  }
