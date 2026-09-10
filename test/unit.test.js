import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deadline, text, deadlineLabel } from '../src/validation.js';
import handler from '../api/index.js';
test('deadline supports clearing and real calendar dates',()=>{
 assert.equal(deadline(''),'');assert.equal(deadline('2028-02-29'),'2028-02-29');
 for(const input of ['2026-02-29','2026-13-01','09/10/2026','2026-04-31',42])assert.throws(()=>deadline(input));
 assert.equal(deadlineLabel(''),'No deadline');
});
test('course and task names are trimmed and bounded',()=>{
 assert.equal(text(' BUS 1299 ',80),'BUS 1299');assert.throws(()=>text(' ',80));assert.throws(()=>text('x'.repeat(301),300));
});
test('legacy API cannot expose the shared database even with old credentials',()=>{
 let status,data;handler({method:'GET',headers:{cookie:'coursework=old-session'}},{setHeader(){},status(value){status=value;return this;},json(value){data=value;}});
 assert.equal(status,410);assert.equal(data.courses,undefined);
});

import { saveForm } from '../src/save-form.js';
function fixture(){
 const events=[];const button={textContent:'Create course',disabled:false},message={textContent:''};
 const form={reset(){events.push('reset');},closest(){return {close(){events.push('close');}};}};
 return {events,button,message,form};
}
test('confirmed save closes dialog and releases button without waiting for list reload',async()=>{
 const f=fixture();let confirm;const pending=new Promise(resolve=>confirm=resolve);
 const saving=saveForm({...f,save:()=>pending,refresh:()=>{f.events.push('refresh');return new Promise(()=>{});}});
 assert.equal(f.button.textContent,'Saving…');assert.equal(f.button.disabled,true);assert.deepEqual(f.events,[]);
 confirm();await saving;assert.deepEqual(f.events,['reset','close','refresh']);assert.equal(f.button.disabled,false);assert.equal(f.button.textContent,'Create course');
});
test('failed save preserves the form and permits retry without claiming success',async()=>{
 const f=fixture();await assert.rejects(saveForm({...f,save:async()=>{throw Error('Unavailable');},refresh:()=>f.events.push('refresh')}));
 assert.deepEqual(f.events,[]);assert.equal(f.button.disabled,false);assert.equal(f.button.textContent,'Create course');
});
test('slow confirmation shows pending status and still completes only once',async()=>{
 const f=fixture();let confirm;const pending=new Promise(resolve=>confirm=resolve);
 const saving=saveForm({...f,save:()=>pending,refresh:()=>f.events.push('refresh'),slowAfter:1});
 await new Promise(resolve=>setTimeout(resolve,10));assert.match(f.message.textContent,/waiting for confirmation/);assert.deepEqual(f.events,[]);
 confirm();await saving;assert.equal(f.message.textContent,'');assert.deepEqual(f.events,['reset','close','refresh']);
});
