import {dailyUsageView} from '../server/daily-usage.js';
import {mountResidentSidebar} from './resident-sidebar.js';
import {mountResidentPhone} from './resident-phone.js';
import {mountLearningView} from './learning-view.js';
import {downloadAiCsv} from './ai-csv.js';
import * as THREE from 'three';
import './resident-view.css';
import {ResidentMotion} from './resident-motion.js';
export function mountResidentView({initial,player,arrival,welcome,getWorld,onLocate=()=>{}}) {
  document.body.classList.add('resident-observer');
  const toggle=document.createElement('button');toggle.id='resident-brain-toggle';toggle.type='button';toggle.innerHTML='<span aria-hidden="true">🧠</span> Brain';toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-controls','resident-panel');
  const connection=document.createElement('button');connection.type='button';connection.id='resident-ai-connection';connection.setAttribute('role','status');connection.setAttribute('aria-live','polite');
  const dot=document.createElement('span');dot.className='ai-connection-dot';dot.setAttribute('aria-hidden','true');const connectionText=document.createElement('span');connection.append(dot,connectionText);
  function showConnection(ai,offline=false){
    const online=!snapshot?.paused&&!offline&&ai?.enabled&&ai.connected===true&&!ai.error&&!ai.fallback;
    connection.dataset.state=online?'online':'offline';
    const text=snapshot?.paused?'Paused · AI stopped':offline?'AI disconnected · reconnecting':!ai?.enabled?'AI not configured':online?`AI connected · ${ai.provider||'AI'}${ai.status==='thinking'?' · thinking':''}`:ai.error||ai.fallback?'AI unavailable · retrying':'AI connecting…';
    const daily=dailyUsageView(ai?.telemetry);const label=text+` · Today: ${daily.total.toLocaleString()} tokens${daily.partial?' (partial)':''}`;
    if(connectionText.textContent!==label)connectionText.textContent=label;
    connection.title=offline?'The game server cannot be reached.':ai?.error||'Status of the last AI response; provider availability is checked when a request is made.';
  }
  const diagnostics=document.createElement('section');diagnostics.id='resident-ai-details';diagnostics.hidden=true;diagnostics.setAttribute('aria-label','AI connection and token usage');
  diagnostics.innerHTML='<header><h2>AI connection</h2><button type="button" aria-label="Close AI details">×</button></header><div class="ai-export"><button id="ai-export-csv" type="button">↓ Export research CSV</button><label><input id="ai-export-payloads" type="checkbox" checked> Include last request and response</label><p>Exports cumulative totals, retained attempts (up to 12), and provider health. Full payloads are retained only for the latest attempt.</p></div><p id="ai-detail-summary"></p><section id="ai-daily-usage" aria-label="Daily AI usage"></section><details><summary>Daily usage history</summary><div id="ai-daily-history"></div></details><h3>Lifetime usage</h3><div id="ai-token-counts"></div><p class="ai-detail-note">Provider-reported tokens since tracking began, saved across updates. Output counts can include model reasoning tokens. Failed requests may not report usage. Provider quotas can also include other apps and diagnostic requests using the same account.</p><div id="ai-provider-health"></div><details><summary>Last request sent to the model</summary><p>Includes instructions, available actions, position, needs, mood, goals, recent experiences and conversation. API keys and authorization headers are excluded.</p><pre id="ai-sent"></pre></details><details><summary>Last response received</summary><p>Public answer and decision only. Internal reasoning traces are excluded.</p><pre id="ai-received"></pre></details><details><summary>Last rejected AI decision</summary><pre id="ai-rejected"></pre></details><details><summary>Recent request attempts</summary><pre id="ai-attempts"></pre></details>';
  connection.setAttribute('aria-controls','resident-ai-details');connection.setAttribute('aria-expanded','false');
  function renderDiagnostics(next){
    if(diagnostics.hidden)return;
    const ai=next.ai||{},t=ai.telemetry||{},exchange=t.lastExchange;
    const daily=dailyUsageView(t),dailyPanel=diagnostics.querySelector('#ai-daily-usage');dailyPanel.replaceChildren();
    const add=(parent,tag,text)=>{const e=document.createElement(tag);e.textContent=text;parent.append(e);return e;};
    add(dailyPanel,'h3',`Today · ${daily.today} · Toronto`);add(dailyPanel,'strong',`${daily.total.toLocaleString()} reported tokens · ${daily.requests} requests`);
    for(const provider of [...new Set(['Groq','Mistral',...Object.keys(daily.current.providers)])]){const p=daily.current.providers[provider];add(dailyPanel,'p',`${provider}: ${(p?.total||0).toLocaleString()} tokens · ${p?.requests||0} requests · input ${(p?.input||0).toLocaleString()} / output ${(p?.output||0).toLocaleString()}${p?.missing?' · '+p.missing+' requests without usage data':''}`);}
    add(dailyPanel,'p',daily.partial?'Partial day: older requests were not tracked by date. Only retained history and new requests are counted; the lifetime total is not assigned to today.':'Resets at midnight in America/Toronto. Counts this game’s provider-reported usage; requests without usage data are not estimated.');
    for(const [provider,q] of Object.entries(t.quotaSnapshots||{}))add(dailyPanel,'p',`${provider} last account quota reading: ${q.used.toLocaleString()} / ${q.limit.toLocaleString()} ${q.kind} · ${new Date(q.at).toLocaleString()}. This is a dated provider snapshot, not a live balance or the game’s daily counter.`);
    const history=diagnostics.querySelector('#ai-daily-history');history.replaceChildren();for(const day of daily.days){const total=Object.values(day.providers).reduce((sum,p)=>sum+p.total,0);add(history,'p',`${day.date}: ${total.toLocaleString()} tokens${day.partial?' · partial history':''} · ${Object.entries(day.providers).map(([name,p])=>name+' '+p.total.toLocaleString()).join(' · ')}`);}if(!daily.days.length)add(history,'p','No dated request history yet.');
    diagnostics.querySelector('#ai-rejected').textContent=t.lastRejectedDecision?JSON.stringify(t.lastRejectedDecision,null,2):'No rejected decision retained yet.';
    diagnostics.querySelector('#ai-detail-summary').textContent=ai.error||`${ai.provider||'AI'} · ${ai.model||'not configured'} · ${ai.connected?'last response succeeded':'waiting for a successful response'}`;
    diagnostics.querySelector('#ai-token-counts').textContent=`Input: ${(t.input||0).toLocaleString()} · Output: ${(t.output||0).toLocaleString()} · Total: ${(t.total||0).toLocaleString()} · Requests: ${t.requests||0} · Usage reported: ${t.usageReported||0}`;
    const health=diagnostics.querySelector('#ai-provider-health');health.replaceChildren();
    for(const provider of ai.providerHealth||[]){const p=document.createElement('p');p.textContent=`${provider.provider}: ${provider.status||'not checked'}${provider.error?' — '+provider.error:''}${provider.quota?.kind?' · '+provider.quota.kind+': '+provider.quota.used.toLocaleString()+' / '+provider.quota.limit.toLocaleString()+' used · request '+provider.quota.requested.toLocaleString():''}${provider.retryAt>Date.now()?' · retry in '+Math.ceil((provider.retryAt-Date.now())/1000)+'s':''}`;health.append(p);}
    diagnostics.querySelector('#ai-sent').textContent=exchange?JSON.stringify({provider:exchange.provider,model:exchange.model,at:new Date(exchange.at).toISOString(),request:exchange.sent},null,2):'No request recorded yet.';
    diagnostics.querySelector('#ai-received').textContent=exchange?JSON.stringify({httpStatus:exchange.httpStatus,latencyMs:exchange.latencyMs,usage:exchange.usage,response:exchange.received,error:exchange.error},null,2):'No response recorded yet.';
    diagnostics.querySelector('#ai-attempts').textContent=JSON.stringify(t.recent||[],null,2);
  }
  connection.onclick=()=>{diagnostics.hidden=!diagnostics.hidden;connection.setAttribute('aria-expanded',String(!diagnostics.hidden));if(!diagnostics.hidden){panel.hidden=true;toggle.setAttribute('aria-expanded','false');renderDiagnostics(snapshot);}};
  diagnostics.querySelector('#ai-export-csv').onclick=()=>downloadAiCsv(snapshot.ai,diagnostics.querySelector('#ai-export-payloads').checked);
  diagnostics.querySelector('header button').onclick=()=>{diagnostics.hidden=true;connection.setAttribute('aria-expanded','false');connection.focus();};
  const playback=document.createElement('div');playback.id='resident-playback';
  playback.innerHTML='<button id="resident-pause" type="button">Ⅱ Pause life & AI</button><button id="resident-restart" type="button" title="Reconnect AI and continue the saved life">↻ Restart AI</button><span id="resident-pause-status" role="status"></span>';
  let controlBusy=false;
  async function control(action){
    if(controlBusy)return;controlBusy=true;for(const b of playback.querySelectorAll('button'))b.disabled=true;
    try{const response=await fetch('/api/resident/control',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action})});if(response.status===401){location.replace('/');return;}const next=await response.json();if(!response.ok)throw Error(next.error||'Unable to update playback.');apply(next);}
    catch(error){playback.querySelector('#resident-pause-status').textContent=error.message;}
    finally{controlBusy=false;for(const b of playback.querySelectorAll('button'))b.disabled=false;}
  }
  playback.querySelector('#resident-pause').onclick=()=>control(snapshot.paused?'resume':'pause');
  playback.querySelector('#resident-restart').onclick=()=>control('restart');
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
    <article class="brain-learning"><small>LEARNING & GROUNDED MEMORY</small><p id="brain-learning"></p><p id="brain-observation"></p></article><div id="brain-needs" aria-label="Character needs"></div><div class="brain-facts"><article><small>MOOD & ACTIVITY</small><p id="brain-mood"></p></article><article><small>PERCEPTION</small><p id="brain-perception"></p></article><article><small>CURRENT GOAL</small><p id="brain-goal"></p></article><article><small>PLANNER</small><p id="brain-planner"></p></article><article><small>CURRENT INTENTION</small><p id="resident-goal"></p></article><article><small>MEMORY STORAGE</small><p id="brain-storage"></p></article></div>
    <details><summary id="brain-memory-label">Recent memories</summary><ol id="resident-history"></ol></details>
    <details id="resident-chat" open><summary>Talk to your resident</summary><div id="resident-messages" aria-live="polite"></div><form id="resident-chat-form"><label for="resident-message">Your message</label><textarea id="resident-message" rows="2" maxlength="1200" placeholder="What are you planning?" required></textarea><button type="submit">Send</button><p id="resident-chat-error" role="alert"></p></form></details>`;
  const setOpen=open=>{if(open){diagnostics.hidden=true;connection.setAttribute('aria-expanded','false');}panel.hidden=!open;toggle.setAttribute('aria-expanded',String(open));if(open)panel.querySelector('#resident-brain-close').focus();else toggle.focus();};
  toggle.onclick=()=>setOpen(panel.hidden);panel.querySelector('#resident-brain-close').onclick=()=>setOpen(false);panel.addEventListener('keydown',event=>{if(event.key==='Escape'){event.stopPropagation();setOpen(false);}});
  const bubble=document.createElement('div');bubble.id='resident-thought';bubble.setAttribute('aria-label','Current intention');
  document.querySelector('#app').append(toggle,connection,playback,diagnostics,panel,bubble);
  let snapshot=initial,busy=false,geometrySent=false,lastEvents='',lastMessages='',receivedAt=Date.now();
  let chatBusy=false;
  const learningView=mountLearningView();const phoneView=mountResidentPhone();mountResidentSidebar();
  const motion=new ResidentMotion(initial.player,performance.now());
  function apply(next){motion.receive(next.player,performance.now(),{snap:next.arrival.phase!==snapshot.arrival.phase||next.arrival.phase!=='landed'});snapshot=next;phoneView.update(next);Object.assign(arrival,next.arrival);Object.assign(welcome,next.welcome);receivedAt=Date.now();
    learningView.update(next);showConnection(next.ai);renderDiagnostics(next);playback.querySelector('#resident-pause').textContent=next.paused?'▶ Resume life & AI':'Ⅱ Pause life & AI';playback.querySelector('#resident-pause-status').textContent=next.paused?'Paused · no new AI requests or memories':'';
    document.body.classList.toggle('arriving',next.arrival.phase!=='landed');
    document.querySelector('#arrival-title').textContent=next.arrival.phase==='parachute'?'Coming in to land.':'Your island is on the horizon.';
    document.querySelector('#arrival-detail').textContent=next.thought;
    panel.querySelector('#resident-goal').textContent=next.thought;bubble.textContent='☁ '+next.thought;
    panel.querySelector('#resident-status').textContent=next.saveError?'Save failed — progress is at risk.':!next.initialized?'Preparing your city…':next.ai?.error?next.ai.error:next.mode==='ai'?(next.ai.status==='thinking'?'Choosing my next activity…':`${next.ai.provider||'AI'} connected · life saved on server`):'Routine mode · AI not configured';
    panel.querySelector('#brain-learning').textContent=`${next.learning?.totalOutcomes||0} measured activity outcomes · ${next.memoryCache?.hits||0} memory cache hits · ${next.ai?.localRecallHits||0} factual replies without an API call`;
    const observation=next.observations?.at(-1);panel.querySelector('#brain-observation').textContent=observation?`Verified location: ${observation.nearbyPlaces?.map(p=>p.name).join(', ')||'x '+observation.position.x+', z '+observation.position.z}. Activity: ${observation.activity}. Source: game simulation.`:'No observations recorded yet. Visual details and sounds are not sensed.';
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
    panel.querySelector('#resident-chat-form button').disabled=next.paused||!next.ai?.enabled||chatBusy;
    const signature=JSON.stringify(next.events);
    if(signature!==lastEvents){lastEvents=signature;const list=panel.querySelector('#resident-history');list.replaceChildren();
      for(const event of [...next.events].reverse().slice(0,80)){const li=document.createElement('li'),time=document.createElement('time');time.dateTime=new Date(event.at).toISOString();time.textContent=new Date(event.at).toLocaleString();li.append(time,document.createTextNode(event.message));list.append(li);}
    }
  }
  panel.querySelector('#resident-chat-form').onsubmit=async event=>{
    event.preventDefault();if(chatBusy)return;
    const input=panel.querySelector('#resident-message'),button=panel.querySelector('#resident-chat-form button'),error=panel.querySelector('#resident-chat-error');
    if(snapshot.paused||!input.value.trim())return;
    chatBusy=true;button.disabled=true;button.textContent='Listening…';error.textContent='';
    const message=input.value.trim();input.disabled=true;
    try{
      for(;;){
        if(snapshot.paused)throw Error('Game paused. Resume to chat.');
        const response=await fetch('/api/resident/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message})});
        if(response.status===401){location.replace('/');return;}
        const data=await response.json();
        if(!response.ok){
          if([429,503].includes(response.status)&&Number.isFinite(data.retryAfterMs)&&data.retryAfterMs>0){
            const until=Date.now()+Math.max(1000,data.retryAfterMs);
            while(Date.now()<until){if(snapshot.paused)throw Error('Game paused. Resume to chat.');const seconds=Math.ceil((until-Date.now())/1000);button.textContent=`Queued · ${seconds}s`;error.textContent='Your message is queued. Waiting for the AI connection…';await new Promise(resolve=>setTimeout(resolve,Math.min(1000,Math.max(1,until-Date.now()))));}
            button.textContent='Listening…';error.textContent='';continue;
          }
          throw Error(data.error||'Unable to send message.');
        }
        input.value='';error.textContent='';await sync();break;
      }
    }catch(e){error.textContent=e.message;}finally{chatBusy=false;input.disabled=false;button.disabled=snapshot.paused||!snapshot.ai?.enabled;button.textContent='Send';}

  };
  apply(initial);Object.assign(player,initial.player);
  async function sync(){
    if(busy)return;busy=true;
    try{
      let response;
      if(!geometrySent&&getWorld()){
        response=await fetch('/api/resident/world',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({obstacles:getWorld().obstacles,objects:getWorld().interactionObjects||[]})});
        if(response.ok)geometrySent=true;
      }else response=await fetch('/api/resident',{cache:'no-store'});
      if(response.status===401){location.replace('/');return;}
      if(!response.ok)throw Error(`City connection failed (${response.status})`);apply(await response.json());
    }catch(error){phoneView.update({...snapshot,ai:{...snapshot.ai,connected:false}});showConnection(snapshot.ai,true);panel.querySelector('#resident-status').textContent=error.message+' · retrying';if(!geometrySent)document.querySelector('#arrival-detail').textContent='Waiting for the city connection. Retrying automatically…';}finally{busy=false;}
  }
  const interval=setInterval(sync,400);sync();window.addEventListener('pagehide',()=>clearInterval(interval),{once:true});
  const marker=document.createElement('button');marker.type='button';marker.id='resident-marker';marker.setAttribute('aria-label','Move camera close to your resident');marker.onclick=onLocate;marker.innerHTML='<span aria-hidden="true">◆</span> YOUR RESIDENT';document.querySelector('#app').append(marker);
  const point=new THREE.Vector3();
  return {get paused(){return snapshot.paused===true;},update(camera){
    // Never advance the saved life in the browser: all tabs observe one server state.
    const pitch=player.pitch;Object.assign(player,motion.sample(performance.now()));player.pitch=pitch;if(!snapshot.player.phone)delete player.phone;if(!snapshot.player.interactionPose)delete player.interactionPose;player.arrival=arrival;
    if(Date.now()-receivedAt>3000){player.speed=0;player.moving=false;showConnection(snapshot.ai,true);}
  },render(camera,pose){
    const rect=document.querySelector('#viewport').getBoundingClientRect(),width=rect.width,height=rect.height;
    point.set(pose.x,(pose.y||0)+2.8,pose.z).project(camera);
    const outside=point.z>1||point.z< -1||Math.abs(point.x)>.9||Math.abs(point.y)>.9;
    marker.classList.toggle('offscreen',outside);marker.style.left=`${rect.left+Math.max(85,Math.min(width-85,(point.x*.5+.5)*width))}px`;marker.style.top=`${Math.max(110,Math.min(height-80,(-point.y*.5+.5)*height))}px`;
    marker.title=outside?'Resident is outside the view. Use Locate resident.':'Your autonomous character';
    point.set(pose.x,(pose.y||0)+4.5,pose.z).project(camera);
    bubble.hidden=arrival.phase!=='landed'||point.z>1||point.z< -1||Math.abs(point.x)>1||Math.abs(point.y)>1;
    bubble.style.left=`${rect.left+(point.x*.5+.5)*width}px`;bubble.style.top=`${(-point.y*.5+.5)*height}px`;
  }};
}
