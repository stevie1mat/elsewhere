import * as THREE from 'three';
import './resident-view.css';
import {ResidentMotion} from './resident-motion.js';
export function mountResidentView({initial,player,arrival,welcome,getWorld}) {
  document.body.classList.add('resident-observer');
  const panel=document.createElement('aside');panel.id='resident-panel';
  panel.innerHTML='<small>YOUR RESIDENT · A LIFE OF THEIR OWN</small><h2>A life in Porto Sol</h2><p id="resident-status" role="status">Connecting to your saved life…</p><p id="resident-goal"></p><details open><summary>Activity history</summary><ol id="resident-history"></ol></details><details id="resident-chat" open><summary>Talk to your resident</summary><div id="resident-messages" aria-live="polite"></div><form id="resident-chat-form"><label for="resident-message">Your message</label><textarea id="resident-message" rows="2" maxlength="1200" placeholder="What would you like to do today?" required></textarea><button type="submit">Send</button><p id="resident-chat-error" role="alert"></p></form></details><p class="resident-note">Runs while the private server is online. Drag the city to look around.</p>';
  const bubble=document.createElement('div');bubble.id='resident-thought';bubble.setAttribute('aria-label','Current intention');
  document.querySelector('#app').append(panel,bubble);
  let snapshot=initial,busy=false,geometrySent=false,lastEvents='',lastMessages='',receivedAt=Date.now();
  let chatBusy=false;
  const motion=new ResidentMotion(initial.player,performance.now());
  function apply(next){motion.receive(next.player,performance.now(),{snap:next.arrival.phase!==snapshot.arrival.phase||next.arrival.phase!=='landed'});snapshot=next;Object.assign(arrival,next.arrival);Object.assign(welcome,next.welcome);receivedAt=Date.now();
    document.body.classList.toggle('arriving',next.arrival.phase!=='landed');
    document.querySelector('#arrival-title').textContent=next.arrival.phase==='parachute'?'Coming in to land.':'Your island is on the horizon.';
    document.querySelector('#arrival-detail').textContent=next.thought;
    panel.querySelector('#resident-goal').textContent=next.thought;bubble.textContent='☁ '+next.thought;
    panel.querySelector('#resident-status').textContent=next.saveError?'Save failed — progress is at risk.':!next.initialized?'Preparing your city…':next.ai?.error?next.ai.error:next.mode==='ai'?(next.ai.status==='thinking'?'Choosing my next activity…':`${next.ai.provider||'AI'} connected · life saved on server`):'Routine mode · AI not configured';
    const messages=JSON.stringify(next.messages||[]);
    if(messages!==lastMessages){lastMessages=messages;const list=panel.querySelector('#resident-messages');list.replaceChildren();for(const message of (next.messages||[]).slice(-12)){const p=document.createElement('p'),name=document.createElement('strong');name.textContent=message.role==='user'?'You: ':'Resident: ';p.append(name,document.createTextNode(message.content));list.append(p);}list.scrollTop=list.scrollHeight;}
    panel.querySelector('#resident-chat-form button').disabled=!next.ai?.enabled||chatBusy;
    const signature=JSON.stringify(next.events);
    if(signature!==lastEvents){lastEvents=signature;const list=panel.querySelector('#resident-history');list.replaceChildren();
      for(const event of [...next.events].reverse().slice(0,80)){const li=document.createElement('li'),time=document.createElement('time');time.dateTime=new Date(event.at).toISOString();time.textContent=new Date(event.at).toLocaleString();li.append(time,document.createTextNode(event.message));list.append(li);}
    }
  }
  panel.querySelector('#resident-chat-form').onsubmit=async event=>{
    event.preventDefault();if(chatBusy)return;
    const input=panel.querySelector('#resident-message'),button=panel.querySelector('#resident-chat-form button'),error=panel.querySelector('#resident-chat-error');
    if(!input.value.trim())return;
    chatBusy=true;button.disabled=true;button.textContent='Listening…';error.textContent='';
    try{const response=await fetch('/api/resident/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:input.value.trim()})});
      if(response.status===401){location.replace('/');return;}
      const data=await response.json();if(!response.ok)throw Error(data.error||'Unable to send message.');input.value='';await sync();
    }catch(e){error.textContent=e.message;}finally{chatBusy=false;button.disabled=!snapshot.ai?.enabled;button.textContent='Send';}
  };
  apply(initial);Object.assign(player,initial.player);
  async function sync(){
    if(busy)return;busy=true;
    try{
      let response;
      if(!geometrySent&&getWorld()){
        response=await fetch('/api/resident/world',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({obstacles:getWorld().obstacles})});
        if(response.ok)geometrySent=true;
      }else response=await fetch('/api/resident',{cache:'no-store'});
      if(response.status===401){location.replace('/');return;}
      if(!response.ok)throw Error('Sync failed');apply(await response.json());
    }catch{panel.querySelector('#resident-status').textContent='Disconnected · waiting to resume the live view';}finally{busy=false;}
  }
  const interval=setInterval(sync,400);sync();window.addEventListener('pagehide',()=>clearInterval(interval),{once:true});
  const point=new THREE.Vector3();
  return {update(camera){
    // Never advance the saved life in the browser: all tabs observe one server state.
    const pitch=player.pitch;Object.assign(player,motion.sample(performance.now()));player.pitch=pitch;player.arrival=arrival;
    if(Date.now()-receivedAt>3000){player.speed=0;player.moving=false;}
    point.set(player.x,(player.y||0)+2.35,player.z).project(camera);
    bubble.hidden=arrival.phase!=='landed'||point.z>1||point.z< -1||Math.abs(point.x)>1||Math.abs(point.y)>1;
    bubble.style.left=`${(point.x*.5+.5)*innerWidth}px`;bubble.style.top=`${(-point.y*.5+.5)*innerHeight}px`;
  }};
}
