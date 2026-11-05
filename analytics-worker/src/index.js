import {assignmentRoute,purgeAssignments} from './assignment-api.js';
const DEFAULT_ORIGIN='https://jackinthebox771.github.io';
const encoder=new TextEncoder();
const json=(body,status=200,headers={})=>Response.json(body,{status,headers:{'Cache-Control':'no-store',...headers}});
const tokenHash=async token=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(token))),v=>v.toString(16).padStart(2,'0')).join('');
const randomToken=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),v=>v.toString(16).padStart(2,'0')).join('');
const validStudentId=id=>typeof id==='string'&&/^[0-9A-Za-z-]{4,24}$/.test(id);
const validName=name=>typeof name==='string'&&name.trim().length>=2&&name.trim().length<=30&&!/[\u0000-\u001f\u007f]/.test(name);
const validPage=page=>typeof page==='string'&&/^[A-Za-z0-9_.()-]{1,80}\.html$/.test(page);
const validCohort=cohort=>typeof cohort==='string'&&/^[\p{L}\p{N}\s_-]{2,40}$/u.test(cohort.trim());
const normalizedName=name=>name.trim().replace(/\s+/g,' ');
const threeYearCutoff=now=>{const date=new Date(now);date.setUTCFullYear(date.getUTCFullYear()-3);return date.getTime()};
async function purgeExpired(env,now){
  const cutoff=threeYearCutoff(now);
  await purgeAssignments(env,cutoff);
  await env.DB.batch([
    env.DB.prepare('DELETE FROM page_activity WHERE session_id IN (SELECT id FROM sessions WHERE started_at < ?)').bind(cutoff),
    env.DB.prepare('DELETE FROM sessions WHERE started_at < ?').bind(cutoff),
    env.DB.prepare('DELETE FROM roster WHERE imported_at < ?').bind(cutoff),
    env.DB.prepare('DELETE FROM students WHERE NOT EXISTS (SELECT 1 FROM sessions WHERE sessions.student_id=students.student_id) AND NOT EXISTS (SELECT 1 FROM submissions WHERE submissions.student_id=students.student_id)'),
    env.DB.prepare('UPDATE students SET first_seen=(SELECT MIN(started_at) FROM sessions WHERE sessions.student_id=students.student_id),last_seen=(SELECT MAX(last_seen) FROM sessions WHERE sessions.student_id=students.student_id) WHERE EXISTS (SELECT 1 FROM sessions WHERE sessions.student_id=students.student_id)')
  ]);
}

