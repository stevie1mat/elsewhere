import * as THREE from 'three';
import './resident-view.css';
import {ResidentMotion} from './resident-motion.js';
export function mountResidentView({initial,player,arrival,welcome,getWorld}) {
  document.body.classList.add('resident-observer');
  const toggle=document.createElement('button');toggle.id='resident-brain-toggle';toggle.type='button';toggle.innerHTML='<span aria-hidden="true">🧠</span> Brain';toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-controls','resident-panel');
  const panel=document.createElement('section');panel.id='resident-panel';panel.hidden=true;panel.setAttribute('aria-label','Character brain');
  panel.innerHTML=`<header class="brain-header"><div><small>THE MIND OF YOUR RESIDENT</small><h2>A thought becomes a step.</h2></div><button id="resident-brain-close" aria-label="Close brain view">×</button></header>
    <p id="resident-status" role="status"></p>
    <svg id="resident-network" viewBox="0 0 620 230" role="img" aria-label="Decision map connecting perception, memory, goals, planning and actions">
      <defs><linearGradient id="brain-line"><stop stop-color="#8fcebd"/><stop offset="1" stop-color="#e6c78b"/></linearGradient></defs>
      <path class="brain-outline" d="M308 40 C275 9 233 16 218 43 C175 20 139 48 144 78 C105 86 105 132 134 147 C116 177 143 207 181 196 C207 225 250 218 268 197 C285 211 302 201 308 184 M312 40 C345 9 387 16 402 43 C445 20 481 48 476 78 C515 86 515 132 486 147 C504 177 477 207 439 196 C413 225 370 218 352 197 C335 211 318 201 312 184 M310 40 L310 184"/>
      <g class="brain-connections"><path d="M66 116 Q160 15 188 70 T310 116 T432 70 T554 116"/><path d="M66 116 Q170 210 188 170 T310 116 T432 170 T554 116"/><path d="M66 116 H554"/><path d="M188 70 L188 170 M432 70 L432 170 M188 70 L432 170 M188 170 L432 70"/></g>
      <g class="brain-sparks"><circle cx="188" cy="70" r="4"/><circle cx="188" cy="170" r="4"/><circle cx="432" cy="70" r="4"/><circle cx="432" cy="170" r="4"/></g>
      <g class="brain-node" data-node="perception"><circle cx="66" cy="116" r="24"/><text x="66" y="121">01</text><text class="brain-label" x="66" y="160">Perception</text></g>
      <g class="brain-node" data-node="memory"><circle cx="188" cy="116" r="24"/><text x="188" y="121">02</text><text class="brain-label" x="188" y="160">Memory</text></g>
      <g class="brain-node" data-node="goal"><circle cx="310" cy="116" r="24"/><text x="310" y="121">03</text><text class="brain-label" x="310" y="160">Goals</text></g>
      <g class="brain-node" data-node="planner"><circle cx="432" cy="116" r="24"/><text x="432" y="121">04</text><text class="brain-label" x="432" y="160">Planner</text></g>
      <g class="brain-node" data-node="action"><circle cx="554" cy="116" r="24"/><text x="554" y="121">05</text><text class="brain-label" x="554" y="160">Action</text></g>
    </svg>
    <p class="brain-caption">Live decision map · perceptions, remembered events and chosen actions. Model weights and neural activations are not exposed by the API.</p>
    <div id="brain-needs" aria-label="Character needs"></div><div class="brain-facts"><article><small>MOOD & ACTIVITY</small><p id="brain-mood"></p></article><article><small>PERCEPTION</small><p id="brain-perception"></p></article><article><small>CURRENT GOAL</small><p id="brain-goal"></p></article><article><small>PLANNER</small><p id="brain-planner"></p></article><article><small>CURRENT INTENTION</small><p id="resident-goal"></p></article><article><small>MEMORY STORAGE</small><p id="brain-storage"></p></article></div>
    <details><summary id="brain-memory-label">Recent memories</summary><ol id="resident-history"></ol></details>
    <details id="resident-chat" open><summary>Talk to your resident</summary><div id="resident-messages" aria-live="polite"></div><form id="resident-chat-form"><label for="resident-message">Your message</label><textarea id="resident-message" rows="2" maxlength="1200" placeholder="What are you planning?" required></textarea><button type="submit">Send</button><p id="resident-chat-error" role="alert"></p></form></details>`;
  const setOpen=open=>{panel.hidden=!open;toggle.setAttribute('aria-expanded',String(open));if(open)panel.querySelector('#resident-brain-close').focus();else toggle.focus();};
  toggle.onclick=()=>setOpen(panel.hidden);panel.querySelector('#resident-brain-close').onclick=()=>setOpen(false);panel.addEventListener('keydown',event=>{if(event.key==='Escape'){event.stopPropagation();setOpen(false);}});
  const bubble=document.createElement('div');bubble.id='resident-thought';bubble.setAttribute('aria-label','Current intention');
  document.querySelector('#app').append(toggle,panel,bubble);
  let snapshot=initial,busy=false,geometrySent=false,lastEvents='',lastMessages='',receivedAt=Date.now();
  let chatBusy=false;
  const motion=new ResidentMotion(initial.player,performance.now());
  function apply(next){motion.receive(next.player,performance.now(),{snap:next.arrival.phase!==snapshot.arrival.phase||next.arrival.phase!=='landed'});snapshot=next;Object.assign(arrival,next.arrival);Object.assign(welcome,next.welcome);receivedAt=Date.now();
    document.body.classList.toggle('arriving',next.arrival.phase!=='landed');
    document.querySelector('#arrival-title').textContent=next.arrival.phase==='parachute'?'Coming in to land.':'Your island is on the horizon.';
    document.querySelector('#arrival-detail').textContent=next.thought;
    panel.querySelector('#resident-goal').textContent=next.thought;bubble.textContent='☁ '+next.thought;
    panel.querySelector('#resident-status').textContent=next.saveError?'Save failed — progress is at risk.':!next.initialized?'Preparing your city…':next.ai?.error?next.ai.error:next.mode==='ai'?(next.ai.status==='thinking'?'Choosing my next activity…':`${next.ai.provider||'AI'} connected · life saved on server`):'Routine mode · AI not configured';
    panel.querySelector('#brain-mood').textContent=`${next.mood||'Settling in'} · ${next.activity?.kind|| (next.player.moving?'walking':'considering next step')}${next.activity?' · '+Math.ceil(next.activity.remaining)+'s remaining':''} · €${next.wallet??20}`;
    const needs=panel.querySelector('#brain-needs');if(!needs.children.length)for(const [key,label] of [['energy','Energy'],['hunger','Hunger'],['thirst','Thirst'],['stress','Stress'],['curiosity','Curiosity'],['social','Social need']]){const row=document.createElement('label'),text=document.createElement('span'),meter=document.createElement('meter');text.textContent=label;meter.min=0;meter.max=100;meter.dataset.need=key;meter.setAttribute('aria-label',label);row.append(text,meter);needs.append(row);}
    for(const meter of needs.querySelectorAll('meter')){meter.value=next.needs?.[meter.dataset.need]??0;meter.title=Math.round(meter.value)+'/100';}
    panel.querySelector('#brain-storage').textContent=next.storage?.provider==='supabase'?(next.storage.error?'Local backup · cloud retry pending':next.storage.lastCloudSave?'Saved to Supabase · '+new Date(next.storage.lastCloudSave).toLocaleTimeString():'Connecting to Supabase…'):'Local server save';
    panel.querySelector('#brain-perception').textContent=`${next.arrival.phase==='landed'?'On foot':next.arrival.phase} · x ${Math.round(next.player.x)}, z ${Math.round(next.player.z)}`;
    panel.querySelector('#brain-goal').textContent=next.ai?.goal||'Arrive and find a place to call home.';
    panel.querySelector('#brain-planner').textContent=next.ai?.enabled?`${next.ai.provider||'AI'} · ${next.ai.model||'Connecting'}${next.ai.fallback?' · local fallback active':''}`:'Local routine';
    panel.querySelector('#brain-memory-label').textContent=`Recent memories · ${(next.events||[]).length} events · ${(next.messages||[]).length} messages saved`;
    panel.querySelector('#resident-network').classList.toggle('is-thinking',next.ai?.status==='thinking');
    for(const node of panel.querySelectorAll('[data-node]'))node.classList.toggle('is-active',node.dataset.node===(next.ai?.status==='thinking'?'planner':'action'));
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
      if(!response.ok)throw Error(`City connection failed (${response.status})`);apply(await response.json());
    }catch(error){panel.querySelector('#resident-status').textContent=error.message+' · retrying';if(!geometrySent)document.querySelector('#arrival-detail').textContent='Waiting for the city connection. Retrying automatically…';}finally{busy=false;}
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
