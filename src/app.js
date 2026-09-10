import { configured, currentUser, watchAuth, login, signup, logout, resend, resetPassword, checkVerification, loadWorkspace, mutate, friendlyError } from './store.js';
import { deadlineLabel, today } from './validation.js';
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let state={courses:[],tasks:[]},selected=null,editing,deleting,mode='login',generation=0,busy=false;
function showError(e){$('#error').textContent=friendlyError(e);$('#error').hidden=false;}
function authStatus(message,isError=false){$('#auth-status').textContent=message;$('#auth-status').classList.toggle('form-error',isError);}
function setMode(next){
 mode=next;$('#auth-form').reset();$('#auth-form .form-error').textContent='';authStatus('');
 $('#auth-heading').textContent=next==='signup'?'Create account':next==='reset'?'Reset password':'Sign in';
 $('#auth-description').textContent=next==='signup'?'Use your email and a password of at least 12 characters.':next==='reset'?'We’ll email you a password reset link.':'Access your courses and deadlines.';
 $('#auth-submit').textContent=next==='signup'?'Create account':next==='reset'?'Send reset link':'Sign in';
 $('#password-label').hidden=next==='reset';const password=$('#auth-form [name=password]');password.disabled=next==='reset';password.minLength=next==='signup'?12:1;password.autocomplete=next==='signup'?'new-password':'current-password';
 $('#confirm-label').hidden=next!=='signup';$('#auth-form [name=confirm]').disabled=next!=='signup';$('#auth-form [name=confirm]').required=next==='signup';
 $('#auth-tabs').hidden=next==='reset';$('#forgot-password').hidden=next!=='login';$('#back-login').hidden=next!=='reset';
 document.querySelectorAll('[data-mode]').forEach(b=>{b.classList.toggle('selected',b.dataset.mode===next);b.setAttribute('aria-pressed',String(b.dataset.mode===next));});
}
async function refresh(){
 const token=generation;$('#save-status').textContent='Loading…';
 try{const next=await loadWorkspace();if(token!==generation)return;state=next;$('#error').hidden=true;$('#save-status').textContent='Up to date';render();}
 catch(e){if(token!==generation)return;$('#save-status').textContent='Could not load';showError(e);}
}
async function authChanged(user){
 generation++;state={courses:[],tasks:[]};selected=null;$('#account-email').textContent='';render();
 document.querySelectorAll('dialog[open]').forEach(d=>d.close());$('#auth-form').reset();$('#error').hidden=true;
 $('#auth-loading').hidden=true;const verified=Boolean(user?.emailVerified);
 $('#workspace').hidden=!verified;$('#auth-page').hidden=verified;$('#auth-content').hidden=Boolean(user);$('#verification').hidden=!user||verified;
 if(user&&!verified){$('#verify-email').textContent=user.email;}
 if(!user){setMode('login');}
 if(verified){$('#account-email').textContent=user.email;await refresh();}
}
function render(){
 const done=state.tasks.filter(t=>t.done).length,pct=state.tasks.length?Math.round(done/state.tasks.length*100):0;
 $('#stat-courses').textContent=state.courses.length;$('#course-count').textContent=state.courses.length;$('#stat-open').textContent=state.tasks.length-done;$('#stat-done').textContent=done;$('#stat-progress').textContent=pct+'%';$('#overall-bar').value=pct;
 const chosen=state.courses.find(c=>c.id===selected);if(!chosen)selected=null;
 $('#overview').classList.toggle('active',!selected);$('#heading').textContent=chosen?.name||'Courses';$('#breadcrumb').textContent=chosen?.name||'All courses';$('#subtitle').textContent=chosen?.description||'';$('#subtitle').hidden=!chosen?.description;
 $('#course-nav').innerHTML=state.courses.map(c=>`<button class="nav ${selected===c.id?'active':''}" data-select="${c.id}"><span class="dot ${esc(c.color)}"></span>${esc(c.name)}<span class="count">${state.tasks.filter(t=>t.course_id===c.id&&!t.done).length}</span></button>`).join('');
 $('#courses').innerHTML=(chosen?[chosen]:state.courses).map(c=>{
 const tasks=state.tasks.filter(t=>t.course_id===c.id),done=tasks.filter(t=>t.done).length;
 return `<article class="course-card ${esc(c.color)}"><div class="card-heading"><div class="course-symbol">▤</div><div class="course-title"><h2>${esc(c.name)}</h2>${c.description?`<p>${esc(c.description)}</p>`:''}</div><button class="icon" data-edit-course="${c.id}" aria-label="Rename ${esc(c.name)}" ${c.deleting?'disabled':''}>✎</button><button class="icon" data-delete-course="${c.id}" aria-label="Delete ${esc(c.name)}">×</button></div><div class="course-progress"><span>${done}/${tasks.length} completed</span></div><progress value="${done}" max="${tasks.length||1}" aria-label="${esc(c.name)} progress"></progress>${c.deleting?'<p class="form-error">Deletion incomplete. Click × to finish deleting this course.</p>':`<div class="task-list">${tasks.length?tasks.map(t=>`<div class="task ${t.done?'done':''}"><input type="checkbox" data-toggle="${t.id}" aria-label="Complete ${esc(t.title)}" ${t.done?'checked':''}><div class="task-text"><span>${esc(t.title)}</span><button class="deadline ${t.due_date&&!t.done&&t.due_date<today()?'overdue':''}" data-edit-task="${t.id}" aria-label="Edit deadline for ${esc(t.title)}"><span>Deadline</span> ${esc(deadlineLabel(t.due_date,t.done))}</button></div><button class="icon" data-edit-task="${t.id}" aria-label="Edit ${esc(t.title)}">✎</button><button class="icon" data-delete-task="${t.id}" aria-label="Delete ${esc(t.title)}">×</button></div>`).join(''):'<p class="no-tasks">No tasks</p>'}</div><form class="task-form" data-course="${c.id}"><input name="title" placeholder="Add a subtask" aria-label="New subtask for ${esc(c.name)}" maxlength="300" required><div class="task-form-bottom"><label>Deadline <span>(optional)</span><input type="date" name="due_date" min="1900-01-01" max="9999-12-31"></label><button type="submit" class="small-button">＋ Add task</button></div><p class="form-error" role="alert"></p></form>`}</article>`;
 }).join('')||'<div class="empty"><h2>No courses yet</h2><button class="primary" id="empty-add">＋ Add course</button></div>';
}
function openCourse(){$('#course-form').reset();$('#course-form .form-error').textContent='';$('#course-dialog').showModal();}
for(const id of ['#new-course','#add-course','#sidebar-add'])$(id).onclick=openCourse;
$('#overview').onclick=()=>{selected=null;render();};
$('#refresh').onclick=()=>refresh();
$('#forgot-password').onclick=()=>setMode('reset');$('#back-login').onclick=()=>setMode('login');
for(const id of ['#logout','#verification-logout'])$(id).onclick=async()=>{try{await logout();}catch(e){authStatus(friendlyError(e),true);showError(e);}};
async function authAction(button,action){button.disabled=true;try{await action();}catch(e){authStatus(friendlyError(e),true);}finally{button.disabled=false;}}
$('#resend-verification').onclick=e=>authAction(e.currentTarget,async()=>{await resend();authStatus('Verification email sent. Check your inbox and spam folder.');});
$('#check-verification').onclick=e=>authAction(e.currentTarget,async()=>{if(await checkVerification()){authStatus('');await authChanged(currentUser());}else authStatus('Your email is not verified yet. Open the link in your inbox.',true);});
document.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.dataset.mode)setMode(b.dataset.mode);
 if(b.classList.contains('close-dialog'))b.closest('dialog').close();
 if(b.id==='empty-add')openCourse();
 if(b.dataset.select){selected=b.dataset.select;render();}
 for(const kind of ['Course','Task']){
  const id=b.dataset['edit'+kind];if(id){const item=state[kind==='Course'?'courses':'tasks'].find(x=>x.id===id);if(!item)return;editing={action:kind==='Course'?'renameCourse':'editTask',id};$('#edit-heading').textContent=kind==='Course'?'Rename course':'Edit task';$('#edit-form [name=name]').value=item.name||item.title;$('#edit-form [name=name]').maxLength=kind==='Course'?80:300;$('#edit-deadline-label').hidden=kind==='Course';$('#edit-form [name=due_date]').value=item.due_date||'';$('#edit-form .form-error').textContent='';$('#edit-dialog').showModal();}
  const idToDelete=b.dataset['delete'+kind];if(idToDelete){deleting={action:'delete'+kind,id:idToDelete};$('#delete-message').textContent=kind==='Course'?'Delete this course and all its tasks? This cannot be undone.':'Delete this task? This cannot be undone.';$('#delete-form .form-error').textContent='';$('#delete-dialog').showModal();}
 }
});
async function save(action){if(busy)throw Error('A change is still saving. Please wait.');busy=true;$('#save-status').textContent='Saving…';try{await mutate(action);$('#save-status').textContent='Saved';}catch(e){$('#save-status').textContent='Not saved';throw e;}finally{busy=false;}}
document.addEventListener('change',async e=>{const checkbox=e.target;if(!checkbox.dataset.toggle)return;checkbox.disabled=true;try{await save({action:'toggleTask',id:checkbox.dataset.toggle,done:checkbox.checked});await refresh();}catch(err){checkbox.checked=!checkbox.checked;showError(err);}finally{checkbox.disabled=false;}});
document.addEventListener('submit',async e=>{
 e.preventDefault();const form=e.target,button=form.querySelector('[type=submit]'),fields=Object.fromEntries(new FormData(form)),msg=form.querySelector('.form-error');button.disabled=true;msg.textContent='';
 try{
  if(form.id==='auth-form'){
   authStatus('');
   if(mode==='signup'){if(fields.password.length<12)throw Error('Use a password with at least 12 characters.');if(fields.password!==fields.confirm)throw Error('Passwords do not match.');await signup(fields.email,fields.password);authStatus('Verification email sent. Check your inbox and spam folder.');}
   else if(mode==='reset'){await resetPassword(fields.email);authStatus('If an account exists for this email, a password reset link will arrive shortly.');}
   else await login(fields.email,fields.password);
   return;
  }
  if(form.id==='course-form')await save({action:'createCourse',...fields});
  else if(form.classList.contains('task-form'))await save({action:'createTask',course_id:form.dataset.course,...fields});
  else if(form.id==='edit-form')await save({...editing,[editing.action==='renameCourse'?'name':'title']:fields.name,due_date:fields.due_date});
  else if(form.id==='delete-form')await save(deleting);
  form.reset();form.closest('dialog')?.close();await refresh();
 }catch(err){msg.textContent=friendlyError(err);if(form.id==='auth-form')authStatus(friendlyError(err),true);}finally{button.disabled=false;}
});
if(configured){watchAuth(user=>{authChanged(user).catch(e=>authStatus(friendlyError(e),true));});}
else{$('#auth-loading').hidden=true;authStatus('Sign-in is not configured yet. The site owner needs to complete Firebase setup.',true);}
