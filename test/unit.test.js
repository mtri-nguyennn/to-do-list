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
