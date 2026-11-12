/* A5住宅教学模型。坐标单位m：x沿①→⑰，y沿A→D，z为建筑标高。
 * 几何、三维点选、剖切和平面联动共用本文件的数据；无外部运行依赖。 */
(() => {
  'use strict';
  const $=id=>document.getElementById(id), $$=s=>[...document.querySelectorAll(s)];
  const drawings=[["一层平面图", "A5 建施-3", 3, "平面图"], ["标准层平面图", "A5 建施-4", 4, "平面图"], ["五层平面图", "A5 建施-5", 5, "平面图"], ["①—⑰立面图", "A5 建施-8", 8, "立面图"], ["⑰—①立面图", "A5 建施-9", 9, "立面图"], ["Ⓐ—Ⓓ / Ⓓ—Ⓐ立面图", "A5 建施-10", 10, "立面图"], ["1—1剖面图", "A5 建施-11", 11, "剖面图"], ["墙身节点详图（一）", "A5 建施-12", 12, "构件详图"], ["墙身节点详图（二）", "A5 建施-13", 13, "构件详图"], ["楼梯详图", "A5 建施-14", 14, "构件详图"]];
  const imagePath=i=>`assets/house/v2/a5-${String(drawings[i][2]).padStart(2,'0')}.jpg`;
  drawings.push(['栏杆扶手详图','A5 建施-15',15,'构件详图'],['厨房、卫生间详图','A5 建施-16',16,'构件详图'],['门窗统计表','A5 建施-18',18,'材料与数量'],['门窗详图','A5 建施-19',19,'构件详图']);
  const spec=window.HOUSE_COMPONENT_SPEC;
  let drawingIndex=1;
  function showDrawing(i,open=true){drawingIndex=(i+drawings.length)%drawings.length;$('drawing-title').textContent=drawings[drawingIndex].slice(0,2).join(' · ');$('drawing-select').value=drawingIndex;$('drawing-image').src=imagePath(drawingIndex);$('drawing-image').alt=drawings[drawingIndex][0];$('drawing-original').href=imagePath(drawingIndex);if(open&&!$('drawing-dialog').open)$('drawing-dialog').showModal();}
  drawings.forEach((d,i)=>{const o=document.createElement('option');o.value=i;o.textContent=`${i+1} / ${drawings.length} · ${d[0]}`;$('drawing-select').append(o);const b=document.createElement('button');b.className='drawing-card';b.innerHTML=`<img src="${imagePath(i)}" alt="${d[0]}缩略图" loading="lazy"><span>${d[0]}<small>${d[1]}</small></span>`;b.onclick=()=>showDrawing(i);$('drawing-cards').append(b)});
  $('open-drawings').onclick=()=>showDrawing(drawingIndex);$('close-drawings').onclick=()=>$('drawing-dialog').close();$('prev-drawing').onclick=()=>showDrawing(drawingIndex-1);$('next-drawing').onclick=()=>showDrawing(drawingIndex+1);$('drawing-select').onchange=e=>showDrawing(+e.target.value);
  $('drawing-dialog').addEventListener('click',e=>{if(e.target===$('drawing-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close()}});
  const C={wall:'#e4d4ac',inner:'#d7c7a4',slab:'#8ca7b4',glass:'#65b4c8',frame:'#e8edf0',door:'#a87b56',stair:'#afb8b6',balcony:'#a9bbb8',roof:'#a74d43',trim:'#e5e6df',base:'#53616c',cap:'#f1b94f'};
  const parts={walls:['墙体与房间分隔','外围墙按轴外250＋轴内120＝370 mm表达，墙根与勒脚外表面对齐；主要隔墙按平面240 mm、楼梯间370 mm及详图60 mm分别表达。真实门窗洞口从墙体中扣除；房间位置由建筑平面确定。'],slabs:['楼板与层高','五层楼面按2.8 m间距设置；阁楼楼面标高+14.000。模型板厚按120 mm教学示意，具体叠层见墙身节点。'],openings:['门窗与洞口','SC-1515、SC-1815、SC-2115分别表示1500、1800、2100 mm宽的窗；M5B-0921为900×2100 mm门。窗框分格经过简化。'],balconies:['阳台与立面节奏','A轴一侧四列阳台外挑约1.2 m，D轴一侧厨房阳台按约0.6 m示意。一至五层为封闭阳台；阁楼四处为敞开露台，设实体栏板、栏杆和后退的玻璃推拉门。'],stairs:['双跑楼梯','两处楼梯间位于⑤—⑥、⑫—⑬轴。标准层两跑各8级，级高175 mm、踏面260 mm，半层平台高1.4 m；首层按9＋7级、半层平台1.575 m表达。两跑之间保留梯井，仅设栏杆扶手。公共梯止于五层，阁楼户内梯因缺定位未补设。'],roof:['坡屋顶与老虎窗','屋脊标高+17.773，阁楼楼面+14.000。南北坡合计16个老虎窗（南坡六樘、北坡十樘），洞口宽1.5 m；红色粘土瓦以逐行搭接缝、弧形瓦垄和檐口瓦形表达；瓦规格为教学示意。']};
  parts.fixtures=['厨房与卫生设备','按建施16的尺寸链定位洗手盆、坐便器、浴缸、洗衣机、厨房洗涤池与灶台；520×250烟道及240×240 GRC通风道按标注。成品器具未标注的外形、安装高度和材质仅作识读示意。'];
  const state={floor:'all',planFloor:1,explode:0,cut:'none',cutValue:.5,opacity:1,layers:Object.fromEntries(Object.keys(parts).map(k=>[k,true])),yaw:-1.13,pitch:.40,zoom:1,pan:[0,0],selected:null,room:null,step:0,auto:false};
  const objects=[],rooms=[],components=[];
  let activeComponent=null;
  function component(code,floor,details,fn){const rec={id:'c'+components.length,code,floor,...details};components.push(rec);const old=activeComponent;activeComponent=rec.id;if(fn)fn();activeComponent=old;return rec;}
  function within(rec,fn){const old=activeComponent;activeComponent=rec.id;fn();activeComponent=old;}
  const rgb=h=>[parseInt(h.slice(1,3),16)/255,parseInt(h.slice(3,5),16)/255,parseInt(h.slice(5,7),16)/255];
  function box(x0,y0,z0,x1,y1,z1,group,floor,name,color,extra={}){if(x1-x0<.001||y1-y0<.001||z1-z0<.001)return;objects.push({componentId:activeComponent,min:[x0,y0,z0],max:[x1,y1,z1],group,floor,name,color:rgb(color||C[group]||C.wall),...extra});}
  function poly(points,group,floor,name,color,extra={}){objects.push({componentId:activeComponent,points,group,floor,name,color:rgb(color),...extra})}
  function quad(a,b,c,d,...args){poly([a,b,c],...args);poly([a,c,d],...args)}
  function railBeam(a,b,w,floor,name,color){
    const d=b.map((v,i)=>v-a[i]),h=Math.hypot(d[0],d[1]),len=Math.hypot(...d),n=h?[-d[1]/h,d[0]/h,0]:[1,0,0],v=h?[-d[2]*d[0]/(len*h),-d[2]*d[1]/(len*h),h/len]:[0,1,0];
    const corners=p=>[[-1,-1],[1,-1],[1,1],[-1,1]].map(([u,t])=>p.map((x,i)=>x+(n[i]*u+v[i]*t)*w/2)),aa=corners(a),bb=corners(b);
    for(let i=0;i<4;i++){const j=(i+1)%4;quad(aa[i],aa[j],bb[j],bb[i],'stairs',floor,name,color)}
    quad(...aa,'stairs',floor,name,color);quad(...bb,'stairs',floor,name,color);
  }
  const southBays=[0,3.4,6.4,9.3,13.2,16.2,19.2,23.1,26,29,32.4];
  const northBays=[0,3.6,6.6,9.3,12.8,16.2,19.6,23.1,25.8,28.8,32.4];
  const balconyBays=[[0,3.4],[9.3,13.2],[19.2,23.1],[29,32.4]];
  // 圆管外径按详图；壁厚未标，不虚构内壁。
  function tube(a,b,diameter,floor,name,color='#617b84',group='stairs'){
    const d=b.map((v,i)=>v-a[i]),len=Math.hypot(...d);if(len<1e-7)return;
    const u=d.map(v=>v/len),n=Math.abs(u[2])>.9?[1,0,0]:[-u[1],u[0],0],nl=Math.hypot(...n),nn=n.map(v=>v/nl),v=[u[1]*nn[2]-u[2]*nn[1],u[2]*nn[0]-u[0]*nn[2],u[0]*nn[1]-u[1]*nn[0]];
    const ring=p=>Array.from({length:8},(_,i)=>p.map((x,k)=>x+diameter/2*(nn[k]*Math.cos(i*Math.PI/4)+v[k]*Math.sin(i*Math.PI/4))));
    const aa=ring(a),bb=ring(b);for(let i=0;i<8;i++){const j=(i+1)%8;quad(aa[i],aa[j],bb[j],bb[i],group,floor,name,color,{diameter:diameter*1000});}
    poly(aa,group,floor,name,color,{diameter:diameter*1000});poly(bb.slice().reverse(),group,floor,name,color,{diameter:diameter*1000});
  }
  // 由洞口边界分块成墙，门窗不贴在实心墙面上。
  function wall(axis,a,b,cross,z,h,t,floor,holes=[],inner=false){
    const cuts=[a,b,...holes.flatMap(o=>[Math.max(a,o.c-o.w/2),Math.min(b,o.c+o.w/2)])].sort((a,b)=>a-b);
    function segment(lo,hi,z0,z1){if(axis==='x')box(lo,cross-t/2,z0,hi,cross+t/2,z1,'walls',floor,inner?'室内隔墙':'外墙',inner?C.inner:C.wall);else box(cross-t/2,lo,z0,cross+t/2,hi,z1,'walls',floor,inner?'室内隔墙':'山墙',inner?C.inner:C.wall)}
    for(let i=0;i<cuts.length-1;i++){let lo=cuts[i],hi=cuts[i+1];if(hi-lo<.001)continue;const hole=holes.find(o=>(lo+hi)/2>o.c-o.w/2-.001&&(lo+hi)/2<o.c+o.w/2+.001);if(hole){segment(lo,hi,z,z+hole.b);segment(lo,hi,z+hole.b+hole.h,z+h)}else segment(lo,hi,z,z+h);}
    for(const o of holes){
      if(!o.code)continue;
      const code=o.code,lo=o.c-o.w/2,hi=o.c+o.w/2,z0=z+o.b,z1=z0+o.h,g='openings',name=code;
      component(code,floor,{width:Math.round(o.w*1000),height:Math.round(o.h*1000),position:axis==='x'?[o.c,cross,z0]:[cross,o.c,z0],axis,representation:o.kind==='empty'?'仅门洞（保留用户要求）':'实体构件',source:spec.openings[code]?.source||19,...o.info},()=>{
        if(o.kind==='empty')return;
        function block(l,r,d,depth,bot,top,col,label=name){if(axis==='x')box(l,d-depth/2,bot,r,d+depth/2,top,g,floor,label,col);else box(d-depth/2,l,bot,d+depth/2,r,top,g,floor,label,col)}
        const security=o.kind==='security',solid=['door','fire','security'].includes(o.kind),sliding=o.kind==='sliding';
        if(security){
          // 建施19：400+900不等宽双扇，L50×30×4框、70×40骨架、1mm包钢板。
          const meet=lo+.4;
          for(const [l,r] of [[lo,meet],[meet,hi]]){
            block(l+.004,r-.004,cross,.001,z0+.004,z1-.004,'#596a70','GM钢板1mm');
            for(const x of[l,r-.07])block(x,x+.07,cross,.04,z0,z1,'#62747c','GM门扇骨架70×40');
            for(const zz of[z0,z1-.07])block(l,r,cross,.04,zz,zz+.07,'#62747c','GM门扇骨架70×40');
          }
          for(const x of[meet-.055,meet+.055])block(x-.0125,x+.0125,cross+.041,.025,z0+.98,z0+1.10,C.frame,'防盗门小把手');
          for(const x of[lo,hi-.05]){block(x,x+.05,cross,.004,z0,z1,C.frame,'L50×30×4门框');block(x,x+.004,cross+.013,.03,z0,z1,C.frame,'L50×30×4门框折边')}
          block(lo,hi,cross,.004,z1-.05,z1,C.frame,'L50×30×4门框');
        }else if(solid){
          block(lo+.035,hi-.035,cross,.04,z0+.015,z1-.035,o.kind==='fire'?'#637b84':C.door);
          block(hi-.13,hi-.10,cross+.04,.03,z0+.98,z0+1.08,C.frame,'门把手');
        }else{
          const count=o.segments||(code.startsWith('YC')?4:sliding&&code.startsWith('LM-')?3:2),activeTop=code==='LM1'||code==='LM2'?z0+2:z1,step=o.w/count;
          for(let i=0;i<count;i++){
            const split=code==='LM1'?.747:code==='LM2'?.797:step,l=lo+(i===0?0:code==='LM1'||code==='LM2'?split:i*step),r=lo+(i===0&&(code==='LM1'||code==='LM2')?split:(i+1)*step),d=cross+(i%2?.018:-.018);
            block(l+.025,r-.025,d,.018,z0+.035,activeTop-.035,C.glass,name+'玻璃');
            for(const x of[l,r-.035])block(x,x+.035,d,.06,z0,activeTop,C.frame,name+'分格框');
          }
          if(activeTop<z1){block(lo+.035,hi-.035,cross,.018,activeTop+.035,z1-.035,C.glass,'LM上亮子');block(lo,hi,cross,.08,activeTop-.02,activeTop+.02,C.frame,'LM门扇2000与上亮子横框');}
          block(lo,hi,cross,.08,z0,z0+.035,C.frame);
        }
        if(!security){for(const [l,r]of[[lo,lo+.035],[hi-.035,hi]])block(l,r,cross,.08,z0,z1,C.frame);block(lo,hi,cross,.08,z1-.035,z1,C.frame);}
        if(!solid&&!sliding){
          if(axis==='x')box(lo-.10,cross-t/2-.09,z0-.06,hi+.10,cross+t/2+.09,z0,g,floor,'窗台 · '+name,C.trim);
          else box(cross-t/2-.09,lo-.10,z0-.06,cross+t/2+.09,hi+.10,z0,g,floor,'窗台 · '+name,C.trim);
        }
      });
    }
  }
  const win=(c,w=1.5,b=.9,h=1.5)=>({c,w,b,h,code:`SC-${Math.round(w*10)}15`});
  const door=(c,w=.9)=>({c,w,b:0,h:2.1,kind:'door',code:w===.7?'M5B-0721':'M5B-0921'});
  function partitionX(a,b,y,z,f,doors=[]){wall('x',a,b,y,z,2.68,.12,f,doors.map(c=>door(c,.9)),true)}
  function partitionY(a,b,x,z,f,doors=[]){wall('y',a,b,x,z,2.68,.12,f,doors.map(c=>door(c,.9)),true)}
  // 轴网与房间：两楼梯四户；各户的房间以图纸可读净分区为基准简化。
  function room(name,x0,y0,x1,y1,type,unit,note){rooms.push({name,min:[x0,y0],max:[x1,y1],type,unit,note})}
  const units=[{name:'西端户',a:0,b:6.6},{name:'中西户',a:9.3,b:16.2},{name:'中东户',a:16.2,b:23.1},{name:'东端户',a:25.8,b:32.4}];
  const southRooms=[[0,3.4,'主卧室',0],[3.4,6.4,'卧室',0],[6.4,9.3,'卧室',0],[9.3,13.2,'起居室',1],[13.2,16.2,'主卧室',1],[16.2,19.2,'主卧室',2],[19.2,23.1,'起居室',2],[23.1,26,'卧室',3],[26,29,'卧室',3],[29,32.4,'主卧室',3]];
  southRooms.forEach(([a,b,n,u])=>room(n,a+.15,.15,b-.15,4.4,n==='起居室'?'living':'bed',units[u].name,'位于A—B轴之间；与南侧阳台或外窗相邻。'));
  [[0,3.6,0],[12.8,16.2,1],[16.2,19.6,2],[28.8,32.4,3]].forEach(([a,b,u])=>room('卧室',a+.15,8.5,b-.15,11.85,'bed',units[u].name,'位于C—D轴之间，外窗对应D轴一侧立面。'));
  [[3.6,6.6,0],[9.3,12.8,1],[19.6,23.1,2],[25.8,28.8,3]].forEach(([a,b,u])=>room('厨房',a+.15,9.78,b-.15,11.88,'wet',units[u].name,'厨房位于D轴一侧，与封闭阳台相邻；LM推拉门、洗涤池、灶台与烟道依据建施16设置。'));
  [[6.46,9.245,0],[12.92,16.08,1],[16.32,19.48,2],[23.155,25.94,3]].forEach(([a,b,u])=>room('卫生间',a,4.6,b,6.6,'wet',units[u].name,'建施16：端部一门型，中部两门型；700×2100木门，器具按尺寸链定位。'));
  [[6.6,9.3],[23.1,25.8]].forEach(([a,b],i)=>room('楼梯间',a+.15,7,b-.15,11.85,'stair',i===0?'西单元':'东单元','双跑楼梯连接五个住宅楼层与阁楼；在纵向剖切中观察平台与梯段。'));
  [[.15,4.2,'西端户'],[9.45,13.05,'中西户'],[19.35,22.95,'中东户'],[28.2,32.25,'东端户']].forEach(([a,b,u])=>room('起居过厅',a,4.65,b,8.3,'living',u,'联系卧室、厨房和入户空间；模型保留主要通行关系。'));
  // 厨房和卫浴均以尺寸链建立坐标，不读取扫描像素轮廓。
  function fixture(name,x,y,w,d,h,z,f,details={}){
    component('FIX-'+name,f,{item:name,material:'成品；具体材质、未标外形尺寸及安装高度待产品选型',source:16,dimensionNote:'形状及未标规格为教学示意；定位见建施16',...details},()=>{
      const col=name.includes('烟道')||name.includes('通风')?'#b4b8b2':'#e8edf0';
      box(x,y,z,x+w,y+d,z+h,'fixtures',f,name,col);
      if(/洗手盆|洗涤池|浴缸/.test(name)){
        box(x+.035,y+.035,z+h-.015,x+w-.035,y+d-.035,z+h+.003,'fixtures',f,name+'内缘','#9cb9bf');
        box(x+.07,y+.07,z+h+.004,x+w-.07,y+d-.07,z+h+.010,'fixtures',f,name+'盆口','#d1e2e5');
      }
      if(name.includes('坐便器')){box(x+.05,y+.04,z+h,x+w-.05,y+d-.08,z+h+.035,'fixtures',f,'坐便器座圈','#d1e2e5');box(x,y+d-.15,z+h,x+w,y+d,z+h+.25,'fixtures',f,'坐便器水箱','#e8edf0');}
      if(name.includes('灶台'))for(const xx of[x+w*.25,x+w*.75]){const r=.10;for(let i=0;i<12;i++){const a=i*Math.PI/6,b=(i+1)*Math.PI/6;poly([[xx,y+d/2,z+h+.003],[xx+Math.cos(a)*r,y+d/2+Math.sin(a)*r,z+h+.003],[xx+Math.cos(b)*r,y+d/2+Math.sin(b)*r,z+h+.003]],'fixtures',f,'灶台炉盘','#465a61');}}
    });
  }
  function makeKitchen(a,b,z,f,code){
    const west=a<16,mirror=x=>west?x:32.4-x,base=west?a:32.4-b;
    const stoveRight=code==='LM1',innerL=base+(stoveRight?.12:.185),innerR=base+(b-a)-(stoveRight?.185:.12);
    const put=(name,x,y,w,d,h,info)=>fixture(name,west?x:mirror(x+w),y,w,d,h,z,f,info);
    const flueX=stoveRight?innerR-.52:innerL;
    put('厨房烟道',flueX,11.63,.52,.25,2.68,{width:520,depth:250,material:'成品烟道，材质按图集 DJ91.1（附件未给出详页）',dimensionNote:'520×250截面按标注'});
    put('灶台',flueX,10.78,.52,.60,.8,{dimensionNote:'520烟道宽、距后墙250按标注；灶台成品外形及高度示意'});
    const sx=stoveRight?innerL:innerR-.60;
    put('厨房洗涤池',sx,11.08,.60,.60,.8,{dimensionNote:'距后墙200、平面定位按建施16；池体外形及高度示意'});
  }
  function makeBath(type,east,z,f){
    const mx=x=>east?32.4-x:x;
    const wallY=(a,b,x,t,holes=[])=>wall('y',a,b,mx(x),z,2.68,t,f,holes,true);
    const wallX=(a,b,y,t)=>wall('x',east?mx(b):a,east?mx(a):b,y,z,2.68,t,f,[],true);
    const put=(name,x,y,w,d,h,extra={})=>fixture(name,east?mx(x+w):x,y,w,d,h,z,f,{bathType:type,...extra});
    if(type===1){
      // 2900轴距；净深700+1100=1800；右墙轴内55、轴外185。
      wallY(4.56,6.36,6.4,.12,[door(4.91,.7)]);
      wallY(4.56,6.36,9.365,.24);
      wallX(6.34,9.485,6.48,.24);
      put('洗手盆',6.76,5.87,.60,.42,.80,{dimensionNote:'横向600定位；成品尺寸与高度示意'});
      put('坐便器',7.66,5.66,.40,.66,.40,{dimensionNote:'横向600+800定位；成品外形示意'});
      put('浴缸',8.48,4.56,.75,1.56,.52,{width:750,dimensionNote:'宽750；600+800+620定位；长度按空间示意，未提供成品规格'});
      put('GRC通风道',8.99,6.12,.24,.24,2.68,{width:240,depth:240,material:'GRC成品通风道',dimensionNote:'240×240按标注'});
      put('洗衣机',7.54,4.64,.60,.60,.85);
    }else{
      // X:120+1200+60+575+575+750+120=3400；Y:600+700+680=1980。
      wallY(4.62,6.60,12.86,.12,[door(5.57,.7)]);
      wallY(4.62,6.60,14.15,.06,[door(5.47,.7)]);
      wallY(4.62,6.60,16.14,.12);
      put('洗手盆',13.17,6.12,.60,.42,.80,{dimensionNote:'洗手间净宽1200；成品外形与高度示意'});
      put('坐便器',14.555,5.91,.40,.66,.40,{dimensionNote:'厕间575+575定位；成品外形示意'});
      put('浴缸',15.33,4.86,.75,1.74,.52,{width:750,dimensionNote:'宽750；长度按空间示意，未提供成品规格'});
      put('GRC通风道',15.84,4.62,.24,.24,2.68,{width:240,depth:240,material:'GRC成品通风道',dimensionNote:'240×240按标注'});
      put('洗衣机',13.05,4.69,.60,.60,.85);
    }
  }
  function makeStairRail(x1,x2,runY,returnY,landingY,z,landingH,n1,n2,f){
    component('RAIL-15',f,{height:900,diameter:38,material:'Φ38钢管扶手；Φ16钢筋立杆；Φ9杆；4×50扁钢；节点Φ12钢管',source:15,dimensionNote:'扶手顶高900、端弯R90；管壁厚未标注，按外径表达'},()=>{
      const H=.881,R=.09;
      const flat=(x,a,b)=>{const aa=[x-.002,a[0],a[1]-.17],bb=[x+.002,a[0],a[1]-.17],cc=[x+.002,b[0],b[1]-.17],dd=[x-.002,b[0],b[1]-.17];quad(aa,bb,cc,dd,'stairs',f,'栏杆扁钢4×50下边','#617b84');quad(...[aa,dd,cc,bb].map(p=>[p[0],p[1],p[2]+.05]),'stairs',f,'栏杆扁钢4×50上边','#617b84');for(const sign of[-1,1])quad([x+sign*.002,a[0],a[1]-.17],[x+sign*.002,b[0],b[1]-.17],[x+sign*.002,b[0],b[1]-.12],[x+sign*.002,a[0],a[1]-.12],'stairs',f,'栏杆扁钢4×50侧边','#617b84');};
      for(const [x,start,end,base,endBase,dir,count]of[[x1,runY,landingY,z+.175,z+landingH,1,n1-1],[x2,landingY,returnY,z+landingH,z+2.8,-1,n2-1]]){
        const slope=(endBase-base)/Math.abs(end-start),alpha=Math.atan(slope),endAt=[x,start,base+H];
        tube(endAt,[x,end,endBase+H],.038,f,'楼梯斜扶手 Φ38');
        flat(x,[start,base+H],[end,endBase+H]);
        // B/4 与 3B/4 两杆，主杆间距260、杆间距130。
        for(let i=0;i<count;i++)for(const [offset,dia]of[[.065,.016],[.195,.009]]){
          const y=start+dir*(i*.26+offset),surface=base+i*.175,rail=base+H+(i*.26+offset)*slope;
          tube([x,y,surface],[x,y,rail-.019],dia,f,dia===.016?'栏杆立杆 Φ16':'栏杆细杆 Φ9');
          if(dia===.016)tube([x-.012,y,rail-.145],[x+.012,y,rail-.145],.012,f,'栏杆节点连接 Φ12');
        }
        if(dir===1){
          // 圆弧中心半径90，竖向端头平滑转入斜扶手。
          const cy=start+R*Math.sin(alpha),cz=base+H-R*Math.cos(alpha);
          const pts=Array.from({length:9},(_,i)=>{const t=Math.PI/2+(alpha-Math.PI/2)*i/8;return[x,cy-R*Math.sin(t),cz+R*Math.cos(t)]});
          for(let i=0;i<8;i++)tube(pts[i],pts[i+1],.038,f,'扶手端弯 R90');
          tube([x,pts[0][1],pts[0][2]-.25],pts[0],.038,f,'扶手竖向端头');
        }
      }
      for(const [a,b]of[[[x1,landingY,z+landingH+H],[x1,landingY+.26,z+landingH+H]],[[x1,landingY+.26,z+landingH+H],[x2,landingY+.26,z+landingH+H]],[[x2,landingY+.26,z+landingH+H],[x2,landingY,z+landingH+H]]])tube(a,b,.038,f,'休息平台扶手 Φ38');
      for(const x of[x1,x2])tube([x,landingY+.26,z+landingH],[x,landingY+.26,z+landingH+.862],.016,f,'平台立杆 Φ16');
    });
  }

  box(-1.05,-2.1,-.86,33.45,13.55,-.72,'site',-1,'室外地坪',C.base);
  box(-.25,-.25,-.7,32.65,12.25,-.12,'site',-1,'首层基座（非基础设计）','#747c7a');
  // 从实际外围墙/勒脚墙根直接起坡；悬挑阳台下也沿主体墙根连续设置。
  // 与外围墙250+120的偏轴关系共用边界，不再把散水起点移到阳台板外沿。
  const apronSlope=.03,apronWidth=.6,outline=[[-.25,-.25],[32.65,-.25],[32.65,12.25],[-.25,12.25]];
  const outsideNormal=(a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy);return[dy/len,-dx/len]};
  const normals=outline.map((v,i)=>outsideNormal(v,outline[(i+1)%outline.length]));
  const apronOuter=outline.map((v,i)=>{const a=normals[(i+outline.length-1)%outline.length],b=normals[i],d=1+a[0]*b[0]+a[1]*b[1];return[v[0]+apronWidth*(a[0]+b[0])/d,v[1]+apronWidth*(a[1]+b[1])/d]});
  for(let i=0;i<outline.length;i++){const j=(i+1)%outline.length;quad([...outline[j],-.7],[...outline[i],-.7],[...apronOuter[i],-.7-apronWidth*apronSlope],[...apronOuter[j],-.7-apronWidth*apronSlope],'site',-1,'散水 · 3%向外坡降（宽度示意）','#909797',{apronSlope});}
  for(let f=0;f<5;f++){
    const z=f*2.8;
    // 楼梯间贯通洞口，分区拼接板面。
    for(const [a,b]of[[-.25,6.6],[9.3,23.1],[25.8,32.65]])box(a,-.25,z-.12,b,12.25,z,'slabs',f,'楼板',C.slab);
    for(const [a,b]of[[6.6,9.3],[23.1,25.8]])box(a,-.25,z-.12,b,7.0,z,'slabs',f,'楼梯口前楼板',C.slab);
    const southH=southBays.slice(0,-1).map((a,i)=>{let b=southBays[i+1],isBal=balconyBays.some(([l,r])=>l===a&&r===b);return win((a+b)/2,isBal?Math.min(b-a-.4,3.34):1.8,isBal?1.2:.9,isBal?1.6:1.5)});
    // 一至五层阳台墙只留门洞，不加门扇；阁楼露台另设玻璃推拉门。
    southH.forEach((o,i)=>{if([0,3,6,9].includes(i)){o.b=0;o.h=1.9;o.kind='empty';o.code=[0,9].includes(i)?'LM-2119':'LM-2419';o.w=[0,9].includes(i)?2.1:2.4}});
    wall('x',-.25,32.65,-.065,z,2.68,.37,f,southH);
    const northH=[];
    for(const i of[0,4,5,9])northH.push(win((northBays[i]+northBays[i+1])/2));
    for(const i of[2,7])northH.push(f===0?{...door((northBays[i]+northBays[i+1])/2,1.3),h:2.075,kind:'security',code:'GM-1321'}:win((northBays[i]+northBays[i+1])/2,1.5,(f===1?1.575:(f-1)*2.8+1.4)+.9-z));
    for(const [a,b,dl,dr]of[[3.6,6.6,.12,.185],[9.3,12.8,.185,.12],[19.6,23.1,.12,.185],[25.8,28.8,.185,.12]])northH.push({c:(a+dl+b-dr)/2,w:b-a-dl-dr,b:0,h:2.68,kind:'empty'});
    // 跨层平台窗：下层墙也扣掉落在本层顶部的窗洞，避免遮住窗底。
    if(f<4)for(const i of[2,7]){const sill=(f===0?1.575:1.4)+.9;northH.push({c:(northBays[i]+northBays[i+1])/2,w:1.5,b:sill,h:2.68-sill,kind:'empty'});}
    wall('x',-.25,32.65,12.065,z,2.68,.37,f,northH);
    for(const x of[0,32.4])wall('y',.12,11.88,x+(x===0?-.065:.065),z,2.68,.37,f,[win(6.45,2.1)]);
    // 南面八樘卧室木门，阳台门洞不另塞门扇。
    for(const x of southBays.slice(1,-1))wall('y',.12,4.38,x,z,2.68,.24,f,[9.3,13.2,19.2,23.1].includes(x)?[door(3.93)]:[],true);
    for(const [a,b,t]of[[.12,6.4,.24],[6.4,9.3,.12],[9.3,23.1,.24],[23.1,26,.12],[26,32.28,.24]])wall('x',a,b,4.5,z,2.68,t,f,[2.83,3.97,28.43,29.57].filter(c=>c>a&&c<b).map(c=>door(c)),true);
    for(const x of[3.6,12.8,16.2,19.6,28.8])wall('y',x===12.8||x===19.6?6.72:8.4,11.88,x,z,2.68,.24,f,[12.8,19.6].includes(x)?[door(7.29)]:[],true);
    wall('x',.12,3.6,8.4,z,2.68,.24,f,[door(3.03)],true);
    wall('x',28.8,32.28,8.4,z,2.68,.24,f,[door(29.37)],true);
    wall('x',12.8,19.6,6.66,z,2.68,.12,f,[],true);
    for(const [a,b,code]of[[3.6,6.6,'LM1'],[9.3,12.8,'LM2'],[19.6,23.1,'LM2'],[25.8,28.8,'LM1']]){
      const c=code==='LM1'?(a<16?5.0675:32.4-5.0675):(a<16?11.0825:32.4-11.0825),w=spec.openings[code].width/1000;
      wall('x',a+.12,b-.12,9.75,z,2.68,.06,f,[{c,w,b:0,h:2.68,kind:'sliding',code,info:{activeHeight:2000,transomHeight:680}}],true);
      makeKitchen(a,b,z,f,code);
    }
    makeBath(1,false,z,f);makeBath(1,true,z,f);makeBath(2,false,z,f);makeBath(2,true,z,f);
    for(const [a,b]of[[6.6,9.3],[23.1,25.8]]){
      const front=f===0?6.48:6.59,dc=front+(f===0?.81:.56)+.45;
      for(const x of[a,b])wall('y',6.60,11.88,x,z,2.68,.37,f,[{...door(dc),kind:'fire',code:'FM-0921'}],true);
      const n1=f===0?9:8,n2=f===0?7:8,landingY=10.68,runY=landingY-(n1-1)*.26,returnY=landingY-(n2-1)*.26;
      const left=a+.185,leftEnd=a+1.285,right=a+1.415,rightEnd=b-.185,landingH=n1*.175;
      // 地面与平台统一使用楼板材质，颜色不再暗示不同地面材料。
      box(a+.185,7,z-.12,b-.185,f===1?9.12:runY,z,'stairs',f,'楼层平台地面',C.slab);
      if(f===0)box(a+.185,runY,z-.12,b-.185,11.88,z,'stairs',f,'首层楼梯间地面',C.slab);
      if(f<4){
        box(a+.185,landingY,z+landingH-.12,b-.185,11.88,z+landingH,'stairs',f,'半层休息平台',C.slab);
        for(let i=0;i<n1-1;i++){const y=runY+i*.26;box(left,y,z+Math.max(0,i*.175-.10),leftEnd,y+.26,z+(i+1)*.175,'stairs',f,'上行梯段踏步',C.stair)}
        for(let i=0;i<n2-1;i++){const y=landingY-(i+1)*.26;box(right,y,z+landingH+Math.max(0,i*.175-.10),rightEnd,y+.26,z+landingH+(i+1)*.175,'stairs',f,'折返梯段踏步',C.stair)}
        for(const [x0,x1,start,count,base,dir]of[[left,leftEnd,runY,n1-1,z,1],[right,rightEnd,landingY,n2-1,z+landingH,-1]])for(let i=0;i<count;i++){
          const nose=start+dir*i*.26,top=base+(i+1)*.175;
          for(const back of[.04,.07]){const y=nose+dir*back,yy=y+dir*.01;quad([x0,Math.min(y,yy),top+.0005],[x1,Math.min(y,yy),top+.0005],[x1,Math.max(y,yy),top+.0005],[x0,Math.max(y,yy),top+.0005],'stairs',f,'金刚砂防滑条10mm（40/10/20/10）','#697574');}
        }
        quad([left,runY,z],[leftEnd,runY,z],[leftEnd,landingY,z+landingH-.175],[left,landingY,z+landingH-.175],'stairs',f,'上行梯段板',C.stair);
        quad([right,returnY,z+2.625],[rightEnd,returnY,z+2.625],[rightEnd,landingY,z+landingH],[right,landingY,z+landingH],'stairs',f,'折返梯段板',C.stair);
        makeStairRail(leftEnd-.035,right+.035,runY,returnY,landingY,z,landingH,n1,n2,f);
      }else{
        component('RAIL-15',f,{height:900,diameter:38,material:'钢管扶手、钢筋立杆',source:15},()=>{
          tube([left,runY,z+.881],[leftEnd,runY,z+.881],.038,f,'五层梯井防护扶手 Φ38');
          for(let x=left;x<=leftEnd+.001;x+=.13)tube([x,runY,z],[x,runY,z+.862],.016,f,'五层护栏 Φ16');
        });
      }
      if(f===0){for(let i=0;i<3;i++)box(a+.25,12.1+i*.3,-.7,b-.25,12.4+i*.3,-.7+(3-i)*.175,'stairs',f,'入口台阶',C.stair)}
    }
    // 南侧四列封闭阳台：实体栏板与玻璃封窗。
    for(const [a,b]of balconyBays){
      box(a-.12,-1.32,z-.12,b+.12,-.10,z,'balconies',f,'南侧阳台板',C.slab);
      box(a-.08,-1.3,z,b+.08,-1.18,z+1.2,'balconies',f,'阳台栏板',C.balcony);
      for(const x of[a-.08,b-.04])box(x,-1.3,z,x+.12,-.10,z+1.2,'balconies',f,'阳台侧栏板',C.balcony);
      const faceA=a===0?-.25:a,faceB=b===32.4?32.65:b,code=b-a<3.5?'YC1':'YC2';
      wall('x',faceA,faceB,-1.23,z+1.2,1.6,.075,f,[{c:(faceA+faceB)/2,w:faceB-faceA,b:0,h:1.6,code}]);
      for(const x of[a,b])wall('y',-1.2,0,x,z+1.2,1.6,.075,f,[{c:-.6,w:1.2,b:0,h:1.6,code,segments:2,info:{face:'侧窗',countInSchedule:false}}]);
    }
    for(const [a,b]of[[3.6,6.6],[9.3,12.8],[19.6,23.1],[25.8,28.8]]){
      const code=b-a<3.1?'YC3':'YC4',w=spec.openings[code].width/1000;
      box(a,12.12,z-.12,b,12.72,z,'balconies',f,'厨房阳台板',C.slab);
      box(a,12.62,z,b,12.72,z+1.2,'balconies',f,'厨房阳台栏板',C.balcony);
      wall('x',a,b,12.67,z+1.2,1.6,.075,f,[{c:(a+b)/2,w,b:0,h:1.6,code}]);
      for(const x of[a,b]){
        box(x-.05,12.18,z,x+.05,12.72,z+1.2,'balconies',f,'北阳台侧栏板',C.balcony);
        wall('y',12.18,12.72,x,z+1.2,1.6,.075,f,[{c:12.45,w:.54,b:0,h:1.6,code,segments:1,info:{face:'侧窗',countInSchedule:false,dimensionNote:'侧窗净宽540依据建施12；型材断面示意'}}]);
      }
    }
    // 饰带与窗台形成与原立面对应的水平层次。
    for(const y of[-.17,12.17])box(-.25,y-.035,z+2.65,32.65,y+.035,z+2.73,'walls',f,'楼层水平饰带',C.trim);
  }
  // 阁楼板与低矮边墙。外轮廓服从标准层、剖面，内部仅示意。
  for(const [a,b]of[[-.25,6.6],[9.3,23.1],[25.8,32.65]])box(a,-.25,13.88,b,12.25,14,'slabs',5,'阁楼楼板',C.slab);
  for(const [a,b]of[[6.6,9.3],[23.1,25.8]])box(a,-.25,13.88,b,7,14,'slabs',5,'阁楼楼板',C.slab);
  wall('x',-.25,32.65,12.065,14,.7,.37,5,[]);
  wall('x',-.25,32.65,-.065,14,.7,.37,5,balconyBays.map(([a,b])=>({c:(a+b)/2,w:b-a,b:0,h:.7,kind:'empty'})));
  // 建施13/1：外挑段净1140、内退3300、栏板1160+栏杆250。
  // 各局部面基准与轴线有60差值；此处按教学轴网保留外挑1200，不宣称施工复原。
  for(const [a,b]of balconyBays){
    const w=b-a<3.5?2.1:2.4,back=3.3;
    box(a-.12,-1.32,13.88,b+.12,back,14,'balconies',5,'阁楼敞开露台楼板',C.slab);
    box(a-.08,-1.30,14,b+.08,-1.18,15.16,'balconies',5,'阁楼露台实体栏板1160',C.balcony);
    for(const x of[a-.08,b-.04])box(x,-1.30,14,x+.12,back,15.16,'balconies',5,'阁楼露台侧栏板',C.balcony);
    box(a-.08,-1.29,15.39,b+.08,-1.19,15.43,'balconies',5,'阁楼露台栏杆250',C.frame);
    for(let x=a;x<=b+.001;x+=.4)box(x-.018,-1.265,15.16,x+.018,-1.225,15.41,'balconies',5,'阁楼露台栏杆立杆',C.frame);
    for(const x of[a,b]){box(x-.025,-1.25,15.39,x+.025,back,15.43,'balconies',5,'露台侧扶手',C.frame);for(let y=-1.2;y<back;y+=.4)box(x-.018,y-.018,15.16,x+.018,y+.018,15.41,'balconies',5,'露台侧立杆',C.frame)}
    wall('x',a,b,back,14,2.39,.25,5,[{c:(a+b)/2,w,b:.25,h:1.9,kind:'sliding',code:w===2.1?'LM-2119':'LM-2419',info:{countInSchedule:false,dimensionNote:'阁楼露台详图另计，门窗表阁楼栏未列'}}]);
  }
  for(const x of[0,32.4]){
    const top=y=>17.773-Math.abs(y-6)*3.073/6-.035,faces=x===0?[-.25,.12]:[32.28,32.65];
    for(const [a,b]of[[.125,5.4],[5.4,6],[6,7.5],[7.5,11.875]]){
      const inWindow=a>=5.4&&b<=7.5;
      for(const xx of faces){
        if(inWindow){quad([xx,a,14],[xx,b,14],[xx,b,14.9],[xx,a,14.9],'walls',5,'阁楼山墙窗下墙',C.wall);quad([xx,a,16.4],[xx,b,16.4],[xx,b,top(b)],[xx,a,top(a)],'walls',5,'阁楼山墙窗上墙',C.wall)}
        else quad([xx,a,14],[xx,b,14],[xx,b,top(b)],[xx,a,top(a)],'walls',5,'阁楼山墙',C.wall);
      }
      quad([faces[0],a,top(a)],[faces[1],a,top(a)],[faces[1],b,top(b)],[faces[0],b,top(b)],'walls',5,'山墙顶面（瓦面以下）',C.wall);
    }
    wall('y',5.4,7.5,x+(x===0?-.065:.065),14.9,1.5,.37,5,[win(6.45,2.1,0,1.5)]);
  }
  for(const x of[3.4,6.4,9.3,13.2,16.2,19.2,23.1,26,29]){
    const profile=[[.13,14],[11.87,14],[11.87,14.6],[6,17.65],[.13,14.6]];
    for(const xx of[x-.06,x+.06])for(let i=1;i<profile.length-1;i++)poly([[xx,...profile[0]],[xx,...profile[i]],[xx,...profile[i+1]]],'walls',5,'阁楼隔墙（沿坡顶收头）',C.inner);
    for(let i=0;i<profile.length;i++){const a=profile[i],b=profile[(i+1)%profile.length];quad([x-.06,...a],[x+.06,...a],[x+.06,...b],[x-.06,...b],'walls',5,'阁楼隔墙顶边',C.inner)}
  }
  // 双坡屋面几何开洞，为16樘老虎窗留下实际空间。
  const dormerLayout=[[4.9,7.85,14.7,17.7,24.55,27.5],[1.8,5.1,7.95,11.05,14.5,17.9,21.35,24.45,27.3,30.6]];
  const roofHeight=y=>17.773-Math.abs(y-6)*(3.073/6);
  for(const side of[0,1]){
    const dormerXs=dormerLayout[side];
    const outer=side?12.55:-.55,edge=side?12:0;
    const junction=z=>side?12-(z-14.7)/(3.073/6):(z-14.7)/(3.073/6);
    const topAt=(x,c)=>{const i=dormerXs.indexOf(c),shoulder=side&&(i===0||i===9)?15.8:16.1;return shoulder+.842+.08-.842*Math.abs(x-c)/.91};
    const corners=[-.45,32.85,...dormerXs.flatMap(x=>[x-.91,x,x+.91]),...(!side?balconyBays.flat():[])].sort((a,b)=>a-b);
    for(let i=0;i<corners.length-1;i++){
      const a=corners[i],b=corners[i+1],c=dormerXs.find(x=>(a+b)/2>x-.91&&(a+b)/2<x+.91),inHole=c!==undefined;
      const terrace=!side&&balconyBays.some(([l,r])=>(a+b)/2>l&&(a+b)/2<r);
      const ya=terrace?3.3:inHole?junction(topAt(a,c)):outer,yb=terrace?3.3:inHole?junction(topAt(b,c)):outer;
      quad([a,6,roofHeight(6)],[b,6,roofHeight(6)],[b,yb,roofHeight(yb)],[a,ya,roofHeight(ya)],'roof',5,'坡屋面',C.roof);
      if(inHole&&!terrace)quad([a,outer,roofHeight(outer)],[b,outer,roofHeight(outer)],[b,edge,roofHeight(edge)],[a,edge,roofHeight(edge)],'roof',5,'檐口瓦面',C.roof);
    }
    for(const [i,x]of dormerXs.entries()){
      const y=side?12.04:-.04,bottom=14.9,stem=side&&(i===0||i===9)?.7:1,netShoulder=bottom+stem,shoulder=netShoulder+.2,peak=shoulder+.842;
      const w=.75,name=side&&(i===0||i===9)?'TC1 老虎窗':'TC2 老虎窗';
      const record=component(name.startsWith('TC1')?'TC1':'TC2',5,{width:1500,height:stem===.7?1400:1700,position:[x,y,bottom],source:19});activeComponent=record.id;
      // 五边形窗洞与外山花之间的实体收口，保留净洞尺寸而不留透空缝。
      const outerFace=[[x-.91,14.7],[x+.91,14.7],[x+.91,shoulder],[x,peak],[x-.91,shoulder]],innerFace=[[x-w,bottom],[x+w,bottom],[x+w,netShoulder],[x,netShoulder+.7],[x-w,netShoulder]];
      for(let j=0;j<5;j++){const k=(j+1)%5;quad([outerFace[j][0],y,outerFace[j][1]],[outerFace[k][0],y,outerFace[k][1]],[innerFace[k][0],y,innerFace[k][1]],[innerFace[j][0],y,innerFace[j][1]],'roof',5,'老虎窗窗洞四周山花收口',C.trim);}
      for(const xx of[x-w-.10,x+w])for(const faceX of[xx,xx+.10])poly([[faceX,y,14.7],[faceX,y,shoulder],[faceX,junction(shoulder),shoulder]],'roof',5,'老虎窗三角侧墙',C.trim);
      box(x-w,y-.04,14.7,x+w,y+.04,bottom,'roof',5,'老虎窗窗下墙',C.trim);
      box(x-w-.10,y-.15,bottom-.06,x+w+.10,y+.15,bottom,'openings',5,'老虎窗窗台',C.trim);
      box(x-w,y-.045,bottom,x+w,y+.045,netShoulder,'openings',5,name,C.glass);
      poly([[x-w,y,netShoulder],[x+w,y,netShoulder],[x,y,netShoulder+.7]],'openings',5,name,C.glass);
      for(const sign of[-1,1]){const aa=[x+sign*w,y,netShoulder],bb=[x,y,netShoulder+.7],dd=.025;quad([aa[0],y-.07,aa[2]],[bb[0],y-.07,bb[2]],[bb[0],y-.07,bb[2]-dd],[aa[0],y-.07,aa[2]-dd],'openings',5,'老虎窗斜框',C.frame);}
      // 五边形洞口面上保留横框、中框与两坡窗顶边框。
      box(x-.022,y-.07,bottom,x+.022,y+.07,netShoulder+.7,'roof',5,'老虎窗中框',C.frame);
      box(x-w,y-.07,netShoulder-.025,x+w,y+.07,netShoulder+.025,'roof',5,'老虎窗横框',C.frame);
      for(const xx of[x-w,x+w-.05])box(xx,y-.07,bottom,xx+.05,y+.07,netShoulder,'roof',5,'老虎窗边框',C.frame);
      for(const sign of[-1,1]){
        const frontY=y+(side?.12:-.12);
        quad([x+sign*(w+.16),frontY,shoulder+.08],[x,frontY,peak+.08],[x,junction(peak+.08),peak+.08],[x+sign*(w+.16),junction(shoulder+.08),shoulder+.08],'roof',5,'老虎窗小坡屋顶',C.roof);
        const a=[x+sign*(w+.16),y-.14,shoulder+.04],b=[x,y-.14,peak+.04];quad(a,b,[b[0],b[1],b[2]-.10],[a[0],a[1],a[2]-.10],'roof',5,'老虎窗白色檐边',C.trim);
      }
    }
    activeComponent=null;
    const eaves=side?[[-.45,32.85]]:[[-.45,0],[3.4,9.3],[13.2,19.2],[23.1,29],[32.4,32.85]];
    for(const [a,b]of eaves){
      box(a,outer-.06,roofHeight(outer)-.165,b,outer+.06,roofHeight(outer)-.045,'roof',5,'白色檐沟（瓦面以下）',C.trim);
      // 檐口逐块弧形瓦截面：与表面的程序化瓦垄相接，无贴图依赖。
      for(let x=a;x+.24<=b;x+=.24)for(let k=0;k<4;k++){
        const t0=k*Math.PI/4,t1=(k+1)*Math.PI/4,x0=x+.12*(1-Math.cos(t0)),x1=x+.12*(1-Math.cos(t1)),z0=roofHeight(outer)+.035*Math.sin(t0),z1=roofHeight(outer)+.035*Math.sin(t1),yy=side?outer-.28:outer+.28;
        quad([x0,outer,z0],[x1,outer,z1],[x1,yy,roofHeight(yy)+.035*Math.sin(t1)],[x0,yy,roofHeight(yy)+.035*Math.sin(t0)],'roof',5,'檐口弧形粘土瓦',C.roof);
      }
    }
  }
  // 四段山墙坡边以红色瓦边封口，白色墙顶不再穿出瓦面。
  for(const x of[-.45,32.85])for(const [a,b]of[[-.55,6],[6,12.55]])quad([x,a,roofHeight(a)],[x,b,roofHeight(b)],[x,b,roofHeight(b)-.035],[x,a,roofHeight(a)-.035],'roof',5,'山墙边缘瓦面',C.roof);
  box(-.45,5.94,17.74,32.85,6.06,17.84,'roof',5,'屋脊',C.roof);
  // 网格、标高在同一投影矩阵下绘制。
  const axisX=[['1',0],['2',3.4],['3',3.6],['4',6.4],['5',6.6],['6',9.3],['7',12.8],['8',13.2],['9',16.2],['10',19.2],['11',19.6],['12',23.1],['13',25.8],['14',26],['15',28.8],['16',29],['17',32.4]];
  const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),sub=(a,b)=>a.map((v,i)=>v-b[i]),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm=a=>{const n=Math.hypot(...a)||1;return a.map(x=>x/n)};
  const canvas=$('model'),overlay=$('overlay'),ctx=overlay.getContext('2d'),gl=canvas.getContext('webgl',{alpha:true,antialias:true,preserveDrawingBuffer:true});
  let program,buffer,loc={},frame,visibleObjects=[],dirty=true;
  if(gl){
    function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s}
    program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,`attribute vec3 position;attribute vec3 normal;attribute vec4 color;attribute float tile;varying vec3 world;varying float tiled;uniform vec3 center;uniform vec3 right;uniform vec3 up;uniform vec3 toward;uniform vec2 scale;uniform vec2 pan;varying vec4 shade;void main(){world=position;tiled=tile;vec3 p=position-center;gl_Position=vec4(dot(p,right)*scale.x+pan.x,dot(p,up)*scale.y+pan.y,-dot(p,toward)/100.0,1.0);float light=.68+.32*max(0.0,dot(normalize(normal),normalize(vec3(.25,-.45,.9))));shade=vec4(color.rgb*light,color.a);}`));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,`precision mediump float;varying vec4 shade;varying vec3 world;varying float tiled;
void main(){vec3 col=shade.rgb;if(tiled>.5){
 float row=floor(world.y*3.20),u=fract(world.x/0.24+mod(row,2.0)*.5),v=fract(world.y*3.20);
 float roll=.81+.26*sin(u*3.14159265)+.12*cos(u*6.2831853);
 float seam=smoothstep(.015,.07,u)*(1.0-smoothstep(.93,.985,u));
 float lap=smoothstep(.015,.095,v);
 float variation=.94+.08*fract(sin(floor(world.x/.24)*71.31+row*12.7)*43758.54);
 col*=roll*(.56+.44*seam)*(.66+.34*lap)*variation;
}gl_FragColor=vec4(col,shade.a);}`));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));gl.useProgram(program);buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    for(const key of['position','normal','color','tile']){loc[key]=gl.getAttribLocation(program,key);gl.enableVertexAttribArray(loc[key]);gl.vertexAttribPointer(loc[key],key==='color'?4:key==='tile'?1:3,gl.FLOAT,false,44,key==='position'?0:key==='normal'?12:key==='color'?24:40)}
    for(const key of['center','right','up','toward','scale','pan'])loc[key]=gl.getUniformLocation(program,key);
    gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  }else $('render-error').hidden=false;
  const boxFaces=[[[0,0,0],[0,1,0],[1,1,0],[1,0,0]],[[0,0,1],[1,0,1],[1,1,1],[0,1,1]],[[0,0,0],[1,0,0],[1,0,1],[0,0,1]],[[1,1,0],[0,1,0],[0,1,1],[1,1,1]],[[0,1,0],[0,0,0],[0,0,1],[0,1,1]],[[1,0,0],[1,1,0],[1,1,1],[1,0,1]]];
  function clipInfo(){const p=state.cutValue;return state.cut==='horizontal'?{axis:2,v:p*18,greater:false}:state.cut==='longitudinal'?{axis:1,v:p*12,greater:true}:state.cut==='transverse'?{axis:0,v:p*32.4,greater:false}:null}
  function clipPolygon(points,cl){if(!cl)return points;const out=[],inside=p=>cl.greater?p[cl.axis]>=cl.v-1e-6:p[cl.axis]<=cl.v+1e-6;for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length],ia=inside(a),ib=inside(b);if(ia)out.push(a);if(ia!==ib){const t=(cl.v-a[cl.axis])/(b[cl.axis]-a[cl.axis]);out.push(a.map((v,j)=>v+(b[j]-v)*t))}}return out}
  function activeObject(o){return(o.group==='site'?state.floor==='all'||state.floor==='0':state.layers[o.group]&&(state.floor==='all'||o.floor===+state.floor))}
  function buildVisible(){const cl=clipInfo();visibleObjects=[];for(const o of objects){if(!activeObject(o))continue;const dz=state.floor==='all'&&o.floor>=0?o.floor*state.explode*1.3:0;const v={...o,dz};if(o.min){v.min=o.min.slice();v.max=o.max.slice();if(cl&&o.group!=='site'){const a=cl.axis;if(cl.greater)v.min[a]=Math.max(v.min[a],cl.v);else v.max[a]=Math.min(v.max[a],cl.v);if(v.min[a]>=v.max[a])continue;v.cap=cl;}v.min[2]+=dz;v.max[2]+=dz;}else{const p=clipPolygon(o.points,cl);if(p.length<3)continue;v.points=p.map(p=>[p[0],p[1],p[2]+dz]);}visibleObjects.push(v)}}
  function makeFrame(){const w=canvas.clientWidth,h=canvas.clientHeight;const toward=[Math.cos(state.yaw)*Math.cos(state.pitch),Math.sin(state.yaw)*Math.cos(state.pitch),Math.sin(state.pitch)],right=norm([-toward[1],toward[0],0]),up=cross(toward,right);const center=[16.2,5.7,state.floor==='all'?8.2+state.explode*3.25:+state.floor*2.8+1.3];
    // 只在完整楼层改变时调整适配，避免拖动时建筑忽大忽小。
    const spanH=state.floor==='all'?19+state.explode*6.5:state.floor==='5'?6:5;
    const sx=Math.abs(right[0])*34+Math.abs(right[1])*15,sy=Math.abs(up[0])*34+Math.abs(up[1])*15+Math.abs(up[2])*spanH;
    const s=Math.min((w-68)/Math.max(sx,1),(h-94)/Math.max(sy,1))*state.zoom;
    return{w,h,toward,right,up,center,s};}
  function project(p){const a=sub(p,frame.center);return[frame.w/2+dot(a,frame.right)*frame.s+state.pan[0],frame.h/2-dot(a,frame.up)*frame.s+state.pan[1]]}
  let geometryCache=null,geometryKey='';
  function geometry(){const key=JSON.stringify([state.floor,state.layers,state.explode,state.cut,state.cutValue,state.opacity,state.selected,state.componentId,state.room,state.opacity<1?[state.yaw,state.pitch]:null]);if(key===geometryKey&&geometryCache)return geometryCache;geometryKey=key;const opaque=[],trans=[],cl=clipInfo();let tileMaterial=0;
    const emit=(a,b,c,color,alpha,list)=>{const n=norm(cross(sub(b,a),sub(c,a)));if(Math.hypot(...cross(sub(b,a),sub(c,a)))<1e-9)return;for(const p of[a,b,c])list.push(...p,...n,...color,alpha,tileMaterial)};
    const sorted=visibleObjects.slice().sort((a,b)=>{const center=o=>o.min?o.min.map((v,i)=>(v+o.max[i])/2):o.points[0];return dot(center(a),frame.toward)-dot(center(b),frame.toward)});
    for(const o of sorted){tileMaterial=o.group==='roof'&&/坡屋面|瓦面|小坡屋顶|弧形粘土瓦|屋脊/.test(o.name)?1:0;let color=o.color,alpha=o.group==='walls'?state.opacity:1;if(state.componentId?state.componentId===o.componentId:state.selected===o.group)color=color.map((v,i)=>v*.35+[.35,.92,1][i]*.65);const list=alpha<.99?trans:opaque;
      if(o.min){for(const face of boxFaces){const pts=face.map(p=>p.map((v,i)=>o.min[i]+v*(o.max[i]-o.min[i])));let col=color;if(o.cap){const ax=o.cap.axis,cutV=o.cap.v+(ax===2?o.dz:0);if(pts.every(p=>Math.abs(p[ax]-cutV)<.0001))col=rgb(C.cap)}emit(pts[0],pts[1],pts[2],col,alpha,list);emit(pts[0],pts[2],pts[3],col,alpha,list)}}else for(let i=1;i<o.points.length-1;i++)emit(o.points[0],o.points[i],o.points[i+1],color,alpha,list);
    }
    if(state.room){tileMaterial=0;const r=state.room,z=state.planFloor*2.8+.03,co=rgb('#53eafd');const a=[r.min[0],r.min[1],z],b=[r.max[0],r.min[1],z],c=[r.max[0],r.max[1],z],d=[r.min[0],r.max[1],z];emit(a,b,c,co,.9,opaque);emit(a,c,d,co,.9,opaque)}
    return geometryCache={opaque:new Float32Array(opaque),trans:new Float32Array(trans)};
  }
  function drawOverlay(){ctx.clearRect(0,0,frame.w,frame.h);const line=(a,b,color,width=1,dash=[])=>{const p=project(a),q=project(b);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dash);ctx.beginPath();ctx.moveTo(...p);ctx.lineTo(...q);ctx.stroke();ctx.setLineDash([])};
    const text=(p,t,color='#a5c6d8',size=10)=>{const q=project(p);ctx.font=`${size}px Microsoft YaHei`;ctx.fillStyle=color;ctx.textAlign='center';ctx.fillText(t,q[0],q[1])};
    // 屏幕角落方向标，与实际模型转动同步。
    const ox=48,oy=frame.h-64;for(const [v,t,col]of[[[1,0,0],'X','#f0b172'],[[0,1,0],'Y','#53eafd'],[[0,0,1],'Z','#c6d4dc']]){const x=dot(v,frame.right)*22,y=-dot(v,frame.up)*22;ctx.strokeStyle=col;ctx.lineWidth=1.7;ctx.beginPath();ctx.moveTo(ox,oy);ctx.lineTo(ox+x,oy+y);ctx.stroke();ctx.fillStyle=col;ctx.font='8px Microsoft YaHei';ctx.textAlign='center';ctx.fillText(t,ox+x*1.5,oy+y*1.5)}
    if(state.room&&state.floor!=='all')text([(state.room.min[0]+state.room.max[0])/2,(state.room.min[1]+state.room.max[1])/2,+state.floor*2.8+.05],state.room.name,'#042632',12);
  }
  function render(){dirty=false;const dpr=Math.min(devicePixelRatio||1,2);for(const c of[canvas,overlay]){const w=Math.round(canvas.clientWidth*dpr),h=Math.round(canvas.clientHeight*dpr);if(c.width!==w||c.height!==h){c.width=w;c.height=h}}ctx.setTransform(dpr,0,0,dpr,0,0);frame=makeFrame();buildVisible();if(gl){gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.uniform3fv(loc.center,frame.center);gl.uniform3fv(loc.right,frame.right);gl.uniform3fv(loc.up,frame.up);gl.uniform3fv(loc.toward,frame.toward);gl.uniform2f(loc.scale,2*frame.s/frame.w,2*frame.s/frame.h);gl.uniform2f(loc.pan,2*state.pan[0]/frame.w,-2*state.pan[1]/frame.h);const geo=geometry();for(const [data,transparent]of[[geo.opaque,false],[geo.trans,true]]){gl.depthMask(!transparent);gl.bufferData(gl.ARRAY_BUFFER,data,gl.DYNAMIC_DRAW);gl.drawArrays(gl.TRIANGLES,0,data.length/11)}gl.depthMask(true)}drawOverlay()}
  const request=()=>{dirty=true};
  function setView(view){state.pan=[0,0];state.zoom=1;const views={iso:[-1.13,.40],south:[-Math.PI/2,0],north:[Math.PI/2,0],ad:[0,0],da:[Math.PI,0],top:[-Math.PI/2,Math.PI/2-.0001]};[state.yaw,state.pitch]=views[view];$$('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));request()}
  function selectPart(group,name,id=null){state.selected=group;state.componentId=id;if(group){$('part-title').textContent=name||parts[group][0];$('part-text').textContent=parts[group][1];$('clear-selection').hidden=false}else{$('part-title').textContent='点选模型中的构件';$('part-text').textContent='认识墙、楼板、门窗、阳台、楼梯和坡屋顶。也可使用右侧构件列表选择。';$('clear-selection').hidden=true}const rec=components.find(c=>c.id===id);if(rec){const def=spec.openings[rec.code];$('part-title').textContent=`${rec.floor===5?'阁楼':rec.floor+1+'层'} · ${rec.code}`;$('part-text').textContent=[rec.item,rec.width?`${rec.code.startsWith('FIX')?'截面或标注宽度':'洞口'} ${rec.width}${rec.height?'×'+rec.height:rec.depth?'×'+rec.depth:''} mm`:rec.height?`扶手高 ${rec.height} mm`:'',rec.activeHeight?`门扇高 ${rec.activeHeight}，上亮子 ${rec.transomHeight} mm`:'',def?`${def.category}；${def.material}`:rec.material,rec.representation,rec.dimensionNote,`依据 A5 建施${rec.source||18}`].filter(Boolean).join('；');}$$('[data-part]').forEach(b=>b.classList.toggle('active',b.dataset.part===group));request()}
  Object.entries(parts).forEach(([k,p])=>{const b=document.createElement('button');b.textContent=p[0].split('与')[0];b.dataset.part=k;b.onclick=()=>{state.layers[k]=true;document.querySelector(`[data-layer="${k}"]`).checked=true;selectPart(k)};$('component-buttons').append(b)});
  $('clear-selection').onclick=()=>selectPart(null);
  function sync(){
    $$('[data-floor]').forEach(b=>b.classList.toggle('active',b.dataset.floor===state.floor));$$('[data-cut]').forEach(b=>b.classList.toggle('active',b.dataset.cut===state.cut));$$('[data-layer]').forEach(c=>c.checked=state.layers[c.dataset.layer]);
    $('explode').value=state.explode/3*100;$('explode-value').textContent=`${Math.round(state.explode/3*100)}%`;$('explode').disabled=state.floor!=='all';$('opacity').value=state.opacity*100;$('opacity-value').textContent=state.opacity===1?'实体':`${Math.round(state.opacity*100)}%`;
    $('cut-detail').hidden=state.cut==='none';$('cut-position').value=state.cutValue*1000;const cl=clipInfo();$('cut-label').textContent=state.cut==='horizontal'?'剖切标高':state.cut==='longitudinal'?'距 A 轴':'距 ① 轴';$('cut-value').textContent=cl?`${cl.axis===2?'+':''}${cl.v.toFixed(3)} m`:'';
    const f=state.floor==='all'?null:+state.floor;$('model-title').textContent=f===null?'整栋观察':f===5?'阁楼层观察':`${['一','二','三','四','五'][f]}层观察`;$('floor-level').textContent=f===null?'整栋 · ±0.000 至 +17.773':`楼面 ${f===0?'±0.000':'+'+(f*2.8).toFixed(3)} m`;
    $('model-badge').textContent=state.cut!=='none'?`${{horizontal:'水平剖切',longitudinal:'纵向剖切',transverse:'横向剖切'}[state.cut]} · 金色为截面`:f===null?(state.explode?'楼层拆分 · 观察竖向关系':'五层住宅 + 坡屋顶阁楼'):f===5?'阁楼 · 坡屋顶内的使用空间':`${f+1}层 · 屋顶与上方楼层已移开`;
    $('plan-floor').value=String([1,2,3,5].includes(state.planFloor)?1:state.planFloor);if(f!==null){$('schedule-floor').value=String(f);drawSchedule();}drawPlan();request();
  }
  function setFloor(f){state.floor=String(f);state.room=null;state.cut='none';state.pan=[0,0];state.zoom=1;if(f!=='all')state.planFloor=+f;sync()}
  $$('[data-floor]').forEach(b=>b.onclick=()=>setFloor(b.dataset.floor));$$('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));
  $('reset-view').onclick=()=>{state.auto=false;$('auto-rotate').setAttribute('aria-pressed','false');state.explode=0;state.cut='none';state.floor='all';state.opacity=1;state.room=null;Object.keys(state.layers).forEach(k=>state.layers[k]=true);selectPart(null);setView('iso');sync()};
  $('explode').oninput=e=>{state.explode=+e.target.value/100*3;state.room=null;sync()};$('opacity').oninput=e=>{state.opacity=+e.target.value/100;sync()};$$('[data-layer]').forEach(c=>c.onchange=()=>{state.layers[c.dataset.layer]=c.checked;request()});
  $$('[data-cut]').forEach(b=>b.onclick=()=>{state.cut=b.dataset.cut;state.cutValue=state.cut==='horizontal'?(state.floor==='all'?8.4:(+state.floor*2.8+1.2))/18:.5;state.room=null;sync()});$('cut-position').oninput=e=>{state.cutValue=+e.target.value/1000;sync()};
  $('auto-rotate').onclick=()=>{state.auto=!state.auto;$('auto-rotate').setAttribute('aria-pressed',String(state.auto))};$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.querySelector('.model-panel').requestFullscreen()}catch(e){$('canvas-note').textContent='当前环境不支持全屏，可在浏览器中打开本页。'}};
  const planImages={"3": {"x": -0.5829678829457843, "y": -2.606543828090816, "w": 33.499133264525526, "h": 16.34304049783655}, "4": {"x": -0.5393783359497646, "y": -1.6112612404278794, "w": 33.37936577708006, "h": 15.194085271983665}, "5": {"x": -0.5176738648301622, "y": -1.170851942644146, "w": 33.43459133885841, "h": 14.8341045703348}};
  function drawPlan(){
    const n=state.planFloor===0?3:state.planFloor===4?5:4,m=planImages[n];
    const isAttic=state.planFloor===5;
    let s=`<rect x="-4.7" y="-5.4" width="41.8" height="24.3" fill="white"/><image href="assets/house/v2/plan-${String(n).padStart(2,'0')}.jpg" x="${m.x}" y="${m.y}" width="${m.w}" height="${m.h}" preserveAspectRatio="none"/>`;
    const axis=(a,b,c,d)=>`<line x1="${a}" y1="${b}" x2="${c}" y2="${d}" stroke="#718998" stroke-width=".035" stroke-dasharray=".32 .13 .05 .13"/>`;
    const label=(x,y,t)=>`<circle cx="${x}" cy="${y}" r=".29" fill="white" stroke="#3c6578" stroke-width=".035"/><text x="${x}" y="${y+.14}" font-size=".4" text-anchor="middle" fill="#24495c">${t}</text>`;
    // New bubbles lie beyond the balconies and annotation area, with generous white margins.
    for(const [n,x] of axisX.filter(([n])=>['1','3','5','6','7','9','11','12','13','15','17'].includes(n))){s+=axis(x,-3.15,x,-4.25)+label(x,-4.55,n)}
    for(const [n,x] of axisX.filter(([n])=>['1','2','4','6','8','9','10','12','14','16','17'].includes(n))){s+=axis(x,14.15,x,16.25)+label(x,16.65,n)}
    for(const [n,y] of [['D',0],['C',3.6],['B',7.5],['A',12]]){s+=axis(-.85,y,-3.4,y)+label(-3.8,y,n)+axis(33.3,y,35.2,y)+label(35.6,y,n)}
    for(const [i,r]of rooms.entries()){
      const selected=state.room===r;
      s+=`<g data-room="${i}" tabindex="0" role="button" aria-label="${r.unit} ${r.name}"><rect x="${r.min[0]}" y="${12-r.max[1]}" width="${r.max[0]-r.min[0]}" height="${r.max[1]-r.min[1]}" fill="${selected?'#20cce9':'transparent'}" fill-opacity="${selected?.23:0}" stroke="${selected?'#008fa8':'transparent'}" stroke-width=".10"/></g>`;
    }
    $('plan').innerHTML=s;
    $('plan').dataset.drawing=String(n);
    $('plan-enlarge').onclick=()=>showDrawing(n===3?0:n===4?1:2);
    $('plan-status').textContent=isAttic?'本次未上传阁楼平面；此处保留标准层图纸，供位置对照。':`真实图纸 · A5 建施-${n} · 点击房间定位`;
    if(!state.room){$('room-name').textContent='真实平面 · 两个楼梯间';$('room-text').textContent='原图线条、房名与门窗编号保留。点选房间，三维同步显示对应单层位置。'}
    $('plan').querySelectorAll('[data-room]').forEach(g=>{const choose=()=>{if(isAttic)return;const r=rooms[+g.dataset.room];state.floor=String(state.planFloor);state.room=r;state.cut='horizontal';state.cutValue=(state.planFloor*2.8+1.15)/18;state.layers.walls=true;state.layers.slabs=true;state.layers.roof=false;state.opacity=1;selectPart(null);setView('top');sync();$('room-name').textContent=`${r.unit} · ${r.name}`;$('room-text').textContent=r.note;};g.onclick=choose;g.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose()}}});
  }
  $('plan-floor').onchange=e=>{state.planFloor=+e.target.value;setFloor(e.target.value)};
  const steps=[
    {tab:'整体',title:'先认出体量、层数与方向',text:'从立面与剖面确定竖向尺寸，再用平面确定房屋的长、宽和轴线。模型与图纸采用同一组定位坐标。',points:['主体外包 32.90 × 12.50 m；①—⑰轴沿长度方向。','五层住宅，上设阁楼；屋脊标高 +17.773 m。'],drawing:3,floor:'all',view:'iso'},
    {tab:'平面',title:'从楼梯间读懂一层布局',text:'先找到两处入户楼梯，再判断住宅单元与房间的联系。切换平面图，点选下方平面中的房间，在模型中定位。',points:['两处楼梯间连接四户住宅。','起居、卧室、厨房与卫生间的位置以原始平面核对。'],drawing:0,floor:'0',view:'top',cut:'horizontal',cutValue:1.15/18},
    {tab:'楼层',title:'把重复平面叠成房屋',text:'标准层平面按层高逐层叠加。拖动“楼层拆分”，观察楼板、墙体及两处楼梯间在竖向上的对应。',points:['标准层楼面为 +2.800、+5.600、+8.400、+11.200。','阁楼楼面 +14.000；楼梯开口在各层贯通。'],drawing:1,floor:'all',view:'iso',explode:1.6},
    {tab:'立面',title:'门窗和阳台形成立面节奏',text:'将平面中的洞口投到立面，辨认窗、封闭阳台和入口。南北两侧的开窗与阳台布置不同，分别观察。',points:['A轴一侧四列主要阳台，对应平面上的起居或卧室。','用平面图核对 SC-1515、SC-1815、SC-2115 等门窗编号。'],drawing:3,floor:'all',view:'south',selected:'openings'},
    {tab:'楼梯',title:'剖开房屋，追踪楼梯的上行',text:'移去A轴一侧的前半部，观察两处双跑楼梯。梯段将楼层平台与半层休息平台连接，折返后到达上一层。',points:['标准层按16级 × 175 mm = 2800 mm；踏面260 mm。','首层、五层与阁楼处另有详图，本模型对特殊梯段简化。'],drawing:9,floor:'all',view:'iso',cut:'longitudinal',cutValue:.55,selected:'stairs'},
    {tab:'屋顶',title:'从剖面读出坡屋顶与阁楼',text:'阁楼位于坡屋顶内部。观察屋脊、双坡、檐口及老虎窗，再隐藏屋顶查看坡下的使用空间。',points:['屋面与老虎窗分别属于主屋面和局部采光构造。','北坡十樘、南坡六樘；结合墙身节点理解老虎窗构造。'],drawing:8,floor:'5',view:'iso',selected:'roof'},
    {tab:'剖切',title:'用三种剖切核对空间关系',text:'完整模型、平面和剖面共同表达同一栋房屋。切换水平、纵向或横向剖切，并拖动滑杆，观察楼板、墙和洞口的变化。',points:['金色表面表示实际被切到的构件。','回到原始剖面与墙身节点，核对标高、层次和构造。'],drawing:6,floor:'all',view:'iso',cut:'transverse',cutValue:.65}
  ];
  function setStep(i){state.step=i;const s=steps[i];state.floor=s.floor;state.cut=s.cut||'none';state.cutValue=s.cutValue||.5;state.explode=s.explode||0;state.opacity=1;state.room=null;state.auto=false;$('auto-rotate').setAttribute('aria-pressed','false');for(const k in state.layers)state.layers[k]=true;if(s.floor!=='all')state.planFloor=+s.floor;selectPart(s.selected||null);setView(s.view);sync();$$('[data-step]').forEach(b=>b.setAttribute('aria-selected',String(+b.dataset.step===i)));$('step-counter').textContent=`${i+1} / 7`;$('step-kicker').textContent=`第 ${String(i+1).padStart(2,'0')} 步 · ${s.tab}识读`;$('step-title').textContent=s.title;$('step-text').textContent=s.text;$('step-points').replaceChildren(...s.points.map(t=>{const li=document.createElement('li');li.textContent=t;return li}));$('prev-step').disabled=i===0;$('next-step').disabled=i===6;$('step-drawing').onclick=()=>showDrawing(s.drawing)}
  steps.forEach((s,i)=>{const b=document.createElement('button');b.dataset.step=i;b.role='tab';b.setAttribute('aria-selected',String(i===0));b.textContent=`0${i+1} ${s.tab}`;b.onclick=()=>setStep(i);document.querySelector('.steps').append(b)});$('prev-step').onclick=()=>setStep(Math.max(0,state.step-1));$('next-step').onclick=()=>setStep(Math.min(6,state.step+1));
  // 正交相机的拾取射线与绘图完全共用frame，不依赖屏幕包围盒猜选。
  function pick(x,y){const rx=(x-frame.w/2-state.pan[0])/frame.s,ry=-(y-frame.h/2-state.pan[1])/frame.s;const start=frame.center.map((v,i)=>v+frame.right[i]*rx+frame.up[i]*ry+frame.toward[i]*100),dir=frame.toward.map(x=>-x);let best=Infinity,hit=null;
    for(const o of visibleObjects){if(!o.min||o.group==='site')continue;let tmin=0,tmax=Infinity;for(let a=0;a<3;a++){if(Math.abs(dir[a])<1e-9){if(start[a]<o.min[a]||start[a]>o.max[a]){tmin=Infinity;break}}else{let t1=(o.min[a]-start[a])/dir[a],t2=(o.max[a]-start[a])/dir[a];tmin=Math.max(tmin,Math.min(t1,t2));tmax=Math.min(tmax,Math.max(t1,t2))}}if(tmax>=tmin&&tmin<best){best=tmin;hit=o;}}
    // 三角面用于坡屋顶；射线相交由Möller–Trumbore算法计算。
    for(const o of visibleObjects){if(!o.points||o.group==='site')continue;for(let i=1;i<o.points.length-1;i++){const [a,b,c]=[o.points[0],o.points[i],o.points[i+1]],e1=sub(b,a),e2=sub(c,a),h=cross(dir,e2),det=dot(e1,h);if(Math.abs(det)<1e-8)continue;const f=1/det,s=sub(start,a),u=f*dot(s,h);if(u<0||u>1)continue;const q=cross(s,e1),v=f*dot(dir,q);if(v<0||u+v>1)continue;const t=f*dot(e2,q);if(t>0&&t<best){best=t;hit=o;}}}
    if(hit)selectPart(hit.group,`${hit.floor===5?'阁楼':hit.floor+1+'层'} · ${hit.name}`,hit.componentId);else selectPart(null);
  }
  function drawSchedule(){
    const f=+$('schedule-floor').value;
    $('opening-schedule').replaceChildren(...Object.entries(spec.openings).map(([code,d])=>{
      const instances=components.filter(c=>c.code===code&&c.floor===f&&c.countInSchedule!==false),expected=d.byFloor[f],count=instances.length;
      const pending=expected!=null&&count!==expected;
      const tr=document.createElement('tr'),first=document.createElement('td'),second=document.createElement('td'),btn=document.createElement('button');
      btn.className='schedule-pick';btn.textContent=code;btn.disabled=!count;btn.onclick=()=>{const r=instances[0];setFloor(f);selectPart('openings',code,r.id);};first.append(btn,document.createElement('br'),document.createTextNode(`${d.width||'宽度见立面'} × ${d.height||'至板下皮'} mm`));
      second.append(document.createTextNode(`${d.category} · ${d.material}`));const status=document.createElement('span');status.className='schedule-status'+(pending?' review':'');
      status.textContent=`表列 ${expected==null?'未列':expected} / 已定位 ${count}`+(pending?' · 待核定位或表图差异':'')+(instances.some(c=>c.representation?.startsWith('仅门洞'))?' · 仅留门洞':'');second.append(status);tr.append(first,second);return tr;
    }));
    $('schedule-notes').textContent='洞口尺寸，装修余量须按详图留出。LM1/LM2门扇高2000，上亮子至板下皮。YC按立面宽计，侧窗另列于点选信息。YC3五层表列4而平面2、合计10，按平面保留2。M5B-0616及阁楼部分普通门窗缺定位，未擅自补设。阁楼露台推拉门按建施13另计。';
  }
  $('schedule-floor').onchange=drawSchedule;drawSchedule();

  let drag=null,pointers=new Map(),pinch=null;
  canvas.addEventListener('contextmenu',e=>e.preventDefault());canvas.addEventListener('pointerdown',e=>{canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,[e.clientX,e.clientY]);state.auto=false;$('auto-rotate').setAttribute('aria-pressed','false');if(pointers.size===2){const p=[...pointers.values()];pinch={distance:Math.hypot(p[0][0]-p[1][0],p[0][1]-p[1][1]),zoom:state.zoom};drag=null;return}drag={id:e.pointerId,x:e.clientX,y:e.clientY,yaw:state.yaw,pitch:state.pitch,pan:state.pan.slice(),move:e.shiftKey||e.button===2||e.button===1,moved:0};});
  canvas.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,[e.clientX,e.clientY]);if(pinch&&pointers.size===2){const p=[...pointers.values()];state.zoom=Math.max(.4,Math.min(5,pinch.zoom*Math.hypot(p[0][0]-p[1][0],p[0][1]-p[1][1])/pinch.distance));request();return}if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.moved=Math.max(drag.moved,Math.hypot(dx,dy));if(drag.move)state.pan=[drag.pan[0]+dx,drag.pan[1]+dy];else{state.yaw=drag.yaw+dx*.007;state.pitch=Math.max(-.12,Math.min(Math.PI/2-.0001,drag.pitch+dy*.005));$$('[data-view]').forEach(b=>b.classList.remove('active'))}request()});
  function release(e){pointers.delete(e.pointerId);if(drag&&drag.id===e.pointerId){if(drag.moved<5&&e.type==='pointerup'){const r=canvas.getBoundingClientRect();pick(e.clientX-r.left,e.clientY-r.top)}drag=null}if(pointers.size<2)pinch=null;}
  for(const ev of['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(ev,release);
  canvas.addEventListener('wheel',e=>{e.preventDefault();state.zoom=Math.max(.4,Math.min(5,state.zoom*Math.exp(-e.deltaY*.001)));request()},{passive:false});
  canvas.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','=','0'].includes(e.key)){e.preventDefault();if(e.key==='ArrowLeft')state.yaw-=.1;if(e.key==='ArrowRight')state.yaw+=.1;if(e.key==='ArrowUp')state.pitch=Math.min(Math.PI/2-.0001,state.pitch+.08);if(e.key==='ArrowDown')state.pitch=Math.max(-.12,state.pitch-.08);if(e.key==='+'||e.key==='=')state.zoom=Math.min(5,state.zoom*1.1);if(e.key==='-')state.zoom=Math.max(.4,state.zoom/1.1);if(e.key==='0')setView('iso');request()}});
  new ResizeObserver(request).observe(canvas);canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();$('render-error').hidden=false});
  let previous=0;function animate(t){if(state.auto){state.yaw+=Math.min(50,t-previous)*.00015;dirty=true}previous=t;if(dirty)render();requestAnimationFrame(animate)}
  setStep(0);requestAnimationFrame(animate);
  // 只读诊断入口，便于核验实际几何及运行状态。
  window.houseTeaching={getState:()=>JSON.parse(JSON.stringify(state)),getGeometry:()=>({objects:objects.length,rooms:rooms.length,floors:[0,2.8,5.6,8.4,11.2,14],ridge:17.773,axes:{length:32.4,depth:12},external:{length:32.9,depth:12.5},dormers:16,atticTerraces:objects.filter(o=>o.name==='阁楼敞开露台楼板').length,securityDoorLeaves:components.filter(c=>c.code==='GM-1321').length*2,windowSills:objects.filter(o=>/窗台/.test(o.name)).length,tileSurfaces:objects.filter(o=>/弧形粘土瓦/.test(o.name)).length,visible:visibleObjects.length,webgl:!!gl}),getObjects:()=>objects.map(o=>({componentId:o.componentId,diameter:o.diameter,name:o.name,floor:o.floor,group:o.group,min:o.min,max:o.max,points:o.points,color:o.color})),getComponents:()=>structuredClone(components),getSpecification:()=>structuredClone(spec),selectComponent:id=>{const r=components.find(c=>c.id===id);if(r){setFloor(r.floor);selectPart(r.code==='RAIL-15'?'stairs':r.code.startsWith('FIX')?'fixtures':'openings',r.code,id)}},project:p=>project(p)};
})();
