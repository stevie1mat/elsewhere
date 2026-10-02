import * as THREE from 'three';
import { World } from './world.js';
import { MumbaiWorld } from './mumbai-world.js';
import { ChaiWorld } from './chai-world.js';
import { CHAI_SPAWN,CHAI_LANDMARKS,CHAI_ROADS,createChai,chaiTarget,canServe,serveChai,stepChai } from './chai.js';
import { MUMBAI_SPAWN, MUMBAI_LANDMARKS, MUMBAI_ROADS } from './mumbai-layout.js';
import { SPAWN as PORTO_SPAWN, LANDMARKS as PORTO_LANDMARKS, createPlayer as createPortoPlayer, stepPlayer, validateSavedPosition } from './movement.js';
import './style.css';
import { mapProjection,panMap,zoomMap } from './map-view.js';
import { CoopClient,coopEndpoint } from './coop.js';
import { restoreQuest, activeStop, canInteract, advanceQuest } from './quest.js';

const isMumbai=new URLSearchParams(location.search).get('world')==='mumbai';
const isChai=new URLSearchParams(location.search).get('world')==='chai';
const isUrban=isMumbai||isChai;
const worldName=isChai?'Chai District':isMumbai?'Mumbai':'Porto Sol';
const SPAWN=isChai?CHAI_SPAWN:isMumbai?MUMBAI_SPAWN:PORTO_SPAWN;
const LANDMARKS=isChai?CHAI_LANDMARKS:isMumbai?MUMBAI_LANDMARKS:PORTO_LANDMARKS;
const createPlayer=()=>({...createPortoPlayer(),...SPAWN});
document.title=`Elsewhere — ${worldName}`;

