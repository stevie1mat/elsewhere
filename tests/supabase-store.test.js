import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createSupabaseStore} from '../server/supabase-store.js';
import {createPrivateServer} from '../server/private.js';
import {createResident} from '../server/resident.js';
test('Supabase checkpoint uses server key, validated restore and atomic save RPC',async()=>{
 const s=createResident(),calls=[];
 const store=createSupabaseStore({url:'https://example.supabase.co',key:'sb_secret_test',fetchImpl:async(url,options)=>{calls.push({url:String(url),...options});return new Response(options.method==='POST'?null:JSON.stringify([{checkpoint:s}]),{status:options.method==='POST'?204:200});}});
 assert.equal((await store.load()).version,1);await store.save(s);
 assert.equal(calls[0].headers.apikey,'sb_secret_test');assert.equal(calls[0].headers.Authorization,undefined);
 assert.match(calls[1].url,/rpc\/save_resident/);assert.equal(JSON.parse(calls[1].body).p_checkpoint.arrival.phase,'balloon');
});
test('cloud restore resumes the existing life instead of a new default spawn',async()=>{
 const state=createResident(1000);state.arrival.phase='landed';state.player.x=19;state.player.z=-83;state.messages=[{role:'user',content:'hello',at:1000}];let saved;
 const server=createPrivateServer({dataDir:mkdtempSync(join(tmpdir(),'porto-cloud-')),groqClient:{configured:false},cloud:{configured:true,load:async()=>state,save:async s=>{saved=s;}}});
 await server.ready;assert.equal(server.state.arrival.phase,'landed');assert.equal(server.state.messages[0].content,'hello');assert.equal(saved.player.x,19);assert.equal(server.storageStatus().ready,true);await server.close();
});
test('unavailable cloud without a local save never writes a fresh replacement',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'porto-cloud-fail-'));let writes=0;
 const server=createPrivateServer({dataDir:dir,groqClient:{configured:false},cloud:{configured:true,load:async()=>{throw Error('offline');},save:async()=>{writes++;}}});
 await server.ready;assert.equal(server.storageStatus().ready,false);await server.close();assert.equal(writes,0);assert.equal(existsSync(join(dir,'resident.json')),false);
});