export default {
  async fetch(request,env){
    const origin=request.headers.get('Origin');
    const allowed=env.ALLOWED_ORIGIN||DEFAULT_ORIGIN;
    if(origin&&origin!==allowed)return json({error:'Origin not allowed'},403);
    const cors=origin?{'Access-Control-Allow-Origin':allowed,'Vary':'Origin'}:{};
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...cors,'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization, X-Session-Id','Access-Control-Max-Age':'86400'}});
    if(!env.DB)return json({error:'Database not configured'},503,cors);
    const url=new URL(request.url),now=Date.now();
    try{
      if(url.pathname.startsWith('/api/assignment/'))return await assignmentRoute(request,env,url,now,cors);
      if(url.pathname==='/api/session/start'&&request.method==='POST'){
        const input=await request.json();
        if(!validStudentId(input.studentId)||!validName(input.name))return json({error:'Invalid student registration'},400,cors);
        const id=input.studentId,roster=await env.DB.prepare('SELECT name,cohort FROM roster WHERE student_id=?').bind(id).first();
        if(!roster||normalizedName(input.name)!==roster.name)return json({error:'Student not found in roster'},403,cors);
        const name=roster.name,cohort=roster.cohort,sessionId=crypto.randomUUID(),token=randomToken();
        await env.DB.batch([
          env.DB.prepare('INSERT INTO students(student_id,name,cohort,first_seen,last_seen) VALUES(?,?,?,?,?) ON CONFLICT(student_id) DO UPDATE SET name=excluded.name,cohort=excluded.cohort,last_seen=excluded.last_seen').bind(id,name,cohort,now,now),
          env.DB.prepare('INSERT INTO sessions(id,student_id,token_hash,started_at,last_seen,active_seconds) VALUES(?,?,?,?,?,0)').bind(sessionId,id,await tokenHash(token),now,now)
        ]);
        return json({sessionId,token},201,cors);
      }
      if(url.pathname==='/api/session/heartbeat'&&request.method==='POST'){
        const raw=await request.text();if(raw.length>2048)return json({error:'Payload too large'},413,cors);
        const input=JSON.parse(raw),seconds=Number(input.activeSeconds);
        if(typeof input.sessionId!=='string'||typeof input.token!=='string'||!validPage(input.page)||!Number.isInteger(seconds)||seconds<0||seconds>30)return json({error:'Invalid heartbeat'},400,cors);
        const session=await env.DB.prepare('SELECT token_hash,started_at,last_seen,student_id FROM sessions WHERE id=?').bind(input.sessionId).first();
        if(!session||session.token_hash!==await tokenHash(input.token)||now-session.started_at>12*3600*1000)return json({error:'Session expired'},401,cors);
        const elapsed=Math.max(0,Math.floor((now-session.last_seen)/1000));
        const credited=Math.min(seconds,elapsed+1,30);
        await env.DB.batch([
          env.DB.prepare('UPDATE sessions SET last_seen=?,active_seconds=active_seconds+? WHERE id=?').bind(now,credited,input.sessionId),
          env.DB.prepare('INSERT INTO page_activity(session_id,page,first_seen,last_seen,active_seconds) VALUES(?,?,?,?,?) ON CONFLICT(session_id,page) DO UPDATE SET last_seen=excluded.last_seen,active_seconds=page_activity.active_seconds+excluded.active_seconds').bind(input.sessionId,input.page,now,now,credited),
          env.DB.prepare('UPDATE students SET last_seen=? WHERE student_id=?').bind(now,session.student_id)
        ]);
        return json({credited},200,cors);
      }
      if(url.pathname==='/api/admin/roster/import'&&request.method==='POST'){
        if(!env.ADMIN_TOKEN||request.headers.get('Authorization')!=='Bearer '+env.ADMIN_TOKEN)return json({error:'Unauthorized'},401,cors);
        const raw=await request.text();if(raw.length>30000)return json({error:'Roster chunk too large'},413,cors);
        const input=JSON.parse(raw);
        if(!validCohort(input.cohort)||!Array.isArray(input.students)||input.students.length<1||input.students.length>100)return json({error:'Invalid roster chunk'},400,cors);
        const cohort=input.cohort.trim(),seen=new Set(),entries=[];
        for(const student of input.students){
          if(!validStudentId(student.studentId)||!validName(student.name)||seen.has(student.studentId))return json({error:'Invalid or duplicate roster row'},400,cors);
          seen.add(student.studentId);entries.push({id:student.studentId,name:normalizedName(student.name)});
        }
        await env.DB.batch(entries.map(student=>env.DB.prepare('INSERT INTO roster(student_id,name,cohort,imported_at) VALUES(?,?,?,?) ON CONFLICT(student_id) DO UPDATE SET name=excluded.name,cohort=excluded.cohort,imported_at=excluded.imported_at').bind(student.id,student.name,cohort,now)));
        return json({imported:entries.length,cohort},200,cors);
      }
      if(url.pathname==='/api/admin/roster/summary'&&request.method==='GET'){
        if(!env.ADMIN_TOKEN||request.headers.get('Authorization')!=='Bearer '+env.ADMIN_TOKEN)return json({error:'Unauthorized'},401,cors);
        await purgeExpired(env,now);
        const result=await env.DB.prepare('SELECT cohort,COUNT(*) AS students,MAX(imported_at) AS lastImport FROM roster GROUP BY cohort ORDER BY cohort DESC').all();
        return json({cohorts:result.results||[]},200,cors);
      }
      if(url.pathname==='/api/admin/summary'&&request.method==='GET'){
        const supplied=request.headers.get('Authorization')||'';
        if(!env.ADMIN_TOKEN||supplied!=='Bearer '+env.ADMIN_TOKEN)return json({error:'Unauthorized'},401,cors);
        await purgeExpired(env,now);
        const query=`WITH ses AS (
            SELECT student_id,COUNT(*) AS sessions,SUM(active_seconds) AS total_seconds,MAX(last_seen) AS last_seen
            FROM sessions GROUP BY student_id
          ), pages AS (
            SELECT s.student_id,
              SUM(CASE WHEN p.page LIKE 'lecture-%' THEN p.active_seconds ELSE 0 END) AS lecture_seconds,
              SUM(CASE WHEN p.page LIKE 'example-%' THEN p.active_seconds ELSE 0 END) AS example_seconds,
              SUM(CASE WHEN p.page LIKE 'ex-%' THEN p.active_seconds ELSE 0 END) AS assignment_seconds
            FROM page_activity p JOIN sessions s ON s.id=p.session_id GROUP BY s.student_id
          )
          SELECT st.student_id AS studentId,st.name,st.cohort,COALESCE(ses.sessions,0) AS sessions,
            COALESCE(ses.total_seconds,0) AS totalSeconds,COALESCE(pages.lecture_seconds,0) AS lectureSeconds,
            COALESCE(pages.example_seconds,0) AS exampleSeconds,COALESCE(pages.assignment_seconds,0) AS assignmentSeconds,
            ses.last_seen AS lastSeen
          FROM students st LEFT JOIN ses ON ses.student_id=st.student_id
          LEFT JOIN pages ON pages.student_id=st.student_id ORDER BY ses.last_seen DESC`;
        const result=await env.DB.prepare(query).all();
        return json({students:result.results||[]},200,cors);
      }
      return json({error:'Not found'},404,cors);
    }catch(error){
      if(error instanceof SyntaxError)return json({error:'Invalid JSON'},400,cors);
      return json({error:'Service unavailable'},503,cors);
    }
  },
  async scheduled(_controller,env){if(env.DB)await purgeExpired(env,Date.now())}
};
