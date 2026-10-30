export const OFFICIAL_INSTANCES=['https://yt.chocolatemoo53.com','https://invidious.nerdvpn.de','https://invidious.tiekoetter.com','https://inv.nadeko.net'];
export function beginPhone(s,d,now){
 if(typeof d.mediaQuery!=='string'||!d.mediaQuery.trim()||d.mediaQuery.length>120)return {error:'Choose a YouTube search query (1–120 characters) before using the phone.'};
 if(s.media){s.mediaHistory??=[];s.mediaHistory.push({...s.media});s.mediaHistory=s.mediaHistory.slice(-20);}
 s.media={id:String(now),query:d.mediaQuery.trim(),reason:d.intention,moodAtSearch:s.mood,status:'queued',createdAt:now,provider:'Invidious',playback:'not_started'};
 s.player.phone=true;return {started:true};
}
export function createMediaService({fetchImpl=fetch,instances=process.env.INVIDIOUS_INSTANCES?.split(',').map(x=>x.trim()).filter(Boolean)||OFFICIAL_INSTANCES,now=()=>Date.now()}={}){
 let busy=false;const cache=new Map();
 const bases=instances.map(x=>{const u=new URL(x);if(u.protocol!=='https:'||u.username||u.password)throw Error('Invidious instances must be HTTPS origins');return u.origin;});
 return {async update(s){
  const m=s.media;if(busy||s.paused||s.ai?.connected!==true||s.activity?.kind!=='phone'||!m||!['queued','searching'].includes(m.status))return;
  busy=true;const active=()=>s.media===m&&!s.paused&&s.ai?.connected===true&&s.activity?.kind==='phone';
  try{
   const hit=cache.get(m.query.toLowerCase());if(hit&&now()-hit.at<3600000){if(active())Object.assign(m,hit.data,{cached:true,status:'ready'});return;}
   m.status='searching';const errors=[];
   for(const base of bases){
    if(!active())return;
    try{const u=new URL('/api/v1/search',base);u.search=new URLSearchParams({q:m.query,type:'video',sort_by:'relevance'});
     const r=await fetchImpl(u,{signal:AbortSignal.timeout(7000),redirect:'error'});if(!r.ok)throw Error('HTTP '+r.status);const items=await r.json();if(!Array.isArray(items))throw Error('Invalid search response');
     const results=items.filter(x=>x.type==='video'&&/^[\w-]{11}$/.test(x.videoId)).slice(0,5).map(x=>({videoId:x.videoId,title:String(x.title||'Untitled').slice(0,180),author:String(x.author||'').slice(0,100)}));
     if(!results.length)throw Error('No video results');const data={instance:base,results,selected:results[0],selection:'First result ranked by Invidious for the AI query'};cache.set(m.query.toLowerCase(),{at:now(),data});if(cache.size>50)cache.delete(cache.keys().next().value);
     if(active())Object.assign(m,data,{status:'ready',errors});return;
    }catch(e){errors.push({instance:base,error:e.message.startsWith('HTTP ')?e.message:'API unavailable or invalid response'});}
   }
   if(active())Object.assign(m,{status:'unavailable',error:'Invidious search is unavailable on the configured instances.',errors});
  }finally{busy=false;}
 }};
}
