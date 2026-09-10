import http from 'node:http';
import { readFileSync } from 'node:fs';
await import('./build.mjs');
const configuration=JSON.parse(readFileSync('vercel.json','utf8'));
const files={'/':'index.html','/app.js':'app.js','/style.css':'style.css','/favicon.svg':'favicon.svg'};
http.createServer((req,res)=>{
 for(const h of configuration.headers[0].headers)res.setHeader(h.key,h.value);
 const file=files[req.url.split('?')[0]];
 if(!file){res.writeHead(404);return res.end('Not found');}
 res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.svg')?'image/svg+xml':'text/html');
 res.setHeader('Cache-Control','no-store');
 res.end(readFileSync(`dist/${file}`));
}).listen(Number(process.env.PORT||3000),'127.0.0.1',()=>console.log(`http://127.0.0.1:${process.env.PORT||3000}`));