const icons = {
  logo:'<path d="M6 17V7h13M6 12h9M6 18h13"/><circle cx="20" cy="4" r="1.2" fill="currentColor" stroke="none"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  moon:'<path d="M20.3 15.3A8.5 8.5 0 0 1 8.7 3.7a8.5 8.5 0 1 0 11.6 11.6Z"/>',
  volume:'<path d="M11 4 6 8H3v8h3l5 4V4Zm4 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  muted:'<path d="M11 4 6 8H3v8h3l5 4V4Zm5 5 5 6m0-6-5 6"/>',
  settings:'<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3" fill="#213a36"/><circle cx="16" cy="17" r="3" fill="#213a36"/>',
  arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',
  close:'<path d="m6 6 12 12M6 18 18 6"/>',
  camera:'<path d="M8 5 6 8H3v12h18V8h-3l-2-3H8Z"/><circle cx="12" cy="13" r="3"/>',
  help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 8.5a2.5 2.5 0 1 1 4 2c-1 .5-1.5 1-1.5 2.5m0 3h.01"/>',
};
const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name]}</svg>`;
document.querySelector('#app').innerHTML = `
  <div id="viewport" aria-label="Porto Sol 3D world"></div><div id="vignette"></div>
  <div class="ui" id="ui">
    <header class="topbar"><div class="brand"><span class="brand-symbol">${icon('logo')}</span><span class="wordmark">elsewhere</span><span class="edition">${isChai?'world 003':isMumbai?'world 002':'world 001'}</span></div>
      <div class="top-actions"><label class="world-select-label"><span>World</span><select id="world-select" aria-label="Choose ride environment"><option value="porto">Porto Sol</option><option value="mumbai">Mumbai lanes</option><option value="chai">Chai District</option></select></label><button class="weather" id="time-toggle" aria-label="Switch to blue hour" title="Change time of day">${icon('sun')}<span id="time-label">Golden hour</span><span class="separator"></span><span class="temp">22°</span></button>
      <button class="icon-button" id="sound-toggle" aria-label="Enable ocean ambience" aria-pressed="false" title="Ocean ambience">${icon('muted')}</button>
      <button class="icon-button" id="photo" aria-label="Save a photo" title="Save a photo">${icon('camera')}</button>
      <button class="text-button" id="coop-button">Ride together</button>
      <button class="icon-button" id="settings-button" aria-label="Open settings" title="Settings">${icon('settings')}</button></div>
    </header>
    <div class="place-label"><i class="dot"></i><span>${worldName}</span><span> / &nbsp; ${isChai?'THE CHAI RUN':isMumbai?'Mukund Nagar lanes':'The southern coast'}</span></div>
    <section class="intro" id="intro"><div class="eyebrow"><span class="rule"></span>A place to just be</div><h1>${isChai?'Every drop<br><em>counts.</em>':'Take the<br><em>scenic route.</em>'}</h1><p>${isChai?'Hot chai. Busy streets. A delicate delivery.<br>Ride gently. Bring the neighborhood its tea.':isMumbai?'Start by the church. Follow the shade.<br>A little corner of Mumbai, yours to ride.':'Salt in the air. Sun on the pavement.<br>A little coastal world, yours to ride.'}</p>
      <button class="enter" id="enter" disabled><span>Preparing your world</span>${icon('arrow')}</button>
      <div class="loading-line" id="loading-line"><div id="progress"></div></div><div class="loading-status" id="loading-status">Unpacking the neighborhood…</div>
      <div class="intro-note">A parcel. A faded postcard. Someone waiting at the pier.</div>
    </section>
    <section class="journey" aria-label="Places to discover"><div class="journey-head"><span>Around the neighborhood</span><strong id="discovered-count">0 / 3</strong></div>
      ${LANDMARKS.map(l=>`<button class="destination" data-destination="${l.id}"><span class="destination-number">${l.number}</span><span>${l.name}</span><span class="distance" id="distance-${l.id}"></span></button>`).join('')}
      <p class="journey-hint" id="journey-hint">Choose a place to mark it on your map.</p>
    </section>
    <section class="quest-card" aria-label="Adventure tracker"><div class="quest-eyebrow">THE LAST LIGHT · CHAPTER 01 <span id="quest-count"></span></div><h2 id="quest-title"></h2><p id="quest-objective"></p><small id="quest-item"></small><small id="coop-hud"></small><button id="quest-track" class="text-button">Show destination</button></section>
    <button id="quest-interact" class="quest-interact" hidden></button>
    <aside class="map-card" aria-label="Neighborhood map"><div class="map-header"><span>YOUR LITTLE CORNER</span><button id="map-expand" aria-label="Expand map" title="Open big map (M)">Expand ↗</button></div><div class="map-frame"><canvas id="map" width="356" height="344" tabindex="0" aria-label="Neighborhood map. Drag to pan, scroll to zoom. Plus and minus zoom; zero resets."></canvas><div class="map-north"><span>↑</span>N</div></div><div class="map-controls" aria-label="Map zoom controls"><button id="map-out" aria-label="Zoom map out" title="Zoom out (−)">−</button><output id="map-zoom" aria-label="Map zoom level">1×</output><button id="map-in" aria-label="Zoom map in" title="Zoom in (+)">+</button><button id="map-follow" aria-label="Follow my cyclist" title="Center on your cyclist">Follow</button><button id="map-reset" aria-label="Reset map zoom" title="Show whole neighborhood (0)">Reset</button></div><p class="map-help">Drag to explore · Scroll to zoom · M / Esc to close</p><div class="map-footer"><span class="live"><i></i><span id="zone">Seafront promenade</span></span><span class="performance" id="performance"></span></div></aside>
    <div class="crosshair"></div><div class="look-hint">Click the scene to look around · Esc releases your cursor</div>
    <div class="toast" id="toast" role="status" aria-live="polite"></div>
    <div class="discovery" id="discovery"><small>A little discovery</small><h2 id="discovery-name"></h2><p id="discovery-description"></p></div>
    <footer class="bottom-bar"><div class="world-tag">An open-world sketch <span>v0.1</span></div><div class="controls"><div class="control"><kbd>W / S</kbd><span>Pedal / reverse</span></div><div class="control"><kbd>A / D</kbd><span>Steer</span></div><div class="control"><kbd>⇧</kbd><span>Pedal faster</span></div><div class="control"><kbd>Space</kbd><span>Brake</span></div><div class="control"><kbd>Mouse</kbd><span>Orbit</span></div><div class="control"><kbd>P</kbd><span>Hide UI</span></div><div class="control"><button class="icon-button" id="help-button" aria-label="Cycling controls" style="width:26px;height:26px">${icon('help')}</button></div></div><div class="bottom-note">BUILT FOR RIDING</div></footer>
    <div class="touch-controls"><div class="dpad"><button data-key="KeyW" aria-label="Pedal forward">↑</button><button data-key="KeyA" aria-label="Steer left">←</button><button data-key="KeyS" aria-label="Reverse">↓</button><button data-key="KeyD" aria-label="Steer right">→</button></div><div class="touch-actions"><button data-key="ShiftLeft" aria-label="Pedal faster">Fast</button><button data-key="Space" aria-label="Brake">Brake</button></div></div>
  </div>
  <button class="photo-exit" id="photo-exit">Show interface · P</button>
  <dialog id="map-dialog" aria-label="Expanded neighborhood map"></dialog>
  <dialog id="coop-dialog" aria-labelledby="coop-heading"><div class="dialog-title"><h2 id="coop-heading">Better with a friend.</h2><button class="icon-button" data-close aria-label="Close multiplayer">${icon('close')}</button></div><p>Two bicycles. One shared adventure. Ride to each gold marker together; either rider can complete the step.</p><p id="coop-status" role="status">Solo ride</p><button class="enter" id="coop-host">Create a two-player room</button><label class="coop-label" for="coop-code">Or enter your friend’s room code</label><div class="coop-join"><input id="coop-code" maxlength="16" placeholder="16-character code" autocomplete="off" spellcheck="false"><button class="text-button" id="coop-join">Join</button></div><div id="coop-invite" hidden><label class="coop-label" for="coop-link">Invite link</label><input id="coop-link" readonly aria-label="Invite link"><button class="text-button" id="coop-copy">Copy invite</button><button class="text-button" id="coop-leave">Leave room</button></div><p class="coop-note">Co-op starts a separate shared quest. Your solo progress stays saved. A disconnected rider’s place is reserved for one minute; empty rooms expire after 15 minutes.</p></dialog>
  <dialog id="quest-dialog" aria-labelledby="quest-speaker"><div class="dialog-title"><h2 id="quest-speaker"></h2><button class="icon-button" data-close aria-label="Close conversation">${icon('close')}</button></div><div class="quest-postcard">PORTO SOL / A DELIVERY TO REMEMBER</div><p id="quest-dialogue"></p><button class="enter" id="quest-confirm"></button><p class="quest-later">Close to return later. Your parcel and progress are saved.</p></dialog>
  <dialog id="settings"><div class="dialog-title"><h2>Make yourself at home.</h2><button class="icon-button" data-close aria-label="Close settings">${icon('close')}</button></div>
    <div class="settings-row"><div>Time of day<small>A different kind of atmosphere.</small></div><div class="segmented"><button data-time="day" class="active">Golden</button><button data-time="night">Blue hour</button></div></div>
    <div class="settings-row"><div>Graphics<small>Lower detail, a lighter footprint.</small></div><div class="segmented"><button data-quality="balanced">Balanced</button><button data-quality="high" class="active">High</button></div></div>
    <div class="settings-row"><div>Camera smoothing<small>A smooth camera following your bicycle.</small></div><button class="text-button" id="bob-toggle" aria-pressed="true">On</button></div>
    <div class="settings-row"><div>Your favorite spot<small>Saved only on this browser.</small></div><button class="text-button" id="save-spot">Save spot</button></div>
    <div class="settings-row"><div>Back to the waterfront</div><button class="text-button" id="reset">Return to start</button></div>
    <h3>About this little world</h3><p>Ride your bicycle through Porto Sol in third person. Explore the café, pier, and garden. Buildings are exterior scenery.</p>
    <p class="credits">Local assets reused from the original game.<br>Scenery textures & tree: <a href="https://polyhaven.com/license" target="_blank" rel="noopener">Poly Haven · CC0</a><br>Animated pedestrians: <a href="https://github.com/microsoft/Microsoft-Rocketbox" target="_blank" rel="noopener">Microsoft Rocketbox · MIT</a></p>
  </dialog>
  <dialog id="help"><div class="dialog-title"><h2>A little room to roam.</h2><button class="icon-button" data-close aria-label="Close controls">${icon('close')}</button></div><div class="keys">
    <div class="key-row"><span>Pedal / reverse</span><kbd>W S / ↑ ↓</kbd></div><div class="key-row"><span>Orbit camera</span><kbd>Mouse / drag</kbd></div><div class="key-row"><span>Steer</span><kbd>A D / Q E / ← →</kbd></div><div class="key-row"><span>Pedal faster</span><kbd>Shift</kbd></div><div class="key-row"><span>Brake</span><kbd>Space</kbd></div><div class="key-row"><span>Release cursor</span><kbd>Esc</kbd></div><div class="key-row"><span>Hide interface</span><kbd>P</kbd></div><div class="key-row"><span>Return to start</span><kbd>R</kbd></div><div class="key-row"><span>Talk / inspect nearby clue</span><kbd>F</kbd></div><div class="key-row"><span>Center camera behind bike</span><kbd>C</kbd></div><div class="key-row"><span>Expand / close map</span><kbd>M</kbd></div><div class="key-row"><span>Map zoom / reset</span><kbd>+ − / 0</kbd></div>
    </div><p>On a touch screen, use the arrows to pedal and steer, and drag to orbit the camera. Ride near a landmark to discover it.</p></dialog>`;

const $ = s => document.querySelector(s);
$('#world-select').value=isChai?'chai':isMumbai?'mumbai':'porto';
$('#world-select').onchange=event=>{const url=new URL(location.href);url.search='';url.searchParams.set('world',event.target.value);location.href=url.href;};
if(isMumbai){
  $('.quest-card').hidden=true;$('#coop-button').hidden=true;$('#sound-toggle').hidden=true;
  $('#viewport').setAttribute('aria-label','Mumbai lanes 3D world');
  $('.intro-note').textContent='Inspired by your photographs · Free ride';
  $('.temp').textContent='29°';
  $('#reset').parentElement.firstElementChild.textContent='Back to the church';
  $('#settings h3 + p').textContent='Ride from the Church of God headquarters through shaded Mumbai lanes. An original interpretation of the supplied photographs; surrounding streets are not a surveyed map. Mumbai is a solo free ride.';
}
if(isChai){
  document.body.classList.add('chai-world');
  $('#coop-button').hidden=true;$('#sound-toggle').hidden=true;
  $('#viewport').setAttribute('aria-label','Chai District 3D world');
  $('.temp').textContent='28°';
  $('.quest-eyebrow').innerHTML='THE CHAI RUN <span id="quest-count"></span>';
  $('.quest-card').insertAdjacentHTML('beforeend','<div class="chai-dashboard"><div class="chai-glass"><div id="chai-liquid"></div><span>चाय</span></div><div class="chai-readings"><strong id="chai-volume">100% full</strong><span id="chai-heat">92°C · Freshly brewed</span><span id="chai-warning">Brake early. Take wide turns.</span></div></div><button id="chai-retry" class="text-button">Restart at the stall</button>');
  $('#reset').parentElement.firstElementChild.textContent='Back to the chai stall';
  $('#settings h3 + p').textContent='An original neighborhood built for chai deliveries. Collect a fresh cup at Asha’s stall, then stop at the gold marker to serve it. Sharp turns, hard braking, collisions, and potholes spill tea. Traffic yields, but give people and animals room. Solo play; R restarts your delivery.';
}
const viewport = $('#viewport');
const player = createPlayer();
let started=false, ready=false, selected=null, elapsed=0, night=false, bob=!matchMedia('(prefers-reduced-motion: reduce)').matches, soundOn=false, quality='high';
let orbitYaw=0;
const mapView={zoom:1,center:null};
let mapExpanded=false;
const cameraRay=new THREE.Raycaster(), cameraAim=new THREE.Vector3(), cameraDesired=new THREE.Vector3();
let renderer, scene, camera, world, audioContext, audioGain, toastTimer, discoveryTimer;
const keys=new Set(), discovered=new Set();
const storage={get(key){try{return JSON.parse(localStorage.getItem(`elsewhere:${isChai?'chai:':isMumbai?'mumbai:':''}${key}`));}catch{return null;}},set(key,value){try{localStorage.setItem(`elsewhere:${isChai?'chai:':isMumbai?'mumbai:':''}${key}`,JSON.stringify(value));return true;}catch{return false;}}};
let quest=restoreQuest(storage.get('quest'));
let chai=createChai();
let chaiBest=Number(storage.get('best'))||0;
let dialogueStop=null;
let pendingInvite=false, entryRoom=null, returningRoom=false;
const coop=new CoopClient({
  onWelcome(message){Object.assign(player,message.position);releaseKeys();$('#coop-code').value=message.room;const link=new URL(location.href);link.search='';link.searchParams.set('room',message.room);link.hash='';$('#coop-link').value=link.href;$('#coop-invite').hidden=false;history.replaceState(null,'',link);entryRoom=message.room;returningRoom=true;if(pendingInvite&&ready){pendingInvite=false;if($('#coop-dialog').open)$('#coop-dialog').close();startRide();}refreshEntry();},
  onState(state){
    const previous=quest.stage;quest={version:1,stage:state.stage};
    if(world){world.coopMode=true;world.carryParcel=state.carrier===coop.id;world.setRemote(state.players.find(p=>p.id!==coop.id),state.carrier);}
    if(state.stage!==previous){
      if($('#quest-dialog').open)$('#quest-dialog').close();dialogueStop=null;
      selected=activeStop(quest)?.id??null;updateDiscoveries();
      toast(state.stage===3?'Together, delivered · Sunset Gold unlocked for both riders!':'Shared objective updated. Ride to the next gold marker together.');
    }
    $('#quest-confirm').disabled=false;updateQuest();
  },
  onStatus(status){$('#coop-status').textContent=status;$('#coop-host').disabled=coop.active;$('#coop-join').disabled=coop.active;$('#coop-code').disabled=coop.active;$('#coop-leave').hidden=!coop.active;if(!coop.connected)world?.setRemote(null);refreshEntry();},
  onExit(){pendingInvite=false;clearEntryRoom();quest=restoreQuest(storage.get('quest'));if(world){world.coopMode=false;world.carryParcel=true;world.setRemote(null);}$('#coop-invite').hidden=true;$('#quest-confirm').disabled=false;if($('#quest-dialog').open)$('#quest-dialog').close();dialogueStop=null;updateQuest();},
  onError(message){pendingInvite=false;refreshEntry();$('#loading-status').textContent=message;$('#coop-status').textContent=message;$('#quest-confirm').disabled=false;toast(message);}
});
let lastRoom=null;try{lastRoom=sessionStorage.getItem('elsewhere:last-room');}catch{}
const invitedRoom=isUrban?null:new URLSearchParams(location.search).get('room')||lastRoom;
entryRoom=invitedRoom&&/^[a-f0-9]{16}$/.test(invitedRoom)?invitedRoom:null;
try{returningRoom=!!(entryRoom&&sessionStorage.getItem(`elsewhere:room:${entryRoom}`));}catch{}
if(invitedRoom&&/^[a-f0-9]{16}$/.test(invitedRoom)){$('#coop-code').value=invitedRoom;$('#coop-status').textContent=returningRoom?'Your previous room is ready to resume.':'Your friend invited you. Select Join to ride together.';}
if(!coopEndpoint())$('#coop-status').textContent='Online co-op is not configured on this site yet. Solo adventures are ready to play.';
$('#coop-button').onclick=()=>openDialog('#coop-dialog');
$('#coop-host').onclick=()=>coop.join(null);
$('#coop-join').onclick=()=>{const code=$('#coop-code').value.trim().toLowerCase();if(!/^[a-f0-9]{16}$/.test(code)){toast('Enter the 16-character room code from your friend.');return;}pendingInvite=!started;coop.join(code);refreshEntry();};
$('#coop-leave').onclick=()=>{coop.leave();refreshEntry();};
$('#coop-copy').onclick=async()=>{try{await navigator.clipboard.writeText($('#coop-link').value);toast('Invite copied. Send it to your friend.');}catch{$('#coop-link').select();toast('Select and copy the invite link.');}};
setInterval(()=>{if(coop.connected)coop.position(player);},100);
const savedDiscoveries=storage.get('discoveries');
if(Array.isArray(savedDiscoveries))savedDiscoveries.filter(id=>LANDMARKS.some(l=>l.id===id)).forEach(id=>discovered.add(id));
const prefs=storage.get('preferences');if(prefs){night=prefs.night===true;quality=prefs.quality==='balanced'?'balanced':'high';bob=typeof prefs.bob==='boolean'?prefs.bob:bob;}
function refreshEntry(){
  if(!ready)return;
  const joining=pendingInvite&&coop.active&&!coop.connected;
  $('#enter').disabled=joining;
  $('#enter span').textContent=joining?(returningRoom?'Rejoining your ride…':'Joining your friend…'):coop.connected?'Ride together in Porto Sol':entryRoom?(returningRoom?'Resume your shared ride':'Join your friend & ride'):`Ride into ${worldName}`;
  $('.intro-note').textContent=isChai?'Collect • Ride • Deliver · Keep the chai hot and the cup full':isMumbai?'Inspired by your photographs · Free ride':entryRoom&&!coop.connected?(returningRoom?'Continue riding in your previous room.':'You have a room invite. This button joins your friend.'):'A parcel. A faded postcard. Someone waiting at the pier.';
}
function clearEntryRoom(){
  entryRoom=null;returningRoom=false;
  const url=new URL(location.href);url.searchParams.delete('room');history.replaceState(null,'',url);
  refreshEntry();
}
function resumeRoom(){
  if(!entryRoom||coop.active)return;
  try{if(sessionStorage.getItem(`elsewhere:room:${entryRoom}`)){pendingInvite=true;coop.join(entryRoom);}}catch{}
}
function startRide(){
  if(!ready)return;
  started=true;$('#intro').classList.add('hidden');$('#intro').inert=true;$('#ui').classList.add('playing','unlocked');renderer.domElement.focus();
}
function savePrefs(){storage.set('preferences',{night,quality,bob});}
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3500);}
function releaseKeys(){keys.clear();player.vx=player.vz=player.speed=0;}
function modalOpen(){return !!document.querySelector('dialog[open]');}
function updateDiscoveries(){
  $('#discovered-count').textContent=`${discovered.size} / 3`;
  document.querySelectorAll('.destination').forEach(button=>{const id=button.dataset.destination;button.classList.toggle('visited',discovered.has(id));button.classList.toggle('active',id===selected);button.setAttribute('aria-pressed',String(id===selected));button.querySelector('.destination-number').textContent=discovered.has(id)?'✓':LANDMARKS.find(l=>l.id===id).number;});
}
function reset(){Object.assign(player,createPlayer());if(isChai){chai=createChai();if(world)world.delivery=chai;}orbitYaw=0;releaseKeys();toast(isChai?'Fresh start at Asha’s chai stall.':isMumbai?'Back outside the church.':'Back where the sea meets the street.');}
function setNight(value){night=value;world?.setNight(night);$('#time-label').textContent=night?'Blue hour':'Golden hour';$('#time-toggle').querySelector('svg').outerHTML=icon(night?'moon':'sun');$('#time-toggle').setAttribute('aria-label',night?'Switch to golden hour':'Switch to blue hour');document.querySelectorAll('[data-time]').forEach(b=>b.classList.toggle('active',(b.dataset.time==='night')===night));savePrefs();}
function setQuality(value){quality=value;if(renderer){renderer.setPixelRatio(Math.min(devicePixelRatio,quality==='high'?1.25:1));renderer.shadowMap.enabled=quality==='high';renderer.setSize(innerWidth,innerHeight);}document.querySelectorAll('[data-quality]').forEach(b=>b.classList.toggle('active',b.dataset.quality===quality));savePrefs();}
function setBob(){ $('#bob-toggle').textContent=bob?'On':'Off';$('#bob-toggle').setAttribute('aria-pressed',String(bob)); }

function updateQuest() {
  if(isChai){updateChaiHUD();return;}
  if(isMumbai){if(world)world.questStage=0;return;}
  const stop=activeStop(quest);
  $('#quest-count').textContent=`${Math.min(quest.stage,3)} / 3`;
  $('#quest-title').textContent=stop?.title ?? 'A delivery to remember';
  $('#quest-objective').textContent=stop ? `${stop.objective} · ${Math.round(Math.hypot(player.x-stop.x,player.z-stop.z))}m` : 'Parcel delivered. Some things are worth the long way round.';
  $('#quest-item').textContent=quest.stage===0?'F to talk · Stop near the gold marker':quest.stage===1?'Carrying: sealed parcel':quest.stage===2?'Carrying: parcel + Tomás’s postcard':'Unlocked & equipped: Sunset Gold paint';
  $('#quest-track').hidden=!stop;
  const partner=coop.state?.players.find(p=>p.id!==coop.id);
  $('#coop-hud').textContent=!coop.active?'':!coop.connected?'Co-op connection interrupted':!partner?'Co-op · waiting for your friend':`Co-op · friend ${Math.round(Math.hypot(player.x-partner.x,player.z-partner.z))}m away · stop together at each marker`;
  if(coop.active&&quest.stage>0&&quest.stage<3)$('#quest-item').textContent=coop.state?.carrier===coop.id?'Your bike carries the shared parcel':'Your friend carries the shared parcel';
  const nearby=started&&!modalOpen()&&canInteract(quest,player);
  $('#quest-interact').hidden=!nearby;
  $('#quest-interact').textContent=stop?`F · ${stop.action}`:'';
  if(world)world.questStage=quest.stage;
}
function talk() {
  if(isChai){
    if(!started||modalOpen()||!serveChai(chai,player))return;
    if(chai.phase==='delivered'){
      const best=chai.lastTip>chaiBest;if(best){chaiBest=chai.lastTip;storage.set('best',chaiBest);}
      toast(`Delivered! ${Math.round(chai.volume)}% remaining · ${Math.round(chai.heat)}°C · ${chai.lastTip} points${best?' · Personal best!':''}`);
    }else toast(`Fresh chai loaded. Deliver to ${chaiTarget(chai).name}.`);
    updateChaiHUD();return;
  }
  if(isMumbai)return;
  if(!started||modalOpen()||!canInteract(quest,player))return;
  if(coop.active&&!coop.connected){toast('Reconnect to the room before continuing the shared quest.');return;}
  dialogueStop=activeStop(quest);
  $('#quest-speaker').textContent=dialogueStop.speaker;
  $('#quest-dialogue').textContent=dialogueStop.text;
  $('#quest-confirm').textContent=dialogueStop.confirm;
  $('.quest-later').textContent=coop.active?'Both riders must stop here. Progress belongs to this room and resets if the server restarts.':'Close to return later. Your parcel and progress are saved.';
  openDialog('#quest-dialog');updateQuest();
}
$('#quest-interact').onclick=talk;
$('#quest-track').onclick=()=>{const stop=isChai?chaiTarget(chai):activeStop(quest);if(!stop)return;selected=stop.id;updateDiscoveries();toast((isChai?stop.name:stop.objective)+' Follow the gold marker.');};
$('#quest-confirm').onclick=()=>{
  if(coop.active){if(!coop.connected){toast('Waiting for the room to reconnect.');return;}$('#quest-confirm').disabled=true;coop.position(player);coop.advance(quest.stage,dialogueStop?.id);return;}
  const next=advanceQuest(quest,player,dialogueStop?.id);
  if(next===quest)return;
  quest=next;const saved=storage.set('quest',quest);selected=activeStop(quest)?.id??null;
  $('#quest-dialog').close();updateQuest();updateDiscoveries();
  toast(!saved?'Progress could not be saved in this browser.':quest.stage===3?'Delivery complete · Sunset Gold paint unlocked!':dialogueStop.hint);
  dialogueStop=null;
};


function updateChaiHUD(){
  const target=chaiTarget(chai),distance=Math.round(Math.hypot(player.x-target.x,player.z-target.z));
  $('#quest-count').textContent=`${chai.delivered} served`;
  $('#quest-title').textContent=chai.phase==='riding'?target.name:chai.phase==='failed'?'This cup needs a refill':chai.phase==='delivered'?'A well-earned tea break':'Asha has your first order';
  $('#quest-objective').textContent=chai.phase==='riding'?`Deliver a hot cup · ${distance}m to the customer`:chai.phase==='delivered'?`${chai.lastTip} points! Return for the next order · ${distance}m`:`Stop at the stall and press F · ${distance}m`;
  $('#quest-item').textContent=`Score ${chai.score} · Best delivery ${chaiBest} · ${Math.floor(chai.elapsed)}s`;
  $('#chai-volume').textContent=`${Math.round(chai.volume)}% full`;
  $('#chai-heat').textContent=`${Math.round(chai.heat)}°C · ${chai.heat>65?'Hot':chai.heat>38?'Cooling':'Cold'}`;
  $('#chai-warning').textContent=chai.phase==='failed'?'Return to the stall for fresh chai.':chai.volume<45?'Easy now — keep the rest in the cup.':'Brake early. Avoid potholes.';
  $('#chai-liquid').style.height=`${chai.volume}%`;$('#chai-liquid').style.transform=`rotate(${chai.tilt*45}deg)`;
  $('#quest-interact').hidden=!(started&&!modalOpen()&&canServe(chai,player));
  $('#quest-interact').textContent=chai.phase==='riding'?'F · Serve chai':'F · Pick up fresh chai';
  if(world)world.delivery=chai;
}
if(isChai)$('#chai-retry').onclick=reset;

function initialize(){
  renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,quality==='high'?1.25:1));renderer.setSize(innerWidth,innerHeight);
  renderer.shadowMap.enabled=quality==='high';renderer.shadowMap.type=THREE.PCFShadowMap;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.88;
  renderer.domElement.setAttribute('aria-label',`Third-person cycling in ${worldName}`);renderer.domElement.tabIndex=0;viewport.appendChild(renderer.domElement);
  scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(66,innerWidth/innerHeight,.08,3500);camera.rotation.order='YXZ';
  const manager=new THREE.LoadingManager();let failed=0;
  manager.onProgress=(_,loaded,total)=>{$('#progress').style.width=`${loaded/total*100}%`;$('#loading-status').textContent=`Bringing ${worldName} to life · ${Math.round(loaded/total*100)}%`;};
  manager.onError=()=>{failed++;};
  const finish=()=>{if(ready)return;ready=true;$('#enter').disabled=false;$('#enter span').textContent=`Ride into ${worldName}`;$('#progress').style.width='100%';$('#loading-line').hidden=true;$('#loading-status').textContent=failed?'Ready to explore. Some detail assets could not load.':'Ready when you are. Headphones optional.';refreshEntry();resumeRoom();if(pendingInvite&&coop.connected){pendingInvite=false;if($('#coop-dialog').open)$('#coop-dialog').close();startRide();}};
  manager.onLoad=finish;
  world=isChai?new ChaiWorld(scene,renderer,manager):isMumbai?new MumbaiWorld(scene,renderer,manager):new World(scene,renderer,manager);
  if(isChai)world.delivery=chai;
  const saved=isChai?null:validateSavedPosition(storage.get('spot'),world.obstacles);if(saved)Object.assign(player,saved);
  setNight(night);setQuality(quality);setBob();updateDiscoveries();updateQuest();
  setTimeout(()=>{if(!ready){finish();$('#loading-status').textContent='You can explore while the remaining details load.';}},25000);
  let previous=performance.now(),frames=0,frameClock=0,uiClock=0;
  function frame(now){
    const dt=Math.min((now-previous)/1000,.05);previous=now;
    if(!document.hidden){
      elapsed+=dt;const active=started&&!modalOpen();
      if(isChai)world.updateStreet(active?dt:0,player);
      if(active){
        stepPlayer(player,{forward:(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0),right:(keys.has('KeyD')||keys.has('KeyE')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('KeyQ')||keys.has('ArrowLeft')?1:0),sprint:keys.has('ShiftLeft')||keys.has('ShiftRight'),brake:keys.has('Space')},dt,isChai?world.obstacles.concat(world.dynamicObstacles):world.obstacles);
        if(isChai)stepChai(chai,player,dt);

      }
      world.cyclist?.update(player);
      world.updateRemote(dt);
      // Orbit around the visible rider; the bike's heading is independent of the mouse.
      const viewYaw=player.yaw+orbitYaw, distance=5.8;
      cameraAim.set(player.x,1.15,player.z);
      cameraDesired.set(player.x-Math.sin(viewYaw)*distance*Math.cos(player.pitch),1.15+Math.sin(player.pitch)*distance,player.z+Math.cos(viewYaw)*distance*Math.cos(player.pitch));
      if(!started||!bob)camera.position.copy(cameraDesired);
      else camera.position.lerp(cameraDesired,1-Math.exp(-9*dt));
      const direction=camera.position.clone().sub(cameraAim), cameraDistance=direction.length();
      cameraRay.set(cameraAim,direction.normalize());cameraRay.far=cameraDistance;
      const hit=cameraRay.intersectObjects(world.cameraColliders,false)[0];
      if(hit)camera.position.copy(cameraAim).addScaledVector(direction,Math.max(.25,hit.distance-.3));
      camera.lookAt(cameraAim);
      world.update(elapsed,modalOpen()?0:dt,camera);renderer.render(scene,camera);
      uiClock+=dt;frameClock+=dt;frames++;
      if(frameClock>1){$('#performance').textContent=`${Math.round(Math.abs(player.speed)*3.6)} km/h · ${Math.round(frames/frameClock)} fps`;frameClock=0;frames=0;}
      if(uiClock>.12){updateHUD();uiClock=0;}
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();releaseKeys();toast('Graphics paused. Waiting for the browser to restore the scene…');});
  renderer.domElement.addEventListener('webglcontextrestored',()=>toast('Graphics restored. Welcome back.'));
  addControls();
  if(import.meta.env.DEV){window.__ELSEWHERE__={getState:()=>({player:{...player},quest:{...quest},chai:isChai?{...chai}:null,coop:{connected:coop.connected,room:coop.room,players:coop.state?.players.length??0},ready,started,night,quality,selected,discovered:[...discovered],drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,obstacles:world.obstacles.length}),landmarks:LANDMARKS};}
}

function updateHUD(){
  updateQuest();
  for(const landmark of LANDMARKS){const distance=Math.hypot(player.x-landmark.x,player.z-landmark.z);$(`#distance-${landmark.id}`).textContent=`${Math.round(distance)}m`;
    if(started&&distance<landmark.radius&&!discovered.has(landmark.id)){
      discovered.add(landmark.id);storage.set('discoveries',[...discovered]);updateDiscoveries();
      $('#discovery-name').textContent=landmark.name;$('#discovery-description').textContent=landmark.subtitle;$('#discovery').classList.add('visible');
      clearTimeout(discoveryTimer);discoveryTimer=setTimeout(()=>$('#discovery').classList.remove('visible'),4500);
      if(discovered.size===LANDMARKS.length)$('#journey-hint').textContent='Every corner found. Stay a little longer.';
    }
  }
  $('#zone').textContent=isChai?(player.z>50?'Chai bazaar':player.x<-60?'Flower market':'Motor works'):isMumbai?(player.x<-58&&Math.abs(player.z-20)<15?'Shrinagar Complex Road':player.z>30&&player.x>-10?'Church headquarters':Math.abs(player.z-20)<9?'Marigold lane':'Mukund Nagar lanes'):player.x>64?'The old pier':player.x<-36&&player.z>50?'Jardim do Sol':player.x>35?'Seafront promenade':'Old town';
  drawMap();
}
const mapCard=$('.map-card'),mapCanvas=$('#map'),mapHome=document.createComment('Map position');
mapCard.before(mapHome);
function updateMapControls(){
  $('#map-zoom').textContent=`${Number(mapView.zoom.toFixed(1))}×`;
  $('#map-out').disabled=mapView.zoom<=1;$('#map-in').disabled=mapView.zoom>=6;
  $('#map-follow').setAttribute('aria-pressed',String(mapView.center===null&&mapView.zoom>1));
}
function setMapZoom(value,anchor){
  zoomMap(mapView,player,mapCanvas.width,mapCanvas.height,value,anchor);updateMapControls();if(world)drawMap();
}
function resizeMap(){
  const rect=mapCanvas.getBoundingClientRect();
  if(rect.width&&rect.height){mapCanvas.width=Math.round(rect.width*2);mapCanvas.height=Math.round(rect.height*2);}
  if(world)drawMap();
}
function expandMap(){
  if($('#map-dialog').open){$('#map-dialog').close();return;}
  if(modalOpen())return;
  mapExpanded=true;mapCard.classList.add('expanded');$('#map-dialog').append(mapCard);
  $('#map-expand').textContent='Close ×';$('#map-expand').setAttribute('aria-label','Close expanded map');
  openDialog('#map-dialog');resizeMap();mapCanvas.focus();
}
$('#map-dialog').addEventListener('close',()=>{
  mapExpanded=false;mapCard.classList.remove('expanded');mapHome.after(mapCard);
  $('#map-expand').textContent='Expand ↗';$('#map-expand').setAttribute('aria-label','Expand map');
  mapView.center=null;resizeMap();updateMapControls();renderer?.domElement.focus();
});
$('#map-expand').onclick=expandMap;
$('#map-in').onclick=()=>setMapZoom(mapView.zoom*1.5);
$('#map-out').onclick=()=>setMapZoom(mapView.zoom/1.5);
function resetMap(){mapView.center=null;setMapZoom(1);}
$('#map-reset').onclick=resetMap;
$('#map-follow').onclick=()=>{mapView.center=null;setMapZoom(Math.max(1.5,mapView.zoom));};
mapCanvas.addEventListener('wheel',event=>{
  event.preventDefault();const rect=mapCanvas.getBoundingClientRect();
  const multiplier=event.deltaMode===1?16:event.deltaMode===2?rect.height:1;
  if(event.deltaY)setMapZoom(mapView.zoom*Math.exp(-Math.max(-100,Math.min(100,event.deltaY*multiplier))*.003),{x:(event.clientX-rect.left)*mapCanvas.width/rect.width,y:(event.clientY-rect.top)*mapCanvas.height/rect.height});
},{passive:false});
let mapDrag=null;
mapCanvas.addEventListener('pointerdown',event=>{if(event.button!==0)return;event.preventDefault();releaseKeys();mapCanvas.focus();mapCanvas.setPointerCapture(event.pointerId);mapDrag={id:event.pointerId,x:event.clientX,y:event.clientY};mapCanvas.classList.add('dragging');});
mapCanvas.addEventListener('pointermove',event=>{
  if(!mapDrag||mapDrag.id!==event.pointerId)return;
  const rect=mapCanvas.getBoundingClientRect();panMap(mapView,player,mapCanvas.width,mapCanvas.height,(event.clientX-mapDrag.x)*mapCanvas.width/rect.width,(event.clientY-mapDrag.y)*mapCanvas.height/rect.height);
  mapDrag.x=event.clientX;mapDrag.y=event.clientY;updateMapControls();if(world)drawMap();
});
for(const type of ['pointerup','pointercancel','lostpointercapture'])mapCanvas.addEventListener(type,()=>{mapDrag=null;mapCanvas.classList.remove('dragging');});
function mapZoomKey(event){
  if(event.key==='+'||event.key==='=')setMapZoom(mapView.zoom*1.5);
  else if(event.key==='-')setMapZoom(mapView.zoom/1.5);
  else if(event.key==='0')resetMap();
  else return false;
  event.preventDefault();return true;
}
mapCard.addEventListener('keydown',event=>{if(mapZoomKey(event))event.stopPropagation();});
new ResizeObserver(resizeMap).observe(mapCanvas);
updateMapControls();
function drawMap(){
  const canvas=$('#map'),ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
  ctx.clearRect(0,0,w,h);ctx.fillStyle='#29474b';ctx.fillRect(0,0,w,h);
  const {scale,ox,oz}=mapProjection(mapView,player,w,h);
  const px=x=>ox+x*scale,pz=z=>oz+z*scale;
  const rect=(x,z,ww,dd,color)=>{ctx.fillStyle=color;ctx.fillRect(px(x),pz(z),ww*scale,dd*scale);};
  if(isUrban){
    rect(-120,-140,184,260,'#737763');
    for(const r of (isChai?CHAI_ROADS:MUMBAI_ROADS))rect(r.x-r.w/2,r.z-r.d/2,r.w,r.d,'#c5bca2');
  }else{
  rect(-120,-140,184,260,'#68786c');rect(-120,-140,156,260,'#526457');rect(-31.5,-140,15,260,'#a4ad92');rect(-120,33,184,14,'#a4ad92');rect(64,-42,53,12,'#b4b294');rect(-101.5,53,65,60,'#415c44');rect(-59.5,53,5,60,'#9aa784');rect(-101.5,67.5,65,5,'#9aa784');
  }
  for(const b of world.obstacles){if(b.maxX-b.minX>10&&b.maxZ-b.minZ>10)rect(b.minX,b.minZ,b.maxX-b.minX,b.maxZ-b.minZ,'#c2baa0');}
  ctx.strokeStyle='#a0b9aa25';ctx.lineWidth=1;for(let x=0;x<w;x+=24){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}for(let y=0;y<h;y+=24){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
  if(selected){const dest=LANDMARKS.find(l=>l.id===selected);ctx.beginPath();ctx.setLineDash([4,5]);ctx.strokeStyle='#e6ecbc70';ctx.moveTo(px(player.x),pz(player.z));ctx.lineTo(px(dest.x),pz(dest.z));ctx.stroke();ctx.setLineDash([]);}
  for(const landmark of LANDMARKS){ctx.beginPath();ctx.arc(px(landmark.x),pz(landmark.z),selected===landmark.id?10:7,0,Math.PI*2);ctx.fillStyle=selected===landmark.id?'#e7edbb':'#203c35';ctx.fill();ctx.lineWidth=1.5;ctx.strokeStyle='#d3dcaf';ctx.stroke();ctx.fillStyle=selected===landmark.id?'#243c33':'#e5ebc5';ctx.font='9px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(discovered.has(landmark.id)?'✓':landmark.number.replace('0',''),px(landmark.x),pz(landmark.z)+.5);if(mapExpanded){ctx.font='22px sans-serif';ctx.textAlign='left';ctx.fillStyle='#f5efd7';ctx.strokeStyle='#203c35';ctx.lineWidth=4;ctx.strokeText(landmark.name,px(landmark.x)+17,pz(landmark.z));ctx.fillText(landmark.name,px(landmark.x)+17,pz(landmark.z));}}
  const questStop=isChai?chaiTarget(chai):isMumbai?null:activeStop(quest);
  if(questStop){
    ctx.beginPath();ctx.setLineDash([3,4]);ctx.strokeStyle='#f1ce7e';ctx.moveTo(px(player.x),pz(player.z));ctx.lineTo(px(questStop.x),pz(questStop.z));ctx.stroke();ctx.setLineDash([]);
    ctx.save();ctx.translate(px(questStop.x),pz(questStop.z));ctx.rotate(Math.PI/4);ctx.fillStyle='#f1ce7e';ctx.fillRect(-5,-5,10,10);ctx.restore();
  }
  const friend=coop.connected?coop.state?.players.find(p=>p.id!==coop.id):null;
  if(friend){ctx.beginPath();ctx.arc(px(friend.x),pz(friend.z),5,0,Math.PI*2);ctx.fillStyle='#a5b8ff';ctx.fill();ctx.strokeStyle='#eef0ff';ctx.stroke();}
  ctx.save();ctx.translate(px(player.x),pz(player.z));ctx.rotate(player.yaw);ctx.beginPath();ctx.moveTo(0,-14);ctx.lineTo(-10,-29);ctx.quadraticCurveTo(0,-34,10,-29);ctx.closePath();ctx.fillStyle='#f3f4d42b';ctx.fill();ctx.beginPath();ctx.moveTo(0,-8);ctx.lineTo(5,6);ctx.lineTo(0,3);ctx.lineTo(-5,6);ctx.closePath();ctx.fillStyle='#f7f7e4';ctx.shadowColor='#f5ffd4';ctx.shadowBlur=8;ctx.fill();ctx.restore();
}

function addControls(){
  const canvas=renderer.domElement;let dragging=false,lastX=0,lastY=0;
  const look=(dx,dy)=>{orbitYaw+=dx*.0023;player.pitch=Math.max(.05,Math.min(.85,player.pitch+dy*.0023));};
  async function lockLook(){if(document.pointerLockElement||!started||modalOpen())return;try{await canvas.requestPointerLock();}catch{toast('Drag the scene to look around. A and D steer the bike.');}}
  $('#enter').addEventListener('click',()=>{if(!ready)return;if(entryRoom&&!coop.connected){pendingInvite=true;coop.join(entryRoom);refreshEntry();return;}startRide();if(!matchMedia('(pointer:coarse)').matches)lockLook();});
  canvas.addEventListener('pointerdown',event=>{if(!started||modalOpen())return;canvas.focus();dragging=true;lastX=event.clientX;lastY=event.clientY;if(event.pointerType!=='mouse'){canvas.setPointerCapture(event.pointerId);}else if(!document.pointerLockElement)lockLook();});
  canvas.addEventListener('pointermove',event=>{if(!started||modalOpen())return;if(document.pointerLockElement===canvas)look(event.movementX,event.movementY);else if(dragging){look(event.clientX-lastX,event.clientY-lastY);lastX=event.clientX;lastY=event.clientY;}});
  const stopDrag=()=>{dragging=false;};window.addEventListener('pointerup',stopDrag);window.addEventListener('pointercancel',stopDrag);
  document.addEventListener('pointerlockchange',()=>{$('#ui').classList.toggle('unlocked',document.pointerLockElement!==canvas);releaseKeys();dragging=false;});
  document.addEventListener('pointerlockerror',()=>toast('Mouse capture is unavailable. Drag to look, or use A / D to steer.'));
  window.addEventListener('keydown',event=>{
    if(['INPUT','TEXTAREA','SELECT'].includes(event.target.tagName))return;
    if(event.code==='KeyM'&&!event.repeat&&(!modalOpen()||$('#map-dialog').open)){event.preventDefault();expandMap();return;}
    if(modalOpen())return;
    if(mapZoomKey(event))return;
    if(event.code==='KeyP'&&!event.repeat){document.body.classList.toggle('photo-hidden');event.preventDefault();return;}
    if(event.code==='Escape'){document.body.classList.remove('photo-hidden');releaseKeys();return;}
    if(!started)return;
    if(event.code==='KeyF'&&!event.repeat){event.preventDefault();talk();return;}
    if(event.code==='KeyC'&&!event.repeat){orbitYaw=0;return;}
    if(event.code==='KeyR'&&!event.repeat){reset();return;}
    if(['KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE','ShiftLeft','ShiftRight','Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.code)){event.preventDefault();if(event.code!=='Space'||!event.repeat)keys.add(event.code);}
  });
  window.addEventListener('keyup',event=>keys.delete(event.code));window.addEventListener('blur',()=>{releaseKeys();dragging=false;audioContext?.suspend();});window.addEventListener('focus',()=>{if(soundOn)audioContext?.resume();});
  document.addEventListener('visibilitychange',()=>{releaseKeys();if(document.hidden)audioContext?.suspend();else if(soundOn)audioContext?.resume();});
  document.querySelectorAll('[data-key]').forEach(button=>{button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);keys.add(button.dataset.key);});for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,()=>keys.delete(button.dataset.key));});
  window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
}

