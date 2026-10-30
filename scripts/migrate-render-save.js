import {createSupabaseStore} from '../server/supabase-store.js';
process.loadEnvFile(new URL('../.env',import.meta.url));
const base='https://elsewhere-ocqx.onrender.com';
try{
 const store=createSupabaseStore();const existing=await store.load();if(existing&&!process.argv.includes('--refresh'))throw Error('Supabase already has a life. Migration skipped.');
 const login=await fetch(base+'/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:process.env.PRIVATE_ACCESS_CODE||'279279'}),signal:AbortSignal.timeout(60000)});
 if(!login.ok)throw Error('Hosted login failed.');const cookie=login.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ');
 const response=await fetch(base+'/api/resident',{headers:{Cookie:cookie},signal:AbortSignal.timeout(60000)});if(!response.ok)throw Error('Hosted save export failed.');
 const {initialized,mode,saveError,storage,...state}=await response.json();
 // Public snapshots exclude route and collision geometry. Preserve the person and
 // memories; reload geometry from the game and replan the unfinished walk.
 state.obstacles=null;state.route=[];state.routeIndex=0;delete state.pendingDecision;
 await store.save(state);const restored=await store.load();
 if(restored.updatedAt!==state.updatedAt)throw Error('Cloud verification mismatch.');
 console.log(JSON.stringify({migrated:true,phase:restored.arrival.phase,events:restored.events.length,messages:restored.messages?.length||0}));
}catch(error){console.error(error.message);process.exitCode=1;}
