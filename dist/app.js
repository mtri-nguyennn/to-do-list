const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let state={courses:[],tasks:[]}, selected=null, editing, deleting;
async function api(body) {
 const r=await fetch('/api',body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{});
 const data=await r.json();
 if(r.status===401){if(!$('#login-dialog').open)$('#login-dialog').showModal();throw Error(data.error);}
 if(!r.ok)throw Error(data.error || 'Something went wrong. Try again.');
 return data;
}
function error(e){$('#error').textContent=e.message;$('#error').hidden=false;}
async function load(){state=await api();$('#error').hidden=true;$('#storage-label').textContent=state.local?'Saved on this computer':'Saved to your database';$('#logout').hidden=state.local;render();}
function render(){
 const done=state.tasks.filter(t=>t.done).length,pct=state.tasks.length?Math.round(done/state.tasks.length*100):0;
 $('#stat-courses').textContent=state.courses.length;$('#course-count').textContent=state.courses.length;
 $('#stat-open').textContent=state.tasks.length-done;$('#stat-done').textContent=done;$('#stat-progress').textContent=pct+'%';$('#overall-bar').style.width=pct+'%';
 const course=state.courses.find(c=>c.id===selected);if(!course)selected=null;
 $('#overview').classList.toggle('active',!selected);$('#heading').textContent=course?course.name:'Your semester, in order.';
 $('#subtitle').textContent=course?(course.description || 'Your next steps, all in one place.'):'A place for every class. A plan for what’s next.';
 $('#breadcrumb').textContent=course?course.name:'All courses';$('#list-title').innerHTML=`${course?'Course checklist':'Your courses'} <span>${course?'1':state.courses.length}</span>`;
 $('#course-nav').innerHTML=state.courses.map(c=>`<button class="nav ${selected===c.id?'active':''}" data-select="${c.id}"><span class="dot ${esc(c.color)}"></span>${esc(c.name)}<span class="count">${state.tasks.filter(t=>t.course_id===c.id&&!t.done).length}</span></button>`).join('');
 const courses=course?[course]:state.courses;
 $('#courses').innerHTML=courses.length?courses.map(c=>{
 const tasks=state.tasks.filter(t=>t.course_id===c.id),completed=tasks.filter(t=>t.done).length;
 return `<article class="course-card ${esc(c.color)}"><div class="card-heading"><div class="course-symbol">▤</div><div class="course-title"><h3>${esc(c.name)}</h3><p>${esc(c.description || 'Class checklist')}</p></div><button class="icon" data-edit-course="${c.id}" aria-label="Rename ${esc(c.name)}">✎</button><button class="icon" data-delete-course="${c.id}" aria-label="Delete ${esc(c.name)}">×</button></div><div class="course-progress"><span>${completed} of ${tasks.length} completed</span><span>${tasks.length?Math.round(completed/tasks.length*100):0}%</span></div><progress value="${completed}" max="${tasks.length||1}"></progress><div class="task-list">${tasks.length?tasks.map(t=>`<div class="task ${t.done?'done':''}"><input type="checkbox" data-toggle="${t.id}" aria-label="Complete ${esc(t.title)}" ${t.done?'checked':''}><div class="task-text"><span>${esc(t.title)}</span>${t.due_date?`<small class="${!t.done&&t.due_date<localDate()?'overdue':''}">Due ${esc(t.due_date)}</small>`:''}</div><button class="icon" data-edit-task="${t.id}" aria-label="Rename task">✎</button><button class="icon" data-delete-task="${t.id}" aria-label="Delete task">×</button></div>`).join(''):'<p class="no-tasks">A fresh start. Add your first to-do below.</p>'}</div><form class="task-form" data-course="${c.id}"><input name="title" placeholder="Add a subtask…" aria-label="New subtask for ${esc(c.name)}" maxlength="300" required><div class="task-form-bottom"><input type="date" name="due_date" aria-label="Optional due date"><button type="submit" class="small-button">＋ Add task</button></div><p class="form-error" role="alert"></p></form></article>`;
 }).join(''):'<div class="empty"><div class="empty-icon">▤</div><h2>A new semester starts here.</h2><p>Create a course like BUS 1299, then add your assignments,<br>readings, and everything in between.</p><button class="primary" id="empty-add">＋ Create your first course</button></div>';
}
function localDate(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function openCourse(){$('#course-form').reset();$('#course-form .form-error').textContent='';$('#course-dialog').showModal();}
for(const id of ['#new-course','#add-course','#sidebar-add'])$(id).onclick=openCourse;
$('#overview').onclick=()=>{selected=null;render();};
document.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.classList.contains('close-dialog'))b.closest('dialog').close();
 if(b.id==='empty-add')openCourse();
 if(b.dataset.select){selected=b.dataset.select;render();}
 for(const kind of ['Course','Task']){
 const id=b.dataset['edit'+kind];if(id){const item=state[kind==='Course'?'courses':'tasks'].find(x=>x.id===id);editing={action:'rename'+kind,id};$('#edit-form input').value=item.name||item.title;$('#edit-form input').maxLength=kind==='Course'?80:300;$('#edit-form .form-error').textContent='';$('#edit-dialog').showModal();}
 const del=b.dataset['delete'+kind];if(del){deleting={action:'delete'+kind,id:del};$('#delete-message').textContent=kind==='Course'?'This course and all its subtasks will be permanently deleted.':'This subtask will be permanently deleted.';$('#delete-form .form-error').textContent='';$('#delete-dialog').showModal();}
 }
});
document.addEventListener('change',async e=>{if(e.target.dataset.toggle){e.target.disabled=true;try{await api({action:'toggleTask',id:e.target.dataset.toggle,done:e.target.checked});await load();}catch(err){e.target.checked=!e.target.checked;e.target.disabled=false;error(err);}}});
document.addEventListener('submit',async e=>{
 e.preventDefault();const form=e.target,button=form.querySelector('[type="submit"]')||form.querySelector('button.primary');if(button)button.disabled=true;
 const fields=Object.fromEntries(new FormData(form));const msg=form.querySelector('.form-error');if(msg)msg.textContent='';
 try{
 if(form.id==='course-form')await api({action:'createCourse',...fields});
 else if(form.classList.contains('task-form'))await api({action:'createTask',course_id:form.dataset.course,...fields});
 else if(form.id==='edit-form')await api({...editing,[editing.action==='renameCourse'?'name':'title']:fields.name});
 else if(form.id==='delete-form')await api(deleting);
 else if(form.id==='login-form')await api({action:'login',password:fields.password});
 form.closest('dialog')?.close();await load();
 }catch(err){if(msg)msg.textContent=err.message;else error(err);}finally{if(button)button.disabled=false;}
});
$('#logout').onclick=async()=>{try{await api({action:'logout'});state={courses:[],tasks:[]};render();$('#login-form').reset();$('#login-dialog').showModal();}catch(e){error(e);}};
$('#login-dialog').addEventListener('cancel',e=>e.preventDefault());
$('#today').textContent=new Date().toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'});
load().catch(error);
