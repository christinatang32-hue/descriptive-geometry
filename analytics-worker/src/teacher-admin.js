import {createPasswordHash} from './password.js';
const json=(body,status=200,headers={})=>Response.json(body,{status,headers:{'Cache-Control':'no-store',...headers}});
const validStudentId=id=>typeof id==='string'&&/^[0-9A-Za-z-]{4,24}$/.test(id);
const validName=name=>typeof name==='string'&&name.trim().length>=2&&name.trim().length<=30&&!/[\u0000-\u001f\u007f]/.test(name);
const validClass=value=>typeof value==='string'&&/^[\p{L}\p{N}\s_-]{1,40}$/u.test(value.trim());
const groupPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const normalize=value=>value.trim().replace(/\s+/g,' ');
const validEmployeeId=value=>typeof value==='string'&&/^\d{6,16}$/.test(value);
const initialPassword=()=>btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(12)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const validYear=value=>typeof value==='string'&&/^20\d{2}-20\d{2}$/.test(value)&&Number(value.slice(5))===Number(value.slice(0,4))+1;
const validSemester=value=>value===1||value===2;
const SHANGHAI_OFFSET=8*3600*1000;
const DAY=86400000;
function currentTerm(now){const date=new Date(now+SHANGHAI_OFFSET),year=date.getUTCFullYear(),month=date.getUTCMonth()+1;const start=month>=8?year:year-1;return{academicYear:`${start}-${start+1}`,semester:month>=8||month===1?1:2}}

async function groupScope(url,env,owner){
  const groupId=url.searchParams.get('groupId')||'all';
  const academicYear=url.searchParams.get('academicYear');
  const semesterValue=url.searchParams.get('semester');
  if((academicYear&&!validYear(academicYear))||(semesterValue&&!validSemester(Number(semesterValue)))||Boolean(academicYear)!==Boolean(semesterValue))return null;
  const semester=semesterValue?Number(semesterValue):null;
  if(groupId==='all')return{groupId,academicYear,semester};
  if(!groupPattern.test(groupId))return null;
  const row=await env.DB.prepare('SELECT id,academic_year,semester FROM teaching_groups WHERE id=? AND owner_id=?').bind(groupId,owner).first();
  return row&&(!academicYear||row.academic_year===academicYear&&row.semester===semester)?{groupId,academicYear,semester}:null;
}
const scopeBindings=(owner,scope)=>[owner,scope.academicYear,scope.academicYear,scope.semester,scope.semester,scope.groupId,scope.groupId];

function trendFromSessions(sessions,now){
  const localDay=new Date(now+SHANGHAI_OFFSET).toISOString().slice(0,10);
  const todayStart=Date.parse(localDay+'T00:00:00Z')-SHANGHAI_OFFSET;
  const firstStart=todayStart-13*DAY;
  const visitDays=Array(14).fill(0),learnerSets=Array.from({length:14},()=>new Set());
  const periodLearners=[new Set(),new Set()];
  for(const session of sessions){
    const index=Math.floor((session.started_at-firstStart)/DAY);
    if(index<0||index>=14)continue;
    visitDays[index]++;
    if(session.active_seconds>0){learnerSets[index].add(session.student_id);periodLearners[index<7?0:1].add(session.student_id)}
  }
  const labels=Array.from({length:7},(_,index)=>{
    const day=new Date(todayStart-(6-index)*DAY+SHANGHAI_OFFSET);
    return `${day.getUTCMonth()+1}/${day.getUTCDate()}`;
  });
  return {
    labels,
    visits:{previous:visitDays.slice(0,7),current:visitDays.slice(7)},
    learners:{previous:learnerSets.slice(0,7).map(set=>set.size),current:learnerSets.slice(7).map(set=>set.size),previousTotal:periodLearners[0].size,currentTotal:periodLearners[1].size}
  };
}