function openDialog(id){if(document.pointerLockElement)document.exitPointerLock();releaseKeys();$(id).showModal();}
$('#settings-button').onclick=()=>openDialog('#settings');$('#help-button').onclick=()=>openDialog('#help');
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>b.closest('dialog').close());
document.querySelectorAll('dialog').forEach(d=>{d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}});d.addEventListener('close',()=>renderer?.domElement.focus());});
$('#time-toggle').onclick=()=>setNight(!night);document.querySelectorAll('[data-time]').forEach(b=>b.onclick=()=>setNight(b.dataset.time==='night'));
document.querySelectorAll('[data-quality]').forEach(b=>b.onclick=()=>setQuality(b.dataset.quality));
$('#bob-toggle').onclick=()=>{bob=!bob;setBob();savePrefs();};$('#reset').onclick=()=>{reset();$('#settings').close();};
$('#save-spot').onclick=()=>{const saved=storage.set('spot',{x:player.x,z:player.z,yaw:player.yaw,pitch:player.pitch});toast(saved?'Your spot is saved. We’ll bring you back here.':'Your browser could not save this spot.');$('#settings').close();};
$('#photo-exit').onclick=()=>document.body.classList.remove('photo-hidden');
document.querySelectorAll('[data-destination]').forEach(b=>b.onclick=()=>{selected=selected===b.dataset.destination?null:b.dataset.destination;updateDiscoveries();$('#journey-hint').textContent=selected?'Marker set. The dotted line points toward your destination.':'Choose a place to mark it on your map.';});
$('#photo').onclick=()=>{
  if(!renderer)return;renderer.render(scene,camera);
  renderer.domElement.toBlob(blob=>{if(!blob){toast('Photo couldn’t be saved. Please try again.');return;}const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`${isChai?'chai-district':isMumbai?'mumbai':'porto-sol'}-${night?'blue-hour':'golden-hour'}.png`;link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);toast(`A little piece of ${worldName}, saved.`);},'image/png');
};
$('#sound-toggle').onclick=async()=>{
  try{
    if(!audioContext){audioContext=new AudioContext();const length=audioContext.sampleRate*4,buffer=audioContext.createBuffer(1,length,audioContext.sampleRate),data=buffer.getChannelData(0);let last=0;for(let i=0;i<length;i++){last=(last+Math.random()*.035-.0175)*.99;data[i]=last*4;}
      const noise=audioContext.createBufferSource();noise.buffer=buffer;noise.loop=true;const filter=audioContext.createBiquadFilter();filter.type='lowpass';filter.frequency.value=850;audioGain=audioContext.createGain();audioGain.gain.value=0;
      const lfo=audioContext.createOscillator();lfo.frequency.value=.11;const depth=audioContext.createGain();depth.gain.value=.018;lfo.connect(depth);depth.connect(audioGain.gain);lfo.start();noise.connect(filter);filter.connect(audioGain);audioGain.connect(audioContext.destination);noise.start();}
    soundOn=!soundOn;await audioContext.resume();audioGain.gain.setTargetAtTime(soundOn?.075:0,audioContext.currentTime,.5);if(!soundOn)setTimeout(()=>{if(!soundOn)audioContext.suspend();},900);
    $('#sound-toggle').innerHTML=icon(soundOn?'volume':'muted');$('#sound-toggle').setAttribute('aria-pressed',String(soundOn));$('#sound-toggle').setAttribute('aria-label',soundOn?'Mute ocean ambience':'Enable ocean ambience');
  }catch{toast('Audio is unavailable in this browser.');}
};

try{initialize();}catch(error){console.error(error);document.querySelector('#app').innerHTML=`<main class="fatal"><div><span class="eyebrow">A small detour</span><h1>The world couldn’t open.</h1><p>This experience needs WebGL 2. Try a recent Chrome, Edge, Firefox, or Safari with hardware acceleration enabled.</p><button class="enter" id="retry">Try again ${icon('arrow')}</button></div></main>`;$('#retry').onclick=()=>location.reload();}
