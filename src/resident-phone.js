import {residentChatRequest} from './resident-chat-request.js';
import {PHONE_SEARCH_REQUEST} from '../server/shared/phone-request.js';
const node=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
let apiPromise;
function youtubeApi(){
 if(window.YT?.Player)return Promise.resolve(window.YT);
 if(!apiPromise)apiPromise=new Promise((resolve,reject)=>{const timer=setTimeout(()=>{apiPromise=null;reject(Error('YouTube player could not load. Use the Invidious watch link.'));},12000);const prior=window.onYouTubeIframeAPIReady;window.onYouTubeIframeAPIReady=()=>{clearTimeout(timer);prior?.();resolve(window.YT);};const script=node('script');script.src='https://www.youtube.com/iframe_api';script.onerror=()=>{clearTimeout(timer);apiPromise=null;reject(Error('Player blocked by browser or network.'));};document.head.append(script);});return apiPromise;
}
export function mountResidentPhone(){
 const badge=node('button','📱 Resident phone');badge.type='button';badge.className='resident-phone-badge';
 const dialog=node('dialog');dialog.className='learning-score-dialog resident-phone-dialog';const title=node('h2','Resident phone'),close=node('button','Close'),mood=node('p'),reason=node('p'),query=node('p'),status=node('p'),playback=node('p'),open=node('button','Play via YouTube'),ask=node('button','Ask resident to choose a video'),link=node('a','Open Invidious search'),watch=node('a','Watch on Invidious'),host=node('div'),history=node('ol'),searches=node('ol');
 title.id='resident-phone-title';dialog.setAttribute('aria-labelledby',title.id);for(const a of [link,watch]){a.target='_blank';a.rel='noopener noreferrer';}host.className='resident-phone-player';
 dialog.append(close,title,mood,node('p','Mood comes from simulated needs. Its stated reason and video choice are shown separately. The AI does not receive audio or video content.'),reason,query,status,playback,ask,open,node('p','Search uses Invidious. Some public instances block embedding; the optional in-game player uses YouTube. Invidious playback is available through the watch link.'),link,watch,host,node('h3','Search results'),history,node('h3','Previous searches'),searches);document.querySelector('#app').append(badge,dialog);
 let snapshot=null,player=null,playingId=null,askBusy=false;
 const active=()=>!snapshot?.paused&&snapshot?.ai?.connected===true&&snapshot?.activity?.kind==='phone';
 const report=(state,id=snapshot?.media?.id)=>{if(!id||!active())return;void fetch('/api/resident/media',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,playback:state})}).catch(()=>{});};
 const stop=state=>{if(player){const oldId=playingId;player.destroy();player=null;playingId=null;host.replaceChildren();report(state,oldId);}};
 badge.onclick=()=>dialog.showModal();close.onclick=()=>dialog.close();dialog.addEventListener('close',()=>{stop('closed');playback.textContent='Player closed; no playback.';});document.addEventListener('visibilitychange',()=>{if(document.hidden)stop('paused');});
 open.onclick=async()=>{const m=snapshot?.media;if(!m?.selected||!active())return;open.disabled=true;
  try{const YT=await youtubeApi();if(!active()||!dialog.open||snapshot.media.id!==m.id)return;stop('closed');const slot=node('div');host.append(slot);playingId=m.id;
   player=new YT.Player(slot,{host:'https://www.youtube-nocookie.com',videoId:m.selected.videoId,width:'100%',height:320,playerVars:{autoplay:0,origin:location.origin,playsinline:1},events:{
    onReady:()=>{if(!active()||!dialog.open){stop('paused');return;}playback.textContent='Player ready. Press Play to listen.';report('player_open',m.id);},
    onStateChange:e=>{if(!active()||!dialog.open){stop('paused');return;}let state=e.data===1?(e.target.isMuted()?'playing_muted':'playing_unmuted'):e.data===2?'paused':e.data===0?'ended':'player_open';playback.textContent='Browser player: '+state.replaceAll('_',' ');report(state,m.id);},
    onAutoplayBlocked:()=>{playback.textContent='Browser blocked automatic playback. Press Play in the player.';report('blocked',m.id);},
    onError:()=>{playback.textContent='Video playback failed or embedding is disabled. Try the Invidious watch link.';report('blocked',m.id);}
   }});
  }catch(e){playback.textContent=e.message;report('blocked',m.id);}finally{open.disabled=!active()||!snapshot?.media?.selected;}
 };
 ask.onclick=async()=>{if(askBusy)return;askBusy=true;ask.disabled=true;status.textContent='Asking the resident…';try{const r=await residentChatRequest(PHONE_SEARCH_REQUEST,()=>{status.textContent='Resident is choosing on your Mac…';});const data=await r.json();status.textContent=data.reply||data.error||'Request finished.';}catch{status.textContent='Cannot reach the game server.';}finally{askBusy=false;ask.disabled=!active()&&(snapshot?.paused||snapshot?.ai?.connected!==true);}};
 let signature='';return {update(s){snapshot=s;const m=s.media;badge.textContent=`📱 Phone · ${s.mood||'settling in'}${s.player.phone?' · in hand':''}`;
 if(player&&(!active()||playingId!==m?.id||document.hidden))stop('paused');
 ask.disabled=askBusy||!s.ai?.connected||s.paused;ask.textContent=askBusy?'Resident is choosing…':s.paused?'Resume life & AI to use phone':!s.ai?.connected?'Waiting for AI connection':'Ask resident to choose a video';open.disabled=!active()||!m?.selected;open.hidden=!m?.selected;
 const key=JSON.stringify([s.mood,s.paused,s.ai?.connected,s.activity?.kind,m,s.mediaHistory]);if(key===signature)return;signature=key;
 mood.textContent='Current simulated mood: '+(s.mood||'settling in');reason.textContent=m?'Reason stated by AI: '+m.reason:'The resident has not chosen a phone search yet.';query.textContent=m?'AI search: “'+m.query+'”':'';
 status.textContent=s.paused?'Game paused. Resume life & AI before the resident can choose a phone search.':!s.ai?.connected?'AI disconnected — phone activity paused.':!m?'No search chosen yet. The phone appears in its hand only during a phone action. Ask the resident to choose a video, or let it choose autonomously.':m.error||`${m.status} via Invidious${m.cached?' · cached search':''}${m.selected?' · '+m.selected.title:''}`;
 if(!player)playback.textContent=active()?'Open a player to watch/listen. Search results are not proof of playback.':m?'Phone activity is not running. Past search is retained below.':'No phone activity or playback yet.';
 link.hidden=!m;link.href=(m?.instance||'https://yt.chocolatemoo53.com')+'/search?q='+encodeURIComponent(m?.query||'');watch.hidden=!m?.selected;watch.href=(m?.instance||'https://yt.chocolatemoo53.com')+'/watch?v='+encodeURIComponent(m?.selected?.videoId||'');history.replaceChildren();
 searches.replaceChildren();for(const prior of [...(s.mediaHistory||[])].reverse().slice(0,10))searches.append(node('li',`${prior.query} · mood: ${prior.moodAtSearch} · ${prior.reason}`));
 for(const result of m?.results||[]){const li=node('li',result.title+' — '+result.author+(result.videoId===m.selected?.videoId?' · first result for the AI query':''));history.append(li);}
 }};
}
