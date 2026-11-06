import {assignmentRoute,purgeAssignments} from './assignment-api.js';
import {createPasswordHash,validPassword,validStudentPassword,verifyPassword} from './password.js';
import {adminRoute} from './teacher-admin.js';
const DEFAULT_ORIGIN='https://christinatang32-hue.github.io';
const encoder=new TextEncoder();
const json=(body,status=200,headers={})=>Response.json(body,{status,headers:{'Cache-Control':'no-store',...headers}});
const tokenHash=async token=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(token))),v=>v.toString(16).padStart(2,'0')).join('');
const randomToken=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),v=>v.toString(16).padStart(2,'0')).join('');
const validStudentId=id=>typeof id==='string'&&/^[0-9A-Za-z-]{4,24}$/.test(id);
const validName=name=>typeof name==='string'&&name.trim().length>=2&&name.trim().length<=30&&!/[\u0000-\u001f\u007f]/.test(name);
const validPage=page=>typeof page==='string'&&/^[A-Za-z0-9_.()-]{1,80}\.html$/.test(page);
const validCohort=cohort=>typeof cohort==='string'&&/^[\p{L}\p{N}\s_-]{1,40}$/u.test(cohort.trim());
const normalizedName=name=>name.trim().replace(/\s+/g,' ');
const validPhone=phone=>typeof phone==='string'&&(phone===''||/^1[3-9]\d{9}$/.test(phone));
async function readJson(request,limit=4096){
  const raw=await request.text();
  if(raw.length>limit)throw new RangeError('Payload too large');
  return JSON.parse(raw);
}
const fiveYearCutoff=now=>{const date=new Date(now);date.setUTCFullYear(date.getUTCFullYear()-5);return date.getTime()};
async function teacher(request,env,now){
  const id=request.headers.get('X-Session-Id')||'';
  const token=(request.headers.get('Authorization')||'').replace(/^Bearer /,'');
  if(!id||!token)return null;
  const row=await env.DB.prepare('SELECT s.employee_id,s.token_hash,s.started_at,c.must_change,a.name,a.is_admin FROM teacher_sessions s JOIN teacher_credentials c ON c.employee_id=s.employee_id JOIN teacher_accounts a ON a.employee_id=s.employee_id WHERE s.id=?').bind(id).first();
  if(!row||row.token_hash!==await tokenHash(token)||now-row.started_at>12*3600*1000)return null;
  return {employeeId:row.employee_id,name:row.name,isAdmin:Boolean(row.is_admin),mustChange:Boolean(row.must_change),sessionId:id};
}
async function purgeExpired(env,now){
  const cutoff=fiveYearCutoff(now);
  await purgeAssignments(env,cutoff);
  await env.DB.batch([
    env.DB.prepare('DELETE FROM page_activity WHERE session_id IN (SELECT id FROM sessions WHERE started_at < ?)').bind(cutoff),
    env.DB.prepare('DELETE FROM sessions WHERE started_at < ?').bind(cutoff),
    env.DB.prepare('DELETE FROM teacher_sessions WHERE started_at < ?').bind(cutoff),
    env.DB.prepare('DELETE FROM teaching_group_students WHERE group_id IN (SELECT id FROM teaching_groups WHERE updated_at < ?)').bind(cutoff),
    env.DB.prepare('DELETE FROM teaching_groups WHERE updated_at < ?').bind(cutoff),
    env.DB.prepare('DELETE FROM roster WHERE imported_at < ?').bind(cutoff),
    env.DB.prepare('DELETE FROM teaching_group_students WHERE NOT EXISTS (SELECT 1 FROM roster WHERE roster.student_id=teaching_group_students.student_id)'),
    env.DB.prepare('DELETE FROM student_accounts WHERE NOT EXISTS (SELECT 1 FROM roster WHERE roster.student_id=student_accounts.student_id)'),
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
      if(url.pathname==='/api/student/register'&&request.method==='POST'){
        const input=await readJson(request);
        if(!validStudentId(input.studentId)||!validName(input.name)||!validCohort(input.className)||!validPhone(input.phone)||!validStudentPassword(input.password)||input.password!==input.confirmPassword)
          return json({error:'Invalid registration'},400,cors);
        const roster=await env.DB.prepare('SELECT name,cohort FROM roster WHERE student_id=?').bind(input.studentId).first();
        if(!roster||normalizedName(input.name)!==roster.name||input.className.trim()!==roster.cohort)
          return json({error:'Not in roster'},403,cors);
        const existing=await env.DB.prepare('SELECT student_id FROM student_accounts WHERE student_id=?').bind(input.studentId).first();
        if(existing)return json({error:'Already registered'},409,cors);
        const passwordHash=await createPasswordHash(input.password);
        const result=await env.DB.prepare('INSERT INTO student_accounts(student_id,password_hash,phone,registered_at,last_login) VALUES(?,?,?,?,NULL) ON CONFLICT(student_id) DO NOTHING')
          .bind(input.studentId,passwordHash,input.phone,now).run();
        if(result.meta?.changes===0)return json({error:'Already registered'},409,cors);
        return json({registered:true},201,cors);
      }
      if(url.pathname==='/api/session/start'&&request.method==='POST'){
        const input=await readJson(request);
        if(!validStudentId(input.studentId)||!validName(input.name)||typeof input.password!=='string'||input.password.length>128)return json({error:'Invalid login'},400,cors);
        const id=input.studentId,teacherAccount=await env.DB.prepare('SELECT name FROM teacher_accounts WHERE employee_id=?').bind(id).first();
        if(teacherAccount){
          const credential=await env.DB.prepare('SELECT password_hash,must_change FROM teacher_credentials WHERE employee_id=?').bind(id).first();
          if(normalizedName(input.name)!==teacherAccount.name||!credential||!await verifyPassword(input.password,credential.password_hash))return json({error:'Invalid credentials'},403,cors);
          const sessionId=crypto.randomUUID(),token=randomToken();
          await env.DB.prepare('INSERT INTO teacher_sessions(id,employee_id,token_hash,started_at,last_seen) VALUES(?,?,?,?,?)')
            .bind(sessionId,id,await tokenHash(token),now,now).run();
          return json({role:'teacher',sessionId,token,mustChange:Boolean(credential.must_change)},201,cors);
        }
        const roster=await env.DB.prepare('SELECT name,cohort FROM roster WHERE student_id=?').bind(id).first();
        if(!roster||normalizedName(input.name)!==roster.name)return json({error:'Student not found in roster'},403,cors);
        const account=await env.DB.prepare('SELECT password_hash FROM student_accounts WHERE student_id=?').bind(id).first();
        if(!account)return json({error:'Registration required'},409,cors);
        if(!await verifyPassword(input.password,account.password_hash))return json({error:'Invalid credentials'},403,cors);
        const name=roster.name,cohort=roster.cohort,sessionId=crypto.randomUUID(),token=randomToken();
        await env.DB.batch([
          env.DB.prepare('INSERT INTO students(student_id,name,cohort,first_seen,last_seen) VALUES(?,?,?,?,?) ON CONFLICT(student_id) DO UPDATE SET name=excluded.name,cohort=excluded.cohort,last_seen=excluded.last_seen').bind(id,name,cohort,now,now),
          env.DB.prepare('INSERT INTO sessions(id,student_id,token_hash,started_at,last_seen,active_seconds) VALUES(?,?,?,?,?,0)').bind(sessionId,id,await tokenHash(token),now,now),
          env.DB.prepare('UPDATE student_accounts SET last_login=? WHERE student_id=?').bind(now,id)
        ]);
        return json({role:'student',sessionId,token},201,cors);
      }
      if(url.pathname==='/api/teacher/password/change'&&request.method==='POST'){
        const account=await teacher(request,env,now);
        if(!account)return json({error:'Unauthorized'},401,cors);
        const input=await readJson(request);
        if(!validPassword(input.newPassword)||input.newPassword!==input.confirmPassword||typeof input.currentPassword!=='string')return json({error:'Invalid password change'},400,cors);
        const credential=await env.DB.prepare('SELECT password_hash FROM teacher_credentials WHERE employee_id=?').bind(account.employeeId).first();
        if(!credential||!await verifyPassword(input.currentPassword,credential.password_hash))return json({error:'Current password incorrect'},403,cors);
        if(input.currentPassword===input.newPassword)return json({error:'Choose a different password'},400,cors);
        const passwordHash=await createPasswordHash(input.newPassword);
        await env.DB.batch([
          env.DB.prepare('UPDATE teacher_credentials SET password_hash=?,must_change=0,updated_at=? WHERE employee_id=?').bind(passwordHash,now,account.employeeId),
          env.DB.prepare('DELETE FROM teacher_sessions WHERE employee_id=? AND id<>?').bind(account.employeeId,account.sessionId)
        ]);
        return json({changed:true},200,cors);
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
      if(url.pathname.startsWith('/api/admin/')){
        const account=await teacher(request,env,now);
        if(!account)return json({error:'Unauthorized'},401,cors);
        if(account.mustChange)return json({error:'Password change required'},403,cors);
        return adminRoute(request,env,url,now,cors,account,purgeExpired);
      }
      return json({error:'Not found'},404,cors);
    }catch(error){
      if(error instanceof RangeError)return json({error:'Payload too large'},413,cors);
      if(error instanceof SyntaxError)return json({error:'Invalid JSON'},400,cors);
      console.error('Service error',error?.name,error?.message);
      return json({error:'Service unavailable'},503,cors);
    }
  },
  async scheduled(_controller,env){if(env.DB)await purgeExpired(env,Date.now())}
};
