import http from 'node:http';
import { readFileSync, mkdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import handler from '../api/index.js';
if (!process.env.DATABASE_URL && !process.env.CLOUDFLARE_DATABASE_ID && !process.env.RENDER && process.env.NODE_ENV !== 'production') {
 process.env.LOCAL_DATABASE='1'; mkdirSync('.data',{recursive:true});
 const db=new DatabaseSync('.data/coursework.sqlite'); db.exec(readFileSync('db/0001.sql','utf8')); db.close();
}
const files={'/':'index.html','/app.js':'app.js','/style.css':'style.css','/favicon.svg':'favicon.svg'};
http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('Referrer-Policy','same-origin');
 res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
 res.status=code=>{res.statusCode=code;return res}; res.json=data=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data));};
 if(req.url.split('?')[0]==='/api') {
  let raw=''; for await(const chunk of req) {raw+=chunk; if(raw.length>16384){res.status(413).json({error:'Request too large'});return;}}
  try{req.body=raw?JSON.parse(raw):{};}catch{res.status(400).json({error:'Invalid JSON'});return;}
  return handler(req,res);
 }
 const file=files[req.url.split('?')[0]]; if(!file){res.statusCode=404;return res.end('Not found');}
 res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.svg')?'image/svg+xml':'text/html');
 res.end(readFileSync(`dist/${file}`));
}).listen(Number(process.env.PORT || 3000),process.env.RENDER || process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1',()=>console.log('Coursework server running on port ' + (process.env.PORT || 3000)));
