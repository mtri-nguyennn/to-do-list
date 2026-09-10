import { createHmac, timingSafeEqual, randomUUID } from 'node:crypto';
import { query } from '../lib/database.js';
const local = () => process.env.LOCAL_DATABASE === '1' && !process.env.VERCEL && !process.env.RENDER && process.env.NODE_ENV !== 'production';
const signature = value => createHmac('sha256', process.env.SESSION_SECRET).update(value).digest('hex');
const equal = (a,b) => { const x=Buffer.from(typeof a==='string'?a:''), y=Buffer.from(typeof b==='string'?b:''); return x.length===y.length && timingSafeEqual(x,y); };
function authorized(req) {
  if (local()) return true;
  const token = (req.headers.cookie || '').split('; ').find(x=>x.startsWith('coursework='))?.slice(11) || '';
  const [expiry, mac] = token.split('.');
  return /^\d+$/.test(expiry || '') && Number(expiry)>Date.now() && equal(mac, signature(expiry));
}
function value(input, max) { if(typeof input!=='string' || !input.trim() || input.trim().length>max) throw Object.assign(new Error(`Enter text between 1 and ${max} characters.`),{status:400}); return input.trim(); }
export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  const send = (status,data) => res.status(status).json(data);
  try {
    if (!local() && (!process.env.APP_PASSWORD || (process.env.SESSION_SECRET || '').length<32)) return send(503,{error:'Set up the workspace password and session secret before using the app.'});
    if (!['GET','POST'].includes(req.method)) return send(405,{error:'Method not allowed'});
    if(req.method==='POST' && !String(req.headers['content-type'] || '').startsWith('application/json')) return send(415,{error:'JSON required'});
    const body = req.body || {};
    if (req.method==='POST' && body.action==='login') {
      if (!local() && !equal(body.password,process.env.APP_PASSWORD)) return send(401,{error:'That password is incorrect.'});
      if(!local()) { const expires=String(Date.now()+7*86400000); res.setHeader('Set-Cookie',`coursework=${expires}.${signature(expires)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=604800`); }
      return send(200,{ok:true});
    }
    if(!authorized(req)) return send(401,{error:'Please unlock your workspace.'});
    if(req.method==='GET') {
      const courses=await query('SELECT * FROM courses ORDER BY created_at, id');
      const tasks=await query('SELECT * FROM tasks ORDER BY created_at, id');
      return send(200,{courses,tasks,local:local()});
    }
    let result;
    switch(body.action) {
      case 'logout': res.setHeader('Set-Cookie','coursework=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0'); return send(200,{ok:true});
      case 'createCourse': {
        const colors=['blue','purple','orange','green','pink'];
        result=await query('INSERT INTO courses(id,name,description,color) VALUES(?,?,?,?) RETURNING *',[randomUUID(),value(body.name,80),typeof body.description==='string'?body.description.trim().slice(0,160):'',colors.includes(body.color)?body.color:'blue']); break;
      }
      case 'renameCourse': result=await query('UPDATE courses SET name=? WHERE id=? RETURNING *',[value(body.name,80),value(body.id,100)]); break;
      case 'deleteCourse': result=await query('DELETE FROM courses WHERE id=? RETURNING id',[value(body.id,100)]); break;
      case 'createTask': {
        const due=body.due_date || null;
        if(due && (typeof due!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(due) || !Number.isFinite(Date.parse(due)) || new Date(due).toISOString().slice(0,10)!==due)) return send(400,{error:'Choose a valid due date.'});
        const course=value(body.course_id,100);
        if(!(await query('SELECT id FROM courses WHERE id=?',[course])).length) return send(404,{error:'Course no longer exists.'});
        result=await query('INSERT INTO tasks(id,course_id,title,due_date) VALUES(?,?,?,?) RETURNING *',[randomUUID(),course,value(body.title,300),due]); break;
      }
      case 'toggleTask': if(typeof body.done!=='boolean') return send(400,{error:'Invalid completion state'}); result=await query('UPDATE tasks SET done=? WHERE id=? RETURNING *',[Number(body.done),value(body.id,100)]); break;
      case 'renameTask': result=await query('UPDATE tasks SET title=? WHERE id=? RETURNING *',[value(body.title,300),value(body.id,100)]); break;
      case 'deleteTask': result=await query('DELETE FROM tasks WHERE id=? RETURNING id',[value(body.id,100)]); break;
      default: return send(400,{error:'Unknown action'});
    }
    if(!result.length) return send(404,{error:'This item no longer exists. Refresh and try again.'});
    return send(200,{result:result[0]});
  } catch(error) { console.error(error.message); return send(error.status || 503,{error:error.status?error.message:'Unable to save or load your data. Please try again.'}); }
}
