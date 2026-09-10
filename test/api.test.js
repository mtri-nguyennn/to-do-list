import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import handler from '../api/index.js';

async function request(body, headers={}) {
 let status, data, responseHeaders={};
 await handler({method:body?'POST':'GET',headers:{'content-type':'application/json',...headers},body}, {
 setHeader(k,v){responseHeaders[k]=v;},status(s){status=s;return this;},json(d){data=d;}
 });
 return {status,data,headers:responseHeaders};
}
test('persistent course/subtask CRUD and validation',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'coursework-test-'));
 process.env.LOCAL_DATABASE='1';process.env.TEST_DB=join(dir,'test.sqlite');
 const db=new DatabaseSync(process.env.TEST_DB);db.exec(readFileSync('db/0001.sql','utf8'));db.close();
 try {
  assert.equal((await request({action:'createCourse',name:' '})).status,400);
  const course=(await request({action:'createCourse',name:'BUS 1299',description:'Business',color:'purple'})).data.result;
  assert.equal(course.name,'BUS 1299');
  assert.equal((await request({action:'createTask',course_id:course.id,title:'Read',due_date:'2026-02-30'})).status,400);
  assert.equal((await request({action:'createTask',course_id:'missing',title:'Read'})).status,404);
  const task=(await request({action:'createTask',course_id:course.id,title:'Read chapter 1',due_date:'2026-09-15'})).data.result;
  assert.equal((await request()).data.tasks[0].title,'Read chapter 1');
  assert.equal((await request({action:'toggleTask',id:task.id,done:true})).data.result.done,1);
  assert.equal((await request({action:'renameTask',id:task.id,title:'Read chapter 2'})).data.result.title,'Read chapter 2');
  assert.equal((await request({action:'renameCourse',id:course.id,name:'BUS 1300'})).data.result.name,'BUS 1300');
  assert.equal((await request({action:'toggleTask',id:task.id,done:'yes'})).status,400);
  await request({action:'deleteCourse',id:course.id});
  assert.deepEqual((await request()).data.tasks,[]);
  assert.equal((await request({action:'deleteTask',id:task.id})).status,404);
 } finally {delete process.env.LOCAL_DATABASE;delete process.env.TEST_DB;rmSync(dir,{recursive:true,force:true});}
});
test('production authentication fails closed, issues secure cookies, rejects wrong password',async()=>{
 process.env.NODE_ENV='production';process.env.LOCAL_DATABASE='1';
 try{
  assert.equal((await request()).status,503);
  process.env.APP_PASSWORD='a-test-password';process.env.SESSION_SECRET='a'.repeat(64);
  assert.equal((await request()).status,401);
  assert.equal((await request({action:'login',password:'wrong'})).status,401);
  assert.equal((await request({action:'login',password:{}})).status,401);
  const login=await request({action:'login',password:'a-test-password'});
  assert.equal(login.status,200);assert.match(login.headers['Set-Cookie'],/HttpOnly; Secure; SameSite=Strict/);
  const cookie=login.headers['Set-Cookie'].split(';')[0];
  assert.equal((await request({action:'logout'},{cookie})).status,200);
  assert.equal((await request({action:'logout'},{cookie:cookie+'tampered'})).status,401);
 }finally{for(const key of ['NODE_ENV','LOCAL_DATABASE','APP_PASSWORD','SESSION_SECRET'])delete process.env[key];}
});
