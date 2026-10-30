import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../server/vercel-proxy.js';
function response(){return {headers:{},setHeader(k,v){this.headers[k]=v;},end(value){this.body=value;}};}
test('hosted API rejects an insecure backend override',async()=>{
 const previous=process.env.PRIVATE_SERVER_URL;process.env.PRIVATE_SERVER_URL='http://insecure.example';
 try{const res=response();await handler({url:'/api/resident',method:'GET',headers:{}},res);assert.equal(res.statusCode,503);assert.match(res.body,/PRIVATE_SERVER_URL/);}finally{if(previous!==undefined)process.env.PRIVATE_SERVER_URL=previous;else delete process.env.PRIVATE_SERVER_URL;}
});
test('proxy forwards session cookies and login cookies without exposing provider keys',async()=>{
 const previous=process.env.PRIVATE_SERVER_URL,original=globalThis.fetch;process.env.PRIVATE_SERVER_URL='https://example.onrender.com';let forwarded;
 globalThis.fetch=async(url,options)=>{forwarded={url:String(url),...options};return new Response('{"ok":true}',{headers:{'Content-Type':'application/json','Set-Cookie':'porto_session=test; HttpOnly; SameSite=Strict; Path=/'}});};
 try{const res=response();await handler({url:'/api/login',method:'POST',headers:{host:'game.vercel.app',origin:'https://game.vercel.app',cookie:'porto_session=old'},body:{code:'test'}},res);
 assert.equal(res.statusCode,200);assert.equal(forwarded.url,'https://example.onrender.com/api/login');assert.equal(forwarded.headers.Cookie,'porto_session=old');assert.equal(forwarded.headers.Authorization,undefined);assert.match(res.headers['Set-Cookie'][0],/HttpOnly/);
 const denied=response();await handler({url:'/api/login',method:'POST',headers:{host:'game.vercel.app',origin:'https://untrusted.example'},body:{}},denied);assert.equal(denied.statusCode,403);
 }finally{globalThis.fetch=original;if(previous===undefined)delete process.env.PRIVATE_SERVER_URL;else process.env.PRIVATE_SERVER_URL=previous;}
});

test('each deployed API path has an explicit Vercel function entry',async()=>{
 for(const path of ['login','resident','resident/world','resident/chat']){
  const entry=await import(`../api/${path}.js`);assert.equal(entry.default,handler);
 }
});
