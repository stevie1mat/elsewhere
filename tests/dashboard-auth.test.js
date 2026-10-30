import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {createPrivateServer} from '../server/private.js';
test('dashboard uses the existing access-code session, serves its route and protects resident data',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'resident-dashboard-auth-'));writeFileSync(join(dir,'index.html'),'<!doctype html><title>Private app entry</title>');
 const server=createPrivateServer({code:'279279',dataDir:join(dir,'data'),dist:dir,cloud:{configured:false},groqClient:{configured:false}});await server.ready;
 await new Promise(r=>server.http.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.http.address().port;
 try{
  const unauth=await fetch(base+'/dashboard');assert.equal(unauth.status,200);const html=await unauth.text();assert.match(html,/Enter your access code/);assert.match(html,/location.href=location.pathname/);assert.ok(!html.includes('Private app entry'));
  assert.equal((await fetch(base+'/api/resident')).status,401);
  const login=code=>fetch(base+'/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code})});
  assert.equal((await login('wrong')).status,401);const signed=await login('279279');assert.equal(signed.status,200);const Cookie=signed.headers.get('set-cookie').split(';')[0];
  for(const path of ['/dashboard','/dashboard/','/']){const response=await fetch(base+path,{headers:{Cookie}});assert.equal(response.status,200);assert.match(await response.text(),/Private app entry/);assert.match(response.headers.get('cache-control'),/no-store/);}
  assert.equal((await fetch(base+'/api/resident',{headers:{Cookie}})).status,200);
 }finally{await server.close();}
});
test('Vercel dashboard rewrites preserve API routing and avoid cached private entry pages',()=>{
 const config=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url)));assert.equal(config.rewrites.find(r=>r.source==='/dashboard').destination,'/index.html');assert.ok(!config.rewrites.some(r=>r.source.includes('api')));assert.ok(config.headers.some(r=>r.source==='/dashboard'&&r.headers.some(h=>h.key==='Cache-Control'&&h.value.includes('no-store'))));
});