export async function adminRoute(request,env,url,now,cors,account,purgeExpired){
  const owner=account.employeeId;
  if(url.pathname==='/api/admin/me'&&request.method==='GET')
    return json({employeeId:owner,name:account.name,isAdmin:account.isAdmin},200,cors);
  if(url.pathname==='/api/admin/teachers'&&request.method==='GET'){
    if(!account.isAdmin)return json({error:'Administrator required'},403,cors);
    const result=await env.DB.prepare("SELECT employee_id AS employeeId,name,is_admin AS isAdmin,created_at AS createdAt FROM teacher_accounts WHERE active=1 ORDER BY CASE WHEN employee_id='2017011104' THEN 0 ELSE 1 END,created_at,employee_id").all();
    return json({teachers:(result.results||[]).map(row=>({...row,isAdmin:Boolean(row.isAdmin)}))},200,cors);
  }
  if(url.pathname==='/api/admin/teachers/create'&&request.method==='POST'){
    if(!account.isAdmin)return json({error:'Administrator required'},403,cors);
    const raw=await request.text();if(raw.length>2000)return json({error:'Teacher payload too large'},413,cors);
    const input=JSON.parse(raw),employeeId=input.employeeId,name=typeof input.name==='string'?normalize(input.name):'';
    if(!validEmployeeId(employeeId)||!validName(name))return json({error:'Invalid teacher details'},400,cors);
    const existing=await env.DB.prepare('SELECT employee_id FROM teacher_accounts WHERE employee_id=?').bind(employeeId).first();
    if(existing)return json({error:'Teacher already exists'},409,cors);
    const student=await env.DB.prepare('SELECT student_id FROM roster WHERE student_id=?').bind(employeeId).first();
    if(student)return json({error:'ID already belongs to a student'},409,cors);
    const password=initialPassword(),hash=await createPasswordHash(password);
    await env.DB.batch([
      env.DB.prepare('INSERT INTO teacher_accounts(employee_id,name,is_admin,created_at) VALUES(?,?,0,?)').bind(employeeId,name,now),
      env.DB.prepare('INSERT INTO teacher_credentials(employee_id,password_hash,must_change,updated_at) VALUES(?,?,1,?)').bind(employeeId,hash,now)
    ]);
    return json({employeeId,name,initialPassword:password,mustChange:true},201,cors);
  }
  if(url.pathname==='/api/admin/teachers/update'&&request.method==='POST'){
    if(!account.isAdmin)return json({error:'Administrator required'},403,cors);
    const raw=await request.text();if(raw.length>2000)return json({error:'Teacher payload too large'},413,cors);
    const input=JSON.parse(raw),employeeId=input.employeeId,newEmployeeId=input.newEmployeeId,name=typeof input.name==='string'?normalize(input.name):'';
    if(!validEmployeeId(employeeId)||!validEmployeeId(newEmployeeId)||!validName(name))return json({error:'Invalid teacher details'},400,cors);
    const existing=await env.DB.prepare('SELECT employee_id,is_admin FROM teacher_accounts WHERE employee_id=? AND active=1').bind(employeeId).first();
    if(!existing)return json({error:'Teacher not found'},404,cors);
    if(existing.is_admin)return json({error:'Administrator account cannot be edited here'},403,cors);
    if(employeeId!==newEmployeeId){
      const collision=await env.DB.prepare('SELECT employee_id FROM teacher_accounts WHERE employee_id=?').bind(newEmployeeId).first();
      const student=await env.DB.prepare('SELECT student_id FROM roster WHERE student_id=?').bind(newEmployeeId).first();
      if(collision||student)return json({error:'ID already in use'},409,cors);
      await env.DB.batch([
        env.DB.prepare('INSERT INTO teacher_accounts(employee_id,name,is_admin,active,created_at) SELECT ?,?,0,1,created_at FROM teacher_accounts WHERE employee_id=?').bind(newEmployeeId,name,employeeId),
        env.DB.prepare('UPDATE teacher_credentials SET employee_id=? WHERE employee_id=?').bind(newEmployeeId,employeeId),
        env.DB.prepare('UPDATE teaching_groups SET owner_id=? WHERE owner_id=?').bind(newEmployeeId,employeeId),
        env.DB.prepare('DELETE FROM teacher_sessions WHERE employee_id=?').bind(employeeId),
        env.DB.prepare('DELETE FROM teacher_accounts WHERE employee_id=?').bind(employeeId)
      ]);
    }else{
      await env.DB.batch([
        env.DB.prepare('UPDATE teacher_accounts SET name=? WHERE employee_id=?').bind(name,employeeId),
        env.DB.prepare('DELETE FROM teacher_sessions WHERE employee_id=?').bind(employeeId)
      ]);
    }
    return json({employeeId:newEmployeeId,name},200,cors);
  }
  if(url.pathname==='/api/admin/teachers/delete'&&request.method==='POST'){
    if(!account.isAdmin)return json({error:'Administrator required'},403,cors);
    const raw=await request.text();if(raw.length>2000)return json({error:'Teacher payload too large'},413,cors);
    const employeeId=JSON.parse(raw).employeeId;
    if(!validEmployeeId(employeeId))return json({error:'Invalid teacher details'},400,cors);
    const existing=await env.DB.prepare('SELECT is_admin FROM teacher_accounts WHERE employee_id=? AND active=1').bind(employeeId).first();
    if(!existing)return json({error:'Teacher not found'},404,cors);
    if(existing.is_admin)return json({error:'Administrator account cannot be deleted here'},403,cors);
    await env.DB.batch([
      env.DB.prepare('DELETE FROM teacher_sessions WHERE employee_id=?').bind(employeeId),
      env.DB.prepare('DELETE FROM teacher_credentials WHERE employee_id=?').bind(employeeId),
      env.DB.prepare('UPDATE teacher_accounts SET active=0 WHERE employee_id=?').bind(employeeId)
    ]);
    return json({deleted:true},200,cors);
  }
  if(url.pathname==='/api/admin/groups/create'&&request.method==='POST'){
    const raw=await request.text();if(raw.length>2000)return json({error:'Group payload too large'},413,cors);
    const input=JSON.parse(raw),label=typeof input.label==='string'?normalize(input.label):'';
    const defaultTerm=currentTerm(now),academicYear=input.academicYear??defaultTerm.academicYear,semester=input.semester??defaultTerm.semester;
    if(!label||label.length>100||/[\u0000-\u001f\u007f]/.test(label)||!validYear(academicYear)||!validSemester(semester)||!['excel','manual'].includes(input.sourceKind))return json({error:'Invalid teaching class'},400,cors);
    const existing=await env.DB.prepare('SELECT id FROM teaching_groups WHERE owner_id=? AND academic_year=? AND semester=? AND label=?').bind(owner,academicYear,semester,label).first();
    if(existing)return json({id:existing.id,label,existing:true},200,cors);
    const id=crypto.randomUUID();
    await env.DB.prepare('INSERT INTO teaching_groups(id,owner_id,label,academic_year,semester,source_kind,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)').bind(id,owner,label,academicYear,semester,input.sourceKind,now,now).run();
    return json({id,label},201,cors);
  }
  if(url.pathname==='/api/admin/roster/import'&&request.method==='POST'){
    const raw=await request.text();if(raw.length>30000)return json({error:'Roster chunk too large'},413,cors);
    const input=JSON.parse(raw);
    if(!groupPattern.test(input.groupId||''))return json({error:'Teaching group required'},400,cors);
    const group=await env.DB.prepare('SELECT id FROM teaching_groups WHERE id=? AND owner_id=?').bind(input.groupId,owner).first();
    if(!group)return json({error:'Teaching group not found'},404,cors);
    if(!Array.isArray(input.students)||input.students.length<1||input.students.length>50)return json({error:'Invalid roster chunk'},400,cors);
    const seen=new Set(),entries=[];
    for(const student of input.students){
      if(!validStudentId(student.studentId)||!validName(student.name)||!validClass(student.className)||seen.has(student.studentId)||student.position!==undefined&&(!Number.isInteger(student.position)||student.position<1||student.position>100000))return json({error:'Invalid or duplicate roster row'},400,cors);
      seen.add(student.studentId);entries.push({id:student.studentId,name:normalize(student.name),className:student.className.trim(),position:student.position});
    }
    const nextRow=await env.DB.prepare('SELECT COALESCE(MAX(position),0) AS lastPosition FROM teaching_group_students WHERE group_id=?').bind(input.groupId).first();
    let nextPosition=Number(nextRow?.lastPosition||0);
    await env.DB.batch([
      ...entries.flatMap(student=>[
        env.DB.prepare('INSERT INTO roster(student_id,name,cohort,imported_at) VALUES(?,?,?,?) ON CONFLICT(student_id) DO UPDATE SET name=excluded.name,cohort=excluded.cohort,imported_at=excluded.imported_at').bind(student.id,student.name,student.className,now),
        student.position===undefined?
          env.DB.prepare('INSERT INTO teaching_group_students(group_id,student_id,position) VALUES(?,?,?) ON CONFLICT(group_id,student_id) DO NOTHING').bind(input.groupId,student.id,++nextPosition):
          env.DB.prepare('INSERT INTO teaching_group_students(group_id,student_id,position) VALUES(?,?,?) ON CONFLICT(group_id,student_id) DO UPDATE SET position=excluded.position').bind(input.groupId,student.id,student.position),
        env.DB.prepare('UPDATE students SET name=?,cohort=? WHERE student_id=?').bind(student.name,student.className,student.id)
      ]),
      env.DB.prepare('UPDATE teaching_groups SET updated_at=? WHERE id=?').bind(now,input.groupId)
    ]);
    return json({imported:entries.length},200,cors);
  }
  if(url.pathname==='/api/admin/groups'&&request.method==='GET'){
    const result=await env.DB.prepare(`SELECT g.id,g.label,g.academic_year AS academicYear,g.semester,g.source_kind AS sourceKind,g.created_at AS createdAt,
      COUNT(gs.student_id) AS students FROM teaching_groups g
      LEFT JOIN teaching_group_students gs ON gs.group_id=g.id
      WHERE g.owner_id=? GROUP BY g.id ORDER BY g.academic_year DESC,g.semester DESC,g.created_at DESC`).bind(owner).all();
    return json({groups:result.results||[]},200,cors);
  }
  if(url.pathname==='/api/admin/roster/summary'&&request.method==='GET'){
    const scope=await groupScope(url,env,owner);
    if(!scope)return json({error:'Teaching class not found'},404,cors);
    const result=await env.DB.prepare(`SELECT r.cohort,COUNT(DISTINCT r.student_id) AS students
      FROM roster r JOIN teaching_group_students gs ON gs.student_id=r.student_id
      JOIN teaching_groups g ON g.id=gs.group_id
      WHERE g.owner_id=? AND (? IS NULL OR g.academic_year=?) AND (? IS NULL OR g.semester=?) AND (?='all' OR g.id=?)
      GROUP BY r.cohort`).bind(...scopeBindings(owner,scope)).all();
    return json({cohorts:result.results||[]},200,cors);
  }
  if(url.pathname==='/api/admin/students/remove'&&request.method==='POST'){
    const raw=await request.text();if(raw.length>2000)return json({error:'Student payload too large'},413,cors);
    const input=JSON.parse(raw);
    if(!validStudentId(input.studentId))return json({error:'Invalid student'},400,cors);
    const memberships=await env.DB.prepare(`SELECT DISTINCT g.owner_id AS ownerId FROM teaching_group_students gs
      JOIN teaching_groups g ON g.id=gs.group_id WHERE gs.student_id=?`).bind(input.studentId).all();
    const owners=memberships.results||[];
    if(!owners.some(row=>row.ownerId===owner))return json({error:'Student not in your teaching classes'},404,cors);
    if(!account.isAdmin&&owners.some(row=>row.ownerId!==owner))return json({error:'Student also belongs to another teacher; contact administrator'},409,cors);
    const submissions=await env.DB.prepare('SELECT object_key FROM submissions WHERE student_id=?').bind(input.studentId).all();
    if((submissions.results||[]).length&&!env.ASSIGNMENTS)return json({error:'Image storage unavailable'},503,cors);
    for(const row of submissions.results||[])await env.ASSIGNMENTS.delete(row.object_key);
    await env.DB.batch([
      env.DB.prepare('DELETE FROM submissions WHERE student_id=?').bind(input.studentId),
      env.DB.prepare('DELETE FROM page_activity WHERE session_id IN (SELECT id FROM sessions WHERE student_id=?)').bind(input.studentId),
      env.DB.prepare('DELETE FROM sessions WHERE student_id=?').bind(input.studentId),
      env.DB.prepare('DELETE FROM teaching_group_students WHERE student_id=?').bind(input.studentId),
      env.DB.prepare('DELETE FROM student_accounts WHERE student_id=?').bind(input.studentId),
      env.DB.prepare('DELETE FROM roster WHERE student_id=?').bind(input.studentId),
      env.DB.prepare('DELETE FROM students WHERE student_id=?').bind(input.studentId)
    ]);
    return json({deleted:true},200,cors);
  }
  if(url.pathname==='/api/admin/summary'&&request.method==='GET'){
    const scope=await groupScope(url,env,owner);
    if(!scope)return json({error:'Teaching class not found'},404,cors);
    await purgeExpired(env,now);
    const selected=`SELECT gs.student_id,MIN(g.created_at) AS group_created,MIN(gs.position) AS row_position FROM teaching_group_students gs
      JOIN teaching_groups g ON g.id=gs.group_id WHERE g.owner_id=? AND (? IS NULL OR g.academic_year=?)
      AND (? IS NULL OR g.semester=?) AND (?='all' OR g.id=?) GROUP BY gs.student_id`;
    const result=await env.DB.prepare(`WITH selected AS (${selected}),
      ses AS (SELECT student_id,COUNT(*) AS sessions,SUM(active_seconds) AS total_seconds,MAX(last_seen) AS last_seen
        FROM sessions WHERE student_id IN (SELECT student_id FROM selected) GROUP BY student_id),
      pages AS (SELECT s.student_id,
        SUM(CASE WHEN p.page LIKE 'lecture-%' THEN p.active_seconds ELSE 0 END) AS lecture_seconds,
        SUM(CASE WHEN p.page LIKE 'example-%' THEN p.active_seconds ELSE 0 END) AS example_seconds,
        SUM(CASE WHEN p.page LIKE 'ex-%' THEN p.active_seconds ELSE 0 END) AS assignment_seconds
        FROM page_activity p JOIN sessions s ON s.id=p.session_id
        WHERE s.student_id IN (SELECT student_id FROM selected) GROUP BY s.student_id)
      SELECT r.student_id AS studentId,r.name,r.cohort,COALESCE(ses.sessions,0) AS sessions,
        COALESCE(ses.total_seconds,0) AS totalSeconds,COALESCE(pages.lecture_seconds,0) AS lectureSeconds,
        COALESCE(pages.example_seconds,0) AS exampleSeconds,COALESCE(pages.assignment_seconds,0) AS assignmentSeconds,
        ses.last_seen AS lastSeen FROM selected JOIN roster r ON r.student_id=selected.student_id
      LEFT JOIN ses ON ses.student_id=r.student_id LEFT JOIN pages ON pages.student_id=r.student_id
      ORDER BY selected.group_created,selected.row_position,r.student_id`).bind(...scopeBindings(owner,scope)).all();
    const localDay=new Date(now+SHANGHAI_OFFSET).toISOString().slice(0,10);
    const start=Date.parse(localDay+'T00:00:00Z')-SHANGHAI_OFFSET-13*DAY;
    const daily=await env.DB.prepare(`WITH selected AS (${selected})
      SELECT student_id,started_at,active_seconds FROM sessions
      WHERE student_id IN (SELECT student_id FROM selected) AND started_at>=?`).bind(...scopeBindings(owner,scope),start).all();
    return json({students:result.results||[],trend:trendFromSessions(daily.results||[],now)},200,cors);
  }
  return json({error:'Not found'},404,cors);
}
