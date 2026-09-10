import { accessSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
for(const file of ['dist/index.html','dist/style.css','dist/favicon.svg','db/0001.sql']) accessSync(file);
for(const file of ['dist/app.js','api/index.js','lib/database.js']) execFileSync(process.execPath,['--check',file]);
console.log('Site and API validated. Static output: dist/');
