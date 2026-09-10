import { build } from 'esbuild';
import { accessSync } from 'node:fs';
const config={apiKey:process.env.FIREBASE_API_KEY||'',authDomain:process.env.FIREBASE_AUTH_DOMAIN||'',projectId:process.env.FIREBASE_PROJECT_ID||'',appId:process.env.FIREBASE_APP_ID||''};
if(process.env.VERCEL && Object.values(config).some(v=>!v)) throw Error('Set FIREBASE_API_KEY, FIREBASE_AUTH_DOMAIN, FIREBASE_PROJECT_ID and FIREBASE_APP_ID in Vercel before deploying.');
for(const file of ['dist/index.html','dist/style.css','dist/favicon.svg','firestore.rules'])accessSync(file);
await build({entryPoints:['src/app.js'],bundle:true,format:'esm',target:['es2022'],outfile:'dist/app.js',minify:true,define:{__FIREBASE_CONFIG__:JSON.stringify(config)}});
console.log('Built Coursework in dist/.'+(config.apiKey?'':' Firebase is not configured; the preview will show setup status.'));
