import { test, before, after, beforeEach } from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, collection, setDoc, getDoc, getDocs, updateDoc, deleteDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
let env;
before(async()=>{env=await initializeTestEnvironment({projectId:'demo-coursework',firestore:{rules:readFileSync('firestore.rules','utf8'),host:'127.0.0.1',port:8080}});});
after(async()=>{await env?.cleanup();});beforeEach(async()=>env.clearFirestore());
const client=(uid,verified=true)=>env.authenticatedContext(uid,{email:`${uid}@example.com`,email_verified:verified}).firestore();
const course=(db,uid='alice',id='bus')=>doc(db,`users/${uid}/courses/${id}`);
const task=(db,uid='alice',id='read')=>doc(db,`users/${uid}/tasks/${id}`);
const courseData=()=>({name:'BUS 1299',description:'Business',color:'blue',deleting:false,created_at:serverTimestamp()});
const taskData=()=>({course_id:'bus',title:'Read chapter 1',done:false,due_date:'2026-10-01',created_at:serverTimestamp()});
test('verified owner can create, read, edit, complete and delete tasks and course',async()=>{
 const db=client('alice');await assertSucceeds(setDoc(course(db),courseData()));await assertSucceeds(setDoc(task(db),taskData()));
 await assertSucceeds(getDocs(collection(db,'users/alice/courses')));await assertSucceeds(getDocs(collection(db,'users/alice/tasks')));
 await assertSucceeds(updateDoc(task(db),{title:'Assignment 1',due_date:'2026-11-01',done:true}));
 await assertSucceeds(updateDoc(task(db),{due_date:''}));
 await assertSucceeds(deleteDoc(task(db)));await assertSucceeds(updateDoc(course(db),{deleting:true}));await assertSucceeds(deleteDoc(course(db)));
});
test('other accounts cannot read, list, overwrite or delete another account data',async()=>{
 const alice=client('alice');await setDoc(course(alice),courseData());await setDoc(task(alice),taskData());const bob=client('bob');
 for(const ref of [course(bob),task(bob)]){await assertFails(getDoc(ref));await assertFails(deleteDoc(ref));}
 await assertFails(getDocs(collection(bob,'users/alice/courses')));await assertFails(getDocs(collection(bob,'users/alice/tasks')));
 await assertFails(setDoc(course(bob),courseData()));await assertFails(updateDoc(task(bob),{done:true}));
 await assertSucceeds(setDoc(course(bob,'bob'),courseData()));
});
test('signed-out and unverified accounts have no database access',async()=>{
 const alice=client('alice');await setDoc(course(alice),courseData());
 for(const db of [client('alice',false),env.unauthenticatedContext().firestore()]){
  await assertFails(getDoc(course(db)));await assertFails(getDocs(collection(db,'users/alice/courses')));await assertFails(setDoc(course(db),courseData()));await assertFails(setDoc(task(db),taskData()));
 }
});
test('invalid records and cross-account course references are rejected',async()=>{
 const db=client('alice');await setDoc(course(db),courseData());
 await assertFails(setDoc(task(db),{...taskData(),done:'yes'}));await assertFails(setDoc(task(db),{...taskData(),title:''}));await assertFails(setDoc(task(db),{...taskData(),due_date:'tomorrow'}));
 await assertFails(setDoc(task(db),{...taskData(),course_id:'missing'}));await assertFails(setDoc(task(db),{...taskData(),owner:'bob'}));
 await assertFails(setDoc(course(db,'alice','new'),{...courseData(),name:'x'.repeat(81)}));
 await setDoc(course(client('bob'),'bob','bobs-course'),courseData());
 await assertFails(setDoc(task(db),{...taskData(),course_id:'bobs-course'}));
 await setDoc(task(db),taskData());await assertFails(updateDoc(task(db),{course_id:'new'}));await assertFails(updateDoc(task(db),{created_at:serverTimestamp()}));
});
test('deleting courses prevent concurrent task creation and can be resumed',async()=>{
 const db=client('alice');await setDoc(course(db),courseData());await setDoc(task(db),taskData());
 await assertFails(deleteDoc(course(db)));await updateDoc(course(db),{deleting:true});
 await assertFails(setDoc(task(db,'alice','new'),taskData()));await assertFails(updateDoc(task(db),{done:true}));await assertFails(updateDoc(course(db),{deleting:false}));
 await assertSucceeds(deleteDoc(task(db)));await assertSucceeds(deleteDoc(course(db)));
});
test('a batch cannot add a task while marking its course for deletion',async()=>{
 const db=client('alice');await setDoc(course(db),courseData());const batch=writeBatch(db);batch.update(course(db),{deleting:true});batch.set(task(db),taskData());await assertFails(batch.commit());
});
