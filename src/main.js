import {createSpectatorCamera} from './spectator-camera.js';
import {mountResidentView} from './resident-view.js';
import {lifeStep} from './settling-story.js';
import {mountSettlingStory} from './settling-ui.js';
import {createWelcome,meetGuide,stepWelcome,welcomeAction,welcomeCopy} from './welcome.js';
import { PORTO_ROADS } from './porto-expansion.js';
import {movementInput} from './movement-input.js';
import {Skyway,SKYWAY_GATE,SKYWAY_ENTRY_BLOCK,keepOutsideRamp,createRide,rideInput,stepRide,rideRegion,rideDifficulty,CHECKPOINT_METERS} from './skyway.js';
import {GOALS,createAdventure,advanceAdventure,adventureUpgrades} from './adventure.js';
import {createArrival,stepArrival,steerArrival,dropArrival,JOURNEY_SECONDS} from './arrival.js';
import {canOccupy,BIKE_SHOP,CHALLENGE_BIKE,collectBicycle} from './movement.js';
import {createShopBicycles} from './cycle-shop.js';
import * as THREE from 'three';
import { World } from './world.js';
import { ATTACK_KEYS } from './rider-combat.js';
import { MumbaiWorld } from './mumbai-world.js';
import { ChaiWorld } from './chai-world.js';
import { CHAI_SPAWN,CHAI_LANDMARKS,CHAI_ROADS,createChai,chaiTarget,canServe,serveChai,stepChai } from './chai.js';
import { MUMBAI_SPAWN, MUMBAI_LANDMARKS, MUMBAI_ROADS } from './mumbai-layout.js';
import { SPAWN as PORTO_SPAWN, LANDMARKS as PORTO_LANDMARKS, PORTO_BOUNDS, shorelineX, URBAN_BOUNDS, createPlayer as createPortoPlayer, stepPlayer, toggleTravelMode, validateSavedPosition } from './movement.js';
import './style.css';
import { normalizeLook } from './explorer.js';
import { mapProjection,panMap,zoomMap } from './map-view.js';
import { restoreQuest, activeStop, canInteract, advanceQuest } from './quest.js';

const residentSession=window.portoResident||null;
let residentView,spectatorCamera;
const isMumbai=new URLSearchParams(location.search).get('world')==='mumbai';
const isChai=new URLSearchParams(location.search).get('world')==='chai';
const isUrban=isMumbai||isChai;
const worldName=isChai?'Chai District':isMumbai?'Mumbai':'Porto Sol';
const SPAWN=isChai?CHAI_SPAWN:isMumbai?MUMBAI_SPAWN:PORTO_SPAWN;
const LANDMARKS=isChai?CHAI_LANDMARKS:isMumbai?MUMBAI_LANDMARKS:PORTO_LANDMARKS;
const createPlayer=()=>({...createPortoPlayer(),...SPAWN,...(!isUrban?{mode:'walking',bike:null}:{})});
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
      <button class="icon-button" id="settings-button" aria-label="Open settings" title="Settings">${icon('settings')}</button></div>
    </header>
    <aside id="pickup-hud" class="pickup-hud" hidden aria-label="Road pickups"><div><strong id="coin-count">0 coins</strong><span id="shield-status">No shield</span></div><label for="nitro-meter">Nitro <span id="nitro-label">0%</span></label><progress id="nitro-meter" max="100" value="0"></progress><div><span>Hold B to boost</span><button id="buy-nitro">10 coins → +50%</button></div></aside>
    <div class="place-label"><i class="dot"></i><span>${worldName}</span><span> / &nbsp; ${isChai?'THE CHAI RUN':isMumbai?'Mukund Nagar lanes':'The southern coast'}</span></div>
    <section class="intro" id="intro"><div class="eyebrow"><span class="rule"></span>A place to just be</div><h1>${isChai?'Every drop<br><em>counts.</em>':'Take the<br><em>scenic route.</em>'}</h1><p>${isChai?'Hot chai. Busy streets. A delicate delivery.<br>Ride gently. Bring the neighborhood its tea.':isMumbai?'Start by the church. Follow the shade.<br>A little corner of Mumbai, yours to ride.':'Salt in the air. Sun on the pavement.<br>A little coastal world, yours to ride.'}</p>
      <button class="enter" id="enter" disabled><span>Preparing your world</span>${icon('arrow')}</button>
      <div class="loading-line" id="loading-line"><div id="progress"></div></div><div class="loading-status" id="loading-status">Unpacking the neighborhood…</div>
      <div class="intro-note">A parcel. A faded postcard. Someone waiting at the pier.</div>
    </section>
    <aside class="character-tools" aria-label="Character controls">
      <button class="text-button" id="wardrobe-toggle" aria-expanded="false" aria-controls="wardrobe-panel">♧ &nbsp; Wardrobe</button>
      <button class="text-button" id="travel-toggle">Get off bicycle · X</button>
      <section id="wardrobe-panel" hidden aria-label="Wardrobe">
        <div class="wardrobe-title"><div><small>YOUR CHARACTER</small><h2>Coastal essentials</h2></div><button id="wardrobe-close" class="icon-button" aria-label="Close wardrobe">${icon('close')}</button></div>
        <p>Make the neighborhood your own.</p>
        <fieldset><legend>Outfit color</legend><div class="outfit-colors">${[['original','Linen','#e2d8c2'],['ocean','Ocean','#79afd1'],['terracotta','Clay','#d79976'],['sage','Sage','#9ab889'],['midnight','Midnight','#66748b']].map(([value,label,color])=>`<button type="button" data-outfit="${value}" aria-label="${label} outfit" title="${label}" style="--swatch:${color}"></button>`).join('')}</div></fieldset>
        <fieldset><legend>Accessories</legend><label><input type="checkbox" data-gear="helmet"> Cycling helmet</label><label><input type="checkbox" data-gear="backpack"> Canvas backpack</label><label><input type="checkbox" data-gear="sunglasses"> Sunglasses</label></fieldset>
        <small class="wardrobe-note">Saved on this browser · Changes appear instantly</small>
      </section>
    </aside>
    <section class="journey" aria-label="Places to discover"><div class="journey-head"><span>Around the neighborhood</span><strong id="discovered-count">0 / ${LANDMARKS.length}</strong></div>
      ${LANDMARKS.map(l=>`<button class="destination" data-destination="${l.id}"><span class="destination-number">${l.number}</span><span>${l.name}</span><span class="distance" id="distance-${l.id}"></span></button>`).join('')}
      <p class="journey-hint" id="journey-hint">Choose a place to mark it on your map.</p>
    </section>
    <section class="quest-card" aria-label="Adventure tracker"><div class="quest-eyebrow">THE LAST LIGHT · CHAPTER 01 <span id="quest-count"></span></div><h2 id="quest-title"></h2><p id="quest-objective"></p><small id="quest-item"></small><button id="quest-track" class="text-button">Show destination</button></section>
    <button id="quest-interact" class="quest-interact" hidden></button>
    <aside class="map-card" aria-label="Neighborhood map"><div class="map-header"><span>YOUR LITTLE CORNER</span><button id="map-expand" aria-label="Expand map" title="Open big map (M)">Expand ↗</button></div><div class="map-frame"><canvas id="map" width="356" height="344" tabindex="0" aria-label="Neighborhood map. Drag to pan, scroll to zoom. Plus and minus zoom; zero resets."></canvas><div class="map-north"><span>↑</span>N</div></div><div class="map-controls" aria-label="Map zoom controls"><button id="map-out" aria-label="Zoom map out" title="Zoom out (−)">−</button><output id="map-zoom" aria-label="Map zoom level">1×</output><button id="map-in" aria-label="Zoom map in" title="Zoom in (+)">+</button><button id="map-follow" aria-label="Follow my cyclist" title="Center on your cyclist">Follow</button><button id="map-reset" aria-label="Reset map zoom" title="Show whole neighborhood (0)">Reset</button></div><p class="map-help">Drag to explore · Scroll to zoom · M / Esc to close</p><div class="map-footer"><span class="live"><i></i><span id="zone">Seafront promenade</span></span><span class="performance" id="performance"></span></div></aside>
    <div class="crosshair"></div><div class="look-hint">Click the scene to look around · Esc releases your cursor</div>
    <div class="toast" id="toast" role="status" aria-live="polite"></div>
    <div class="discovery" id="discovery"><small>A little discovery</small><h2 id="discovery-name"></h2><p id="discovery-description"></p></div>
    <footer class="bottom-bar"><div class="world-tag">An open-world sketch <span>v0.1</span></div><div class="controls"><div class="control"><kbd>W / S</kbd><span>Pedal / reverse</span></div><div class="control"><kbd>A / D</kbd><span>Steer</span></div><div class="control"><kbd>⇧</kbd><span>Hold to run / pedal faster</span></div><div class="control"><kbd>Space</kbd><span>Jump / bike brake</span></div><div class="control"><kbd>J / L</kbd><span>Kick</span></div><div class="control"><kbd>U / O</kbd><span>Punch</span></div><div class="control"><kbd>Mouse</kbd><span>Orbit</span></div><div class="control"><kbd>P</kbd><span>Hide UI</span></div><div class="control"><button class="icon-button" id="help-button" aria-label="Cycling controls" style="width:26px;height:26px">${icon('help')}</button></div></div><div class="bottom-note">BUILT FOR RIDING</div></footer>
    <div class="touch-controls"><div class="dpad"><button data-key="KeyW" aria-label="Pedal forward">↑</button><button data-key="KeyA" aria-label="Steer left">←</button><button data-key="KeyS" aria-label="Reverse">↓</button><button data-key="KeyD" aria-label="Steer right">→</button></div><div class="touch-actions"><button data-attack="kick,1" aria-label="Kick left">Kick ←</button><button data-attack="kick,-1" aria-label="Kick right">Kick →</button><button data-attack="punch,1" aria-label="Punch left">Punch ←</button><button data-attack="punch,-1" aria-label="Punch right">Punch →</button><button data-key="KeyB" aria-label="Use nitro boost">Nitro</button><button data-key="ShiftLeft" aria-label="Hold to run or pedal faster">Run</button><button data-key="Space" aria-label="Jump or bicycle brake">Jump / Brake</button></div></div>
  </div>
  <button class="photo-exit" id="photo-exit">Show interface · P</button>
  <dialog id="map-dialog" aria-label="Expanded neighborhood map"></dialog>
  <dialog id="quest-dialog" aria-labelledby="quest-speaker"><div class="dialog-title"><h2 id="quest-speaker"></h2><button class="icon-button" data-close aria-label="Close conversation">${icon('close')}</button></div><div class="quest-postcard">PORTO SOL / A DELIVERY TO REMEMBER</div><p id="quest-dialogue"></p><button class="enter" id="quest-confirm"></button><p class="quest-later">Close to return later. Your parcel and progress are saved.</p></dialog>
  <dialog id="settings"><div class="dialog-title"><h2>Make yourself at home.</h2><button class="icon-button" data-close aria-label="Close settings">${icon('close')}</button></div>
    <div class="settings-row"><div>Time of day<small>A different kind of atmosphere.</small></div><div class="segmented"><button data-time="day" class="active">Golden</button><button data-time="night">Blue hour</button></div></div>
    <div class="settings-row"><div>Graphics<small>Lower detail, a lighter footprint.</small></div><div class="segmented"><button data-quality="balanced">Balanced</button><button data-quality="high" class="active">High</button></div></div>
    <div class="settings-row"><div>Camera smoothing<small>A smooth camera following your bicycle.</small></div><button class="text-button" id="bob-toggle" aria-pressed="true">On</button></div>
    <div class="settings-row"><div>Your favorite spot<small>Saved only on this browser.</small></div><button class="text-button" id="save-spot">Save spot</button></div>
    <div class="settings-row"><div>Back to the waterfront</div><button class="text-button" id="reset">Return to start</button></div>
    <h3>About this little world</h3><p>Ride or get off your bicycle with X to explore Porto Sol on foot. Open Wardrobe on the left to change your outfit and accessories. Explore the café, pier, and garden. Buildings are exterior scenery.</p>
    <p class="credits">Scanned stone, plaster &amp; timber surfaces bundled locally.<br>Scenery textures & tree: <a href="https://polyhaven.com/license" target="_blank" rel="noopener">Poly Haven · CC0</a><br>Animated pedestrians: <a href="https://github.com/microsoft/Microsoft-Rocketbox" target="_blank" rel="noopener">Microsoft Rocketbox · MIT</a></p>
  </dialog>
  <dialog id="help"><div class="dialog-title"><h2>A little room to roam.</h2><button class="icon-button" data-close aria-label="Close controls">${icon('close')}</button></div><div class="keys">
    <div class="key-row"><span>Use collected nitro while pedaling</span><kbd>Hold B</kbd></div><div class="key-row"><span>Kick left / right (Porto Sol)</span><kbd>J / L</kbd></div><div class="key-row"><span>Punch left / right (Porto Sol)</span><kbd>U / O</kbd></div><div class="key-row"><span>Get off / on bicycle (Porto Sol)</span><kbd>X</kbd></div><div class="key-row"><span>Wardrobe (Porto Sol)</span><kbd>V</kbd></div><div class="key-row"><span>Pedal / walk / reverse</span><kbd>W S / ↑ ↓</kbd></div><div class="key-row"><span>Orbit camera</span><kbd>Mouse / drag</kbd></div><div class="key-row"><span>Steer</span><kbd>A D / Q E / ← →</kbd></div><div class="key-row"><span>Hold to run / pedal faster</span><kbd>Shift</kbd></div><div class="key-row"><span>Jump / bike brake</span><kbd>Space</kbd></div><div class="key-row"><span>Release cursor</span><kbd>Esc</kbd></div><div class="key-row"><span>Hide interface</span><kbd>P</kbd></div><div class="key-row"><span>Return to start</span><kbd>R</kbd></div><div class="key-row"><span>Talk / inspect nearby clue</span><kbd>F</kbd></div><div class="key-row"><span>Center camera behind bike</span><kbd>C</kbd></div><div class="key-row"><span>Expand / close map</span><kbd>M</kbd></div><div class="key-row"><span>Map zoom / reset</span><kbd>+ − / 0</kbd></div>
    </div><p>On a touch screen, use the arrows to pedal and steer, and drag to orbit the camera. Ride near a landmark to discover it.</p></dialog>`;

const $ = s => document.querySelector(s);
$('#world-select').value=isChai?'chai':isMumbai?'mumbai':'porto';
$('#world-select').onchange=event=>{const url=new URL(location.href);url.search='';url.searchParams.set('world',event.target.value);location.href=url.href;};
if(isMumbai){
  $('.quest-card').hidden=true;$('#sound-toggle').hidden=true;
  $('#viewport').setAttribute('aria-label','Mumbai lanes 3D world');
  $('.intro-note').textContent='Inspired by your photographs · Free ride';
  $('.temp').textContent='29°';
  $('#reset').parentElement.firstElementChild.textContent='Back to the church';
  $('#settings h3 + p').textContent='Ride from the Church of God headquarters through shaded Mumbai lanes. An original interpretation of the supplied photographs; surrounding streets are not a surveyed map. Mumbai is a solo free ride.';
}
if(isChai){
  document.body.classList.add('chai-world');
  $('#sound-toggle').hidden=true;
  $('#viewport').setAttribute('aria-label','Chai District 3D world');
  $('.temp').textContent='28°';
  $('.quest-eyebrow').innerHTML='THE CHAI RUN <span id="quest-count"></span>';
  $('.quest-card').insertAdjacentHTML('beforeend','<div class="chai-dashboard"><div class="chai-glass"><div id="chai-liquid"></div><span>चाय</span></div><div class="chai-readings"><strong id="chai-volume">100% full</strong><span id="chai-heat">92°C · Freshly brewed</span><span id="chai-warning">Brake early. Take wide turns.</span></div></div><button id="chai-retry" class="text-button">Restart at the stall</button>');
  $('#reset').parentElement.firstElementChild.textContent='Back to the chai stall';
  $('#settings h3 + p').textContent='An original neighborhood built for chai deliveries. Collect a fresh cup at Asha’s stall, then stop at the gold marker to serve it. Sharp turns, hard braking, collisions, and potholes spill tea. Traffic yields, but give people and animals room. Solo play; R restarts your delivery.';
}
const viewport = $('#viewport');
document.body.classList.add('clean-hud');
$('#ui').insertAdjacentHTML('beforeend','<button id="game-menu-button" class="icon-button" aria-label="Open game menu" aria-controls="game-menu" aria-haspopup="dialog">☰</button>');
$('#app').insertAdjacentHTML('beforeend','<dialog id="game-menu" aria-labelledby="game-menu-title"><div class="dialog-title"><h2 id="game-menu-title">Your island</h2><button class="icon-button" data-close aria-label="Close game menu">×</button></div><div id="game-menu-content"></div></dialog>');
for(const selector of ['.top-actions','.character-tools','.quest-card','.journey','#pickup-hud','.bottom-bar'])$('#game-menu-content').append($(selector));
$('#game-menu-button').onclick=()=>openDialog('#game-menu');
$('.character-tools').hidden=isUrban;
const player = createPlayer();
let started=false, ready=false, selected=null, elapsed=0, night=false, bob=!matchMedia('(prefers-reduced-motion: reduce)').matches, soundOn=false, quality=matchMedia('(pointer: coarse)').matches?'balanced':'high';
const arrival=isUrban?null:(residentSession?.arrival||createArrival(PORTO_SPAWN));
if(residentSession)Object.assign(player,residentSession.player);
const airborne=()=>!!arrival&&arrival.phase!=='landed';
document.body.classList.toggle('arriving',airborne());
document.querySelector('#app').insertAdjacentHTML('beforeend','<section id="arrival-ui"><small>WELCOME TO PORTO SOL</small><h2 id="arrival-title">Your island is on the horizon.</h2><p id="arrival-detail">Preparing your balloon…</p><button id="arrival-drop" class="enter" hidden>Drop to island · Parachute ↓</button></section>');
$('#arrival-drop').onclick=()=>{if(dropArrival(arrival,player,(x,z)=>canOccupy(x,z,world.obstacles))){releaseKeys();}else toast('No clear landing here yet. Keep flying to the next area.');};
let orbitYaw=0;
const mapView={zoom:1,center:null,bounds:isUrban?null:{...PORTO_BOUNDS,maxX:117}};
let mapExpanded=false;
const cameraRay=new THREE.Raycaster(), cameraAim=new THREE.Vector3(), cameraDesired=new THREE.Vector3();
let renderer, scene, camera, world, audioContext, audioGain, toastTimer, discoveryTimer;
const keys=new Set(), discovered=new Set();
const storage={get(key){try{return JSON.parse(localStorage.getItem(`elsewhere:${isChai?'chai:':isMumbai?'mumbai:':''}${key}`));}catch{return null;}},set(key,value){try{localStorage.setItem(`elsewhere:${isChai?'chai:':isMumbai?'mumbai:':''}${key}`,JSON.stringify(value));return true;}catch{return false;}}};
const welcome=residentSession?.welcome||createWelcome(storage.get('first-home'));
if(residentSession)residentView=mountResidentView({initial:residentSession,player,arrival,welcome,getWorld:()=>world,onLocate:()=>spectatorCamera?.locate(true)});
const lifeStory=isUrban?null:mountSettlingStory({storage,getPlayer:()=>player,getWorld:()=>world,releaseKeys,onChange:state=>{if(state.stage===9)setNight(true);if(state.complete)setNight(false);}});
$('#app').insertAdjacentHTML('beforeend','<section id="welcome-card" hidden aria-label="Your first day"><small>YOUR FIRST DAY</small><h2 id="welcome-title"></h2><p id="welcome-body"></p><button id="welcome-action" type="button"></button></section>');
$('#welcome-action').onclick=()=>talk();
function updateWelcome(dt){
  if(isUrban||!world||residentSession)return;
  const active=started&&!airborne()&&!skyRide;
  document.body.classList.toggle('welcoming',welcome.phase!=='settled'||!lifeStory?.state.complete);
  lifeStory?.update(active&&welcome.phase==='settled');
  if(welcome.phase!=='settled'||!lifeStory?.state.complete)world.questStage=-1;
  if(active){meetGuide(welcome,player,world.obstacles);stepWelcome(welcome,player,modalOpen()?0:dt);}
  world.welcomeWorld?.update(welcome,player,active,dt,world.cyclist,world.obstacles);
  $('#welcome-card').hidden=!active||modalOpen()||welcome.phase==='settled';
  const copy=welcomeCopy(welcome,player);
  $('#welcome-title').textContent=copy.title;$('#welcome-body').textContent=copy.body;$('#welcome-action').textContent=copy.action;
  $('#welcome-action').disabled=welcome.phase==='leading'||!welcome.guide||Math.hypot(player.x-welcome.guide.x,player.z-welcome.guide.z)>4;
}

let characterLook=normalizeLook(storage.get('character'));
let quest=restoreQuest(storage.get('quest'));
let chai=createChai();
let chaiBest=Number(storage.get('best'))||0;
let dialogueStop=null;
player.arrival=arrival;
let skyway,skyRide=null,skyReturn=null,skyBest=Number(storage.get('skyway-best'))||0;
let challengeBicycle;
const adventure=createAdventure(storage.get('adventure'));
function progressAdventure(metrics){
  const before=JSON.stringify(adventure),fresh=advanceAdventure(adventure,metrics);
  if(JSON.stringify(adventure)!==before)storage.set('adventure',adventure);
  if(fresh.length)toast(`Unlocked: ${fresh.map(g=>g.reward).join(' · ')}`);
  if(world?.cyclist?.cycle&&(adventure.unlocked.includes('local')||adventure.unlocked.includes('summit'))){
    const color=adventure.unlocked.includes('summit')?0xe2b44f:0x9959cf;
    world.cyclist.cycle.paintColor=color;world.cyclist.cycle.frameMaterial.color.set(color);
  }
}
function bankSkyway(){if(skyRide)progressAdventure({distance:skyRide.distance});}
const nearChallengeBike=()=>challengeBicycle?.visible&&!skyRide&&!airborne()&&Math.hypot(player.x-CHALLENGE_BIKE.x,player.z-CHALLENGE_BIKE.z)<=CHALLENGE_BIKE.radius;
const skyHUD=document.createElement('section');skyHUD.id='skyway-hud';skyHUD.hidden=true;
const collectionHUD=document.createElement('section');collectionHUD.id='collection-hud';collectionHUD.hidden=true;collectionHUD.setAttribute('aria-label','Items collected this outing');
collectionHUD.innerHTML='<div class="collection-title">COLLECTED <small>THIS OUTING</small></div><div class="collection-items">'+[['coin','●','Coins'],['nitro','ϟ','Nitro'],['shield','◆','Shields'],['mystery','?','Mysteries']].map(([type,icon,label])=>`<div class="collection-item ${type}" title="${label} collected"><span class="collection-icon" aria-hidden="true">${icon}</span><span><b id="collected-${type}">0</b><small>${label}</small></span></div>`).join('')+'</div><div id="collection-wallet"></div>';
document.querySelector('#ui').append(collectionHUD);
collectionHUD.insertAdjacentHTML('beforeend','<details id="adventure-goals"><summary id="adventure-next">Island adventure</summary><div id="adventure-list"></div><button id="adventure-track">Find an undiscovered place ↗</button></details>');
$('#adventure-track').onclick=()=>{const next=LANDMARKS.find(l=>!discovered.has(l.id));if(next){selected=next.id;updateDiscoveries();toast(`${next.name} marked on your map.`);}else toast('Every city destination discovered!');};
skyHUD.innerHTML='<strong>SKYWAY RIDE</strong><p id="skyway-score"></p><div id="skyway-rewards"></div><small class="skyway-help">A/D lanes · Space jump · S brake · Esc exit</small><div id="skyway-actions"><button id="skyway-start">Start ride</button><button data-sky-key="KeyA" aria-label="Move to left lane">←</button><button data-sky-key="Space">Jump</button><button data-sky-key="KeyD" aria-label="Move to right lane">→</button><button id="skyway-exit">Exit</button></div>';
document.querySelector('#app').append(skyHUD);
const checkpointBanner=document.createElement('aside');checkpointBanner.id='checkpoint-victory';checkpointBanner.hidden=true;checkpointBanner.setAttribute('role','status');checkpointBanner.setAttribute('aria-live','polite');
checkpointBanner.innerHTML='<span class="checkpoint-medal" aria-hidden="true">★</span><div><small>CHECKPOINT CLEARED</small><strong id="checkpoint-victory-title"></strong><span id="checkpoint-victory-detail"></span></div>';
document.querySelector('#app').append(checkpointBanner);
let checkpointBannerTimer;
function hideCheckpointVictory(){clearTimeout(checkpointBannerTimer);checkpointBanner.hidden=true;}
function showCheckpointVictory(ride){
  const difficulty=rideDifficulty(ride.checkpoint);
  $('#checkpoint-victory-title').textContent=`Checkpoint ${ride.checkpoint} · Victory!`;
  $('#checkpoint-victory-detail').textContent=`+${500*ride.bonusMultiplier} points · +1 heart (up to ${ride.maxLives}) · Shield\nLevel ${difficulty.tier+1} · Cruise ${Math.round(difficulty.speed*3.6)} km/h${difficulty.tier===7?' · Maximum difficulty':''}`;
  clearTimeout(checkpointBannerTimer);checkpointBanner.hidden=false;
  checkpointBannerTimer=setTimeout(hideCheckpointVictory,3200);
}
function beginSkyway(){
  if(!skyway||airborne()||modalOpen())return;
  if(!skyRide&&Math.hypot(player.x-SKYWAY_GATE.x,player.z-SKYWAY_GATE.z)>SKYWAY_GATE.radius)return;
  if(!skyRide)skyReturn={...player};
  hideCheckpointVictory();bankSkyway();skyRide=createRide(Math.random,adventureUpgrades(adventure));releaseKeys();player.mode='cycling';player.bike=null;orbitYaw=0;player.pitch=.25;
  toast('Skyway Ride · Auto-pedal · A/D switch lanes · Space jump · Shield absorbs one hit');
}
function exitSkyway(){if(!skyRide)return;hideCheckpointVictory();bankSkyway();skyBest=Math.max(skyBest,skyRide.score);storage.set('skyway-best',skyBest);skyRide=null;Object.assign(player,skyReturn);skyReturn=null;world.cyclist.group.position.y=0;skyway.update(null,0);releaseKeys();refreshTravel();}
$('#skyway-start').onclick=beginSkyway;$('#skyway-exit').onclick=exitSkyway;
skyHUD.querySelectorAll('[data-sky-key]').forEach(b=>b.onclick=()=>{if(skyRide)rideInput(skyRide,b.dataset.skyKey);});
const savedDiscoveries=storage.get('discoveries');
if(Array.isArray(savedDiscoveries))savedDiscoveries.filter(id=>LANDMARKS.some(l=>l.id===id)).forEach(id=>discovered.add(id));
const prefs=storage.get('preferences');if(prefs){night=prefs.night===true;quality=prefs.quality==='balanced'?'balanced':'high';bob=typeof prefs.bob==='boolean'?prefs.bob:bob;}
function refreshEntry(){
  if(!ready)return;
  $('#enter').disabled=false;
  $('#enter span').textContent='Observe your resident';
  $('.intro-note').textContent='One resident. One persistent life in Porto Sol.';
}
function refreshTravel(){
  $('#travel-toggle').textContent=player.mode==='walking'?(player.bike?`Get on bicycle · ${Math.round(Math.hypot(player.x-player.bike.x,player.z-player.bike.z))}m · X`:`Find cycle shop · ${Math.round(Math.hypot(player.x-BIKE_SHOP.x,player.z-BIKE_SHOP.z))}m`):'Get off bicycle · X';
}
function changeTravel(){if(residentSession)return;
  if(airborne())return;
  if($('#game-menu').open)$('#game-menu').close();
  if(!isUrban&&player.mode==='walking'&&!player.bike){selected='bikes';updateDiscoveries();toast('Cycle shop marked on your map · Press F at its entrance.');return;}
  if(!started||modalOpen()||!world?.cyclist)return;
  const error=toggleTravelMode(player,world.obstacles);
  if(error){toast(error);return;}
  releaseKeys();refreshTravel();
  toast(player.mode==='walking'?'On foot · W / S to walk, A / D to turn. X near your bike to ride.':'Back in the saddle.');
}
function toggleWardrobe(force){
  const open=force??$('#wardrobe-panel').hidden;
  $('#wardrobe-panel').hidden=!open;$('#wardrobe-toggle').setAttribute('aria-expanded',String(open));
  $('#ui').classList.toggle('wardrobe-open',open);
  if(open){if(document.pointerLockElement)document.exitPointerLock();releaseKeys();}
  if(open&&!$('#game-menu').open)openDialog('#game-menu');
}
function updateWardrobe(){
  document.querySelectorAll('[data-outfit]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.outfit===characterLook.outfit)));
  document.querySelectorAll('[data-gear]').forEach(input=>input.checked=characterLook[input.dataset.gear]);
  world?.cyclist?.applyLook?.(characterLook);
  if(world?.cyclist?.look)characterLook=world.cyclist.look;
}
$('#wardrobe-toggle').onclick=()=>toggleWardrobe();
$('#wardrobe-close').onclick=()=>toggleWardrobe(false);
$('#travel-toggle').onclick=changeTravel;
for(const button of document.querySelectorAll('[data-outfit]'))button.onclick=()=>{characterLook={...characterLook,outfit:button.dataset.outfit};storage.set('character',characterLook);updateWardrobe();};
for(const input of document.querySelectorAll('[data-gear]'))input.onchange=()=>{characterLook={...characterLook,[input.dataset.gear]:input.checked};storage.set('character',characterLook);updateWardrobe();};
updateWardrobe();
function startRide(){
  if(!ready)return;
  started=true;$('#intro').classList.add('hidden');$('#intro').inert=true;$('#ui').classList.add('playing','unlocked');renderer.domElement.focus();
}
function savePrefs(){storage.set('preferences',{night,quality,bob});}
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3500);}
function strike(type,side){
  if(airborne())return;
  if(!started||modalOpen())return;
  if(!world?.combat){toast('Rider combat is available on the Porto Sol promenade.');return;}
  if(player.mode==='walking'||Math.abs(player.speed)<.65){toast('Start riding to kick or punch.');return;}
  world.combat.start(type,side,player);
}
$('#buy-nitro').onclick=()=>{if(started&&!modalOpen()&&world?.pickups?.buyNitro()){toast('Nitro +50% · Hold B while pedaling');pickupSound();updateHUD();}};
function pickupSound(){
  if(!soundOn||!audioContext||audioContext.state!=='running')return;
  const tone=audioContext.createOscillator(),gain=audioContext.createGain(),t=audioContext.currentTime;
  tone.frequency.setValueAtTime(660,t);tone.frequency.exponentialRampToValueAtTime(1100,t+.1);
  gain.gain.setValueAtTime(.045,t);gain.gain.exponentialRampToValueAtTime(.001,t+.18);
  tone.connect(gain);gain.connect(audioContext.destination);tone.start(t);tone.stop(t+.2);
}
function releaseKeys(){keys.clear();player.vx=player.vz=player.speed=0;}
function modalOpen(){return !!document.querySelector('dialog[open]');}
function updateDiscoveries(){
  $('#discovered-count').textContent=`${discovered.size} / ${LANDMARKS.length}`;
  document.querySelectorAll('.destination').forEach(button=>{const id=button.dataset.destination;button.classList.toggle('visited',discovered.has(id));button.classList.toggle('active',id===selected);button.setAttribute('aria-pressed',String(id===selected));button.querySelector('.destination-number').textContent=discovered.has(id)?'✓':LANDMARKS.find(l=>l.id===id).number;});
}
function reset(){if(residentSession){toast('Your resident’s life is persistent. Reloading will keep their progress.');return;}world?.pickups?.reset();world?.combat?.reset();player.attack=null;Object.assign(player,createPlayer());refreshTravel();if(isChai){chai=createChai();if(world)world.delivery=chai;}orbitYaw=0;releaseKeys();toast(isChai?'Fresh start at Asha’s chai stall.':isMumbai?'Back outside the church.':'Back where the sea meets the street.');}
function setNight(value){night=value;world?.setNight(night);$('#time-label').textContent=night?'Blue hour':'Golden hour';$('#time-toggle').querySelector('svg').outerHTML=icon(night?'moon':'sun');$('#time-toggle').setAttribute('aria-label',night?'Switch to golden hour':'Switch to blue hour');document.querySelectorAll('[data-time]').forEach(b=>b.classList.toggle('active',(b.dataset.time==='night')===night));savePrefs();}
function setQuality(value){quality=value;if(renderer){renderer.setPixelRatio(Math.min(devicePixelRatio,quality==='high'?1.5:1));renderer.shadowMap.enabled=true;renderer.shadowMap.needsUpdate=true;renderer.setSize(innerWidth,innerHeight);}document.querySelectorAll('[data-quality]').forEach(b=>b.classList.toggle('active',b.dataset.quality===quality));savePrefs();}
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
  const nearby=started&&!modalOpen()&&canInteract(quest,player)&&!!lifeStory?.state.complete;
  $('#quest-interact').hidden=!nearby;
  $('#quest-interact').textContent=stop?`F · ${stop.action}`:'';
  if(started&&!airborne()&&!modalOpen()&&player.mode==='walking'&&!player.bike&&Math.hypot(player.x-BIKE_SHOP.x,player.z-BIKE_SHOP.z)<=BIKE_SHOP.radius){$('#quest-interact').hidden=false;$('#quest-interact').textContent='F · Collect bicycle';}
  if(world)world.questStage=quest.stage;
  if(started&&!modalOpen()&&nearChallengeBike()){$('#quest-interact').hidden=false;$('#quest-interact').textContent='F · Collect Coral bicycle';}
  if(lifeStory&&!lifeStory.state.complete){
    const personal=lifeStep(lifeStory.state);$('#quest-count').textContent=`Chapter ${personal.chapter} / 4`;
    $('#quest-title').textContent=welcome.phase==='settled'?personal.title:'A place to begin';
    $('#quest-objective').textContent=welcome.phase==='settled'?personal.place:'Meet Mara and leave your suitcase at Casa Aurora.';
    $('#quest-item').textContent=`€${lifeStory.state.money} · Open your story journal for belongings and memories`;
  }
}
function talk() {
  if(residentSession)return;
  if(airborne())return;
  if(!modalOpen()&&lifeStory?.interact())return;
  if(!isUrban&&started&&!modalOpen()&&welcome.phase!=='settled'){
    if(welcomeAction(welcome,player,world.obstacles)){
      releaseKeys();
      if(welcome.phase==='settled'){storage.set('first-home',{version:1,settled:true});toast('Your suitcase is safe. Casa Aurora is your first home. Welcome to Porto Sol.');}
      updateWelcome(0);return;
    }
  }
  if(!isUrban&&started&&!modalOpen()&&nearChallengeBike()){
    const error=collectBicycle(player,world.obstacles,CHALLENGE_BIKE);
    if(!error){challengeBicycle.visible=false;world.cyclist.cycle.paintColor=CHALLENGE_BIKE.color;world.cyclist.cycle.frameMaterial.color.set(CHALLENGE_BIKE.color);}
    toast(error||'Coral bicycle collected · Ready for the Skyway.');releaseKeys();refreshTravel();return;
  }
  if(!isUrban&&started&&!modalOpen()&&Math.hypot(player.x-SKYWAY_GATE.x,player.z-SKYWAY_GATE.z)<=SKYWAY_GATE.radius){beginSkyway();return;}
  if(!isUrban&&started&&!modalOpen()&&player.mode==='walking'&&!player.bike&&Math.hypot(player.x-BIKE_SHOP.x,player.z-BIKE_SHOP.z)<=BIKE_SHOP.radius){
    const error=collectBicycle(player,world.obstacles);toast(error||'Bicycle collected · X to get off and explore.');releaseKeys();refreshTravel();return;
  }
  if(isChai){
    if(!started||modalOpen()||!serveChai(chai,player))return;
    if(chai.phase==='delivered'){
      const best=chai.lastTip>chaiBest;if(best){chaiBest=chai.lastTip;storage.set('best',chaiBest);}
      toast(`Delivered! ${Math.round(chai.volume)}% remaining · ${Math.round(chai.heat)}°C · ${chai.lastTip} points${best?' · Personal best!':''}`);
    }else toast(`Fresh chai loaded. Deliver to ${chaiTarget(chai).name}.`);
    updateChaiHUD();return;
  }
  if(isMumbai)return;
  if(!started||modalOpen()||!canInteract(quest,player)||!lifeStory?.state.complete)return;
  dialogueStop=activeStop(quest);
  $('#quest-speaker').textContent=dialogueStop.speaker;
  $('#quest-dialogue').textContent=dialogueStop.text;
  $('#quest-confirm').textContent=dialogueStop.confirm;
  $('.quest-later').textContent='Close to return later. Your parcel and progress are saved.';
  openDialog('#quest-dialog');updateQuest();
}
$('#quest-interact').onclick=talk;
$('#quest-track').onclick=()=>{if(lifeStory&&!lifeStory.state.complete){$('#game-menu').close();lifeStory.journal();return;}const stop=isChai?chaiTarget(chai):activeStop(quest);if(!stop)return;selected=stop.id;updateDiscoveries();toast((isChai?stop.name:stop.objective)+' Follow the gold marker.');};
$('#quest-confirm').onclick=()=>{
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
  renderer.setPixelRatio(Math.min(devicePixelRatio,quality==='high'?1.5:1));renderer.setSize(innerWidth,innerHeight);
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
  // Animated characters and their shadows must use the same frame's pose.
  renderer.shadowMap.autoUpdate=true;renderer.shadowMap.needsUpdate=true;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=isUrban?.88:.94;
  renderer.domElement.setAttribute('aria-label',`Third-person cycling in ${worldName}`);renderer.domElement.tabIndex=0;viewport.appendChild(renderer.domElement);viewport.classList.toggle('storybook-world',!isUrban);
  scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(isUrban?66:59,innerWidth/innerHeight,.3,3500);camera.rotation.order='YXZ';if(residentSession)spectatorCamera=createSpectatorCamera(camera,renderer.domElement);
  const manager=new THREE.LoadingManager();let failed=0;
  manager.onProgress=(_,loaded,total)=>{$('#progress').style.width=`${loaded/total*100}%`;$('#loading-status').textContent=`Bringing ${worldName} to life · ${Math.round(loaded/total*100)}%`;};
  manager.onError=()=>{failed++;};
  const finish=()=>{if(ready)return;ready=true;$('#enter').disabled=false;$('#progress').style.width='100%';$('#loading-line').hidden=true;refreshEntry();if(!isUrban)startRide();};
  manager.onLoad=finish;
  world=isChai?new ChaiWorld(scene,renderer,manager):isMumbai?new MumbaiWorld(scene,renderer,manager):new World(scene,renderer,manager);
  if(isChai)world.delivery=chai;
  if(!isUrban){skyway=new Skyway(scene);world.obstacles.push({...SKYWAY_ENTRY_BLOCK});world.sign('SKYWAY RIDE · F TO ENTER',46,2.6,-375,4,.6);
    challengeBicycle=createShopBicycles([CHALLENGE_BIKE],CHALLENGE_BIKE.color);challengeBicycle.name='Coral bicycle pickup';scene.add(challengeBicycle);
    world.sign('CORAL BICYCLE · F TO COLLECT',40,2.1,-371,5,.65);world.bake();}
  const saved=isUrban&&!isChai?validateSavedPosition(storage.get('spot'),world.obstacles,URBAN_BOUNDS):null;if(saved)Object.assign(player,saved);
  setNight(night);setQuality(quality);setBob();updateDiscoveries();updateQuest();
  setTimeout(()=>{if(!ready){finish();$('#loading-status').textContent='You can explore while the remaining details load.';}},25000);
  let previous=performance.now(),frames=0,frameClock=0,uiClock=0;
  function frame(now){
    const dt=Math.min((now-previous)/1000,.05);previous=now;
    if(!document.hidden){
      elapsed+=dt;
      if(ready&&world.cyclist&&airborne()&&!residentSession){
        stepArrival(arrival,dt,{player,input:movementInput(keys,'cycling'),canLand:(x,z)=>canOccupy(x,z,world.obstacles)});document.body.classList.toggle('arriving',airborne());
        const canDrop=arrival.phase==='balloon'&&arrival.elapsed>=JOURNEY_SECONDS;
        steerArrival(arrival,player,{forward:Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown')),right:Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft')),orbitYaw},dt);
        $('#arrival-drop').hidden=!canDrop;
        $('#arrival-title').textContent=arrival.phase==='parachute'?'Welcome to the island.':canDrop?'Porto Sol, beneath your feet.':'Your island is on the horizon.';
        $('#arrival-detail').textContent=arrival.phase==='parachute'?'A/D steer · W glide · S flare near ground · Drag to look':canDrop?'A / D turn · W cruise · S slow · Wind carries you · Drag to look':`Drag to look around · ${Math.max(0,Math.ceil(JOURNEY_SECONDS-arrival.elapsed))}s until we reach Porto Sol`;
        if(!airborne()){player.mode='walking';player.bike=null;selected='bikes';updateDiscoveries();refreshTravel();player.pitch=Math.max(.05,Math.min(.85,player.pitch));releaseKeys();toast(welcome.phase==='settled'?'Welcome back to Porto Sol.':'Mara is here to welcome you. Meet her by the gold marker · F');}
      }
      const active=started&&!modalOpen()&&!airborne();
      if(isChai)world.updateStreet(active?dt:0,player);
      if(active&&skyRide){
        const checkpoint=skyRide.checkpoint,wasRunning=skyRide.running;
        stepRide(skyRide,dt,{brake:keys.has('KeyS')||keys.has('ArrowDown')});const p=skyway.pose(skyRide.distance,skyRide.lanePosition);
        if(skyRide.checkpoint>checkpoint){showCheckpointVictory(skyRide);bankSkyway();}
        if(wasRunning&&!skyRide.running){hideCheckpointVictory();bankSkyway();}
        Object.assign(player,p,{y:p.y+skyRide.jump,mode:'cycling',speed:skyRide.running?skyRide.speed:0,walked:skyRide.distance});
        skyway.update(skyRide,elapsed);
        if(!skyRide.running&&skyRide.score>skyBest){skyBest=skyRide.score;storage.set('skyway-best',skyBest);}
      }
      if(active&&!skyRide&&!residentSession){
        const wasSwimming=player.swimming;
        if(!isUrban)keepOutsideRamp(player);
        stepPlayer(player,{...movementInput(keys,player.mode),boost:world.pickups?.boost(dt,player,keys.has('KeyB')&&(keys.has('KeyW')||keys.has('ArrowUp')),keys.has('Space'))},dt,isChai?world.obstacles.concat(world.dynamicObstacles):world.obstacles,isUrban?URBAN_BOUNDS:PORTO_BOUNDS);
        if(player.swimming&&!wasSwimming)toast('Swimming · W/S swim · A/D turn · Shift faster · Swim toward shore to climb out.');
        if(isChai)stepChai(chai,player,dt);
        const previousCoins=world.pickups?.collected.coin??0;
        const collected=world.pickups?.update(dt,player)??[];
        if(collected.length){toast(collected.at(-1));pickupSound();}
        if(!isUrban&&world.pickups?.collected.coin>previousCoins)progressAdventure({coins:adventure.coins+world.pickups.collected.coin-previousCoins});

      }
      if(world.cyclist?.applyLook&&world.cyclist.look!==characterLook){world.cyclist.applyLook(characterLook);characterLook=world.cyclist.look;}
      if(world.updateCombat(player,active&&!skyRide&&!residentSession?dt:0))toast(`Hit! Rival staggered · ${world.combat.hits} hits`);
      if(world.combat?.incoming)toast(world.combat.incoming);
      world.pickupDisplay?.update(player);
      residentView?.update(camera);
      world.cyclist?.update(player,active?dt:0);
      const arrivalView=world.setLocalArrival(arrival,player);
      updateWelcome(active?dt:0);
      if(skyRide){world.cyclist.cycle.group.position.y=.015;world.cyclist.group.position.y=player.y;world.cyclist.cycle.group.rotateX(-player.slope);world.cyclist.cycle.group.rotateZ(-Math.max(-.16,Math.min(.16,skyRide.laneVelocity*.1)));}
      if(skyway)skyway.group.visible=!!skyRide;
      if(spectatorCamera){spectatorCamera.update(arrivalView,arrival.phase);}else{
      // Orbit around the visible rider; the bike's heading is independent of the mouse.
      const insideHome=!isUrban&&player.x>14&&player.x<23.6&&player.z>-88&&player.z<-78;
      const viewYaw=player.yaw+orbitYaw, distance=player.mode==='walking'?(insideHome?2.2:4.4):5.8;
      cameraAim.set(player.x,(player.y||0)+1.15,player.z);
      cameraDesired.set(player.x-Math.sin(viewYaw)*distance*Math.cos(player.pitch),(player.y||0)+1.15+Math.sin(player.pitch)*distance,player.z+Math.cos(viewYaw)*distance*Math.cos(player.pitch));
      if(airborne()){
        const angle=Math.atan2(11,14)-orbitYaw,radius=18.5,pitch=player.pitch;
        cameraAim.set(arrivalView.x,arrivalView.y+2,arrivalView.z);
        cameraDesired.set(arrivalView.x+Math.sin(angle)*radius*Math.cos(pitch),arrivalView.y+2+Math.sin(pitch)*radius,arrivalView.z+Math.cos(angle)*radius*Math.cos(pitch));
      }
      if(!started||!bob)camera.position.copy(cameraDesired);
      else camera.position.lerp(cameraDesired,1-Math.exp(-9*dt));
      const direction=camera.position.clone().sub(cameraAim), cameraDistance=direction.length();
      cameraRay.set(cameraAim,direction.normalize());cameraRay.far=cameraDistance;
      const hit=airborne()||skyRide?null:cameraRay.intersectObjects(world.cameraColliders,false)[0];
      if(hit&&!airborne())camera.position.copy(cameraAim).addScaledVector(direction,Math.max(.25,hit.distance-.3));
      // Preserve centimetre-scale ground separation in aerial views. The old
      // 8cm near plane lost depth precision hundreds of metres from the camera.
      const nearPlane=airborne()?2:(skyRide?1:.3);
      if(camera.near!==nearPlane){camera.near=nearPlane;camera.updateProjectionMatrix();}
      camera.lookAt(cameraAim);
      }
      world.update(elapsed,modalOpen()?0:dt,camera);
      renderer.render(scene,camera);residentView?.render(camera,arrivalView);
      uiClock+=dt;frameClock+=dt;frames++;
      if(frameClock>1){$('#performance').textContent=`${player.swimming?'Swimming · ':player.mode==='walking'?'Walking · ':''}${Math.round(Math.abs(player.speed)*3.6)} km/h · ${Math.round(frames/frameClock)} fps`;frameClock=0;frames=0;}
      if(uiClock>.12){updateHUD();uiClock=0;}
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();releaseKeys();toast('Graphics paused. Waiting for the browser to restore the scene…');});
  renderer.domElement.addEventListener('webglcontextrestored',()=>toast('Graphics restored. Welcome back.'));
  addControls();
  if(import.meta.env.DEV){window.__ELSEWHERE__={getState:()=>({player:{...player},quest:{...quest},chai:isChai?{...chai}:null,ready,started,night,quality,selected,discovered:[...discovered],drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,obstacles:world.obstacles.length}),landmarks:LANDMARKS};}
}

function updateHUD(){
  if(!isUrban){
    progressAdventure({places:discovered.size,delivery:quest.stage});
    const next=GOALS.find(g=>!adventure.unlocked.includes(g.id));
    $('#adventure-next').textContent=next?`${next.title} · ${Math.min(next.target,Math.floor(adventure[next.key]))}/${next.target}`:'All expedition rewards unlocked ✓';
    const content=GOALS.map(g=>`${adventure.unlocked.includes(g.id)?'✓':'○'} ${g.title} — ${g.reward}`).join('\n');
    if($('#adventure-list').textContent!==content)$('#adventure-list').textContent=content;
  }
  $('#adventure-goals').hidden=isUrban;
  const pickups=world?.pickups;
  collectionHUD.hidden=!!residentSession||!started||airborne()||!!skyRide||!pickups;
  if(pickups){
    for(const type of ['coin','nitro','shield','mystery']){const el=$(`#collected-${type}`),value=String(pickups.collected[type]);if(el.textContent!==value)el.textContent=value;}
    const wallet=`${pickups.coins} coins available · Nitro ${Math.round(pickups.nitro)}% · ${pickups.shield?'Shield ready':'No shield'}`;
    if($('#collection-wallet').textContent!==wallet)$('#collection-wallet').textContent=wallet;
    collectionHUD.classList.toggle('collected',pickups.flash>0);
  }
  const atSkyway=!isUrban&&started&&!airborne()&&Math.hypot(player.x-SKYWAY_GATE.x,player.z-SKYWAY_GATE.z)<=SKYWAY_GATE.radius;
  skyHUD.hidden=!skyRide&&!atSkyway;
  skyHUD.classList.toggle('in-ride',!!skyRide);
  if(!skyHUD.hidden){$('#skyway-score').textContent=skyRide?`${skyRide.running?'': 'Ride over · '}${skyRide.score.toLocaleString()} POINTS · BEST ${skyBest.toLocaleString()}`:'Sea bridge → mountain circuit · Challenge bicycle provided';
    $('#skyway-rewards').textContent=skyRide?`${rideRegion(skyRide.distance,skyway.length)} · ${(skyRide.distance/1000).toFixed(2)} km · ${CHECKPOINT_METERS-Math.floor(skyRide.distance%CHECKPOINT_METERS)}m to checkpoint\n● ${skyRide.coins}   ◆ ${skyRide.gems}   ♥ ${skyRide.lives}/${skyRide.maxLives}   ${skyRide.shield?'⬡ Shield':''}`:`${(skyway.length/1000).toFixed(1)} km loop · Checkpoints every 750m · Continues endlessly. City goals unlock upgrades.`;
    skyHUD.querySelectorAll('[data-sky-key]').forEach(b=>b.hidden=!skyRide);
    $('#skyway-start').hidden=!!skyRide?.running;$('#skyway-start').textContent=skyRide?'Retry':'Start ride · F';$('#skyway-exit').hidden=!skyRide;}
  $('#pickup-hud').hidden=!started||!pickups;
  if(pickups){
    $('#coin-count').textContent=`${pickups.coins} coins`;
    $('#shield-status').textContent=pickups.shield?'Shield ready':'No shield';
    $('#nitro-meter').value=pickups.nitro;$('#nitro-label').textContent=`${Math.ceil(pickups.nitro)}%`;
    $('#pickup-hud').classList.toggle('boosting',pickups.boosting&&player.speed>10);
    $('#pickup-hud').classList.toggle('collected',pickups.flash>0);
    $('#buy-nitro').disabled=pickups.coins<10||pickups.nitro>=100;
  }
  refreshTravel();
  updateQuest();
  for(const landmark of LANDMARKS){const distance=Math.hypot(player.x-landmark.x,player.z-landmark.z);$(`#distance-${landmark.id}`).textContent=`${Math.round(distance)}m`;
    if(started&&!airborne()&&!skyRide&&distance<landmark.radius&&!discovered.has(landmark.id)){
      discovered.add(landmark.id);storage.set('discoveries',[...discovered]);updateDiscoveries();
      $('#discovery-name').textContent=landmark.name;$('#discovery-description').textContent=landmark.subtitle;$('#discovery').classList.add('visible');
      clearTimeout(discoveryTimer);discoveryTimer=setTimeout(()=>$('#discovery').classList.remove('visible'),4500);
      if(discovered.size===LANDMARKS.length)$('#journey-hint').textContent='Every corner found. Stay a little longer.';
    }
  }
  $('#zone').textContent=isChai?(player.z>50?'Chai bazaar':player.x<-60?'Flower market':'Motor works'):isMumbai?(player.x<-58&&Math.abs(player.z-20)<15?'Shrinagar Complex Road':player.z>30&&player.x>-10?'Church headquarters':Math.abs(player.z-20)<9?'Marigold lane':'Mukund Nagar lanes'):player.x>64?'The old pier':player.z< -145?'Bairro do Mar':player.z>125?'Mercado Sul':player.x< -130?'Parque das Palmeiras':player.x<-36&&player.z>50?'Jardim do Sol':player.x>35?'Seafront promenade':'Old town';
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
  ctx.fillStyle='#68786c';ctx.beginPath();ctx.moveTo(px(-479),pz(-399));
  for(let z=-399;z<=359;z+=2)ctx.lineTo(px(shorelineX(z)),pz(z));
  ctx.lineTo(px(-479),pz(359));ctx.closePath();ctx.fill();
  rect(PORTO_BOUNDS.minX,PORTO_BOUNDS.minZ,PORTO_BOUNDS.maxX-PORTO_BOUNDS.minX,PORTO_BOUNDS.maxZ-PORTO_BOUNDS.minZ,'#526457');rect(-240,-260,304,460,'#68786c');for(const road of PORTO_ROADS)rect(road.x-road.w/2,road.z-road.d/2,road.w,road.d,'#a4ad92');rect(-402,-12,104,140,'#415c44');rect(-217,54.5,76,67,'#415c44');rect(64,-42,53,12,'#b4b294');rect(-101.5,53,65,60,'#415c44');rect(-59.5,53,5,60,'#9aa784');rect(-101.5,67.5,65,5,'#9aa784');
  }
  for(const b of world.obstacles){if(b.maxX-b.minX>10&&b.maxZ-b.minZ>10)rect(b.minX,b.minZ,b.maxX-b.minX,b.maxZ-b.minZ,'#c2baa0');}
  ctx.strokeStyle='#a0b9aa25';ctx.lineWidth=1;for(let x=0;x<w;x+=24){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}for(let y=0;y<h;y+=24){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
  if(selected){const dest=LANDMARKS.find(l=>l.id===selected);ctx.beginPath();ctx.setLineDash([4,5]);ctx.strokeStyle='#e6ecbc70';ctx.moveTo(px(player.x),pz(player.z));ctx.lineTo(px(dest.x),pz(dest.z));ctx.stroke();ctx.setLineDash([]);}
  for(const landmark of LANDMARKS){ctx.beginPath();ctx.arc(px(landmark.x),pz(landmark.z),selected===landmark.id?10:7,0,Math.PI*2);ctx.fillStyle=selected===landmark.id?'#e7edbb':'#203c35';ctx.fill();ctx.lineWidth=1.5;ctx.strokeStyle='#d3dcaf';ctx.stroke();ctx.fillStyle=selected===landmark.id?'#243c33':'#e5ebc5';ctx.font='9px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(discovered.has(landmark.id)?'✓':String(Number(landmark.number)),px(landmark.x),pz(landmark.z)+.5);if(mapExpanded){ctx.font='22px sans-serif';ctx.textAlign='left';ctx.fillStyle='#f5efd7';ctx.strokeStyle='#203c35';ctx.lineWidth=4;ctx.strokeText(landmark.name,px(landmark.x)+17,pz(landmark.z));ctx.fillText(landmark.name,px(landmark.x)+17,pz(landmark.z));}}
  const questStop=isChai?chaiTarget(chai):isMumbai?null:welcome.phase!=='settled'?welcome.guide:world.lifeObjective||(lifeStory?.state.complete?activeStop(quest):null);
  if(questStop){
    ctx.beginPath();ctx.setLineDash([3,4]);ctx.strokeStyle='#f1ce7e';ctx.moveTo(px(player.x),pz(player.z));ctx.lineTo(px(questStop.x),pz(questStop.z));ctx.stroke();ctx.setLineDash([]);
    ctx.save();ctx.translate(px(questStop.x),pz(questStop.z));ctx.rotate(Math.PI/4);ctx.fillStyle='#f1ce7e';ctx.fillRect(-5,-5,10,10);ctx.restore();
  }
  if(player.mode==='walking'&&player.bike){
    const bx=px(player.bike.x),bz=pz(player.bike.z);
    ctx.save();ctx.strokeStyle='#b9e7e9';ctx.fillStyle='#183a3b';ctx.lineWidth=2;
    for(const dx of [-6,6]){ctx.beginPath();ctx.arc(bx+dx,bz,4,0,Math.PI*2);ctx.fill();ctx.stroke();}
    ctx.beginPath();ctx.moveTo(bx-6,bz);ctx.lineTo(bx,bz-8);ctx.lineTo(bx+6,bz);ctx.stroke();
    if(mapExpanded){ctx.font='18px sans-serif';ctx.textAlign='left';ctx.fillStyle='#d5f2f0';ctx.fillText('Your bicycle',bx+16,bz);}
    ctx.restore();
  }
  ctx.save();ctx.translate(px(player.x),pz(player.z));ctx.rotate(player.yaw);ctx.beginPath();ctx.moveTo(0,-14);ctx.lineTo(-10,-29);ctx.quadraticCurveTo(0,-34,10,-29);ctx.closePath();ctx.fillStyle='#f3f4d42b';ctx.fill();ctx.beginPath();ctx.moveTo(0,-8);ctx.lineTo(5,6);ctx.lineTo(0,3);ctx.lineTo(-5,6);ctx.closePath();ctx.fillStyle='#f7f7e4';ctx.shadowColor='#f5ffd4';ctx.shadowBlur=8;ctx.fill();ctx.restore();
}

function addControls(){
  const canvas=renderer.domElement;let dragging=false,lastX=0,lastY=0;
  const look=(dx,dy)=>{orbitYaw+=dx*.0023;player.pitch=Math.max(airborne()?-.35:.05,Math.min(airborne()?1.15:.85,player.pitch+dy*.0023));};
  async function lockLook(){if(residentSession)return;if(document.pointerLockElement||!started||modalOpen())return;try{await canvas.requestPointerLock();}catch{toast('Drag the scene to look around. A and D steer the bike.');}}
  $('#enter').addEventListener('click',()=>{if(!ready)return;startRide();if(!matchMedia('(pointer:coarse)').matches)lockLook();});
  canvas.addEventListener('pointerdown',event=>{if(residentSession)return;if(!started||modalOpen())return;canvas.focus();dragging=true;lastX=event.clientX;lastY=event.clientY;if(event.pointerType!=='mouse'||airborne()){canvas.setPointerCapture(event.pointerId);}else if(!document.pointerLockElement)lockLook();});
  canvas.addEventListener('pointermove',event=>{if(residentSession)return;if(!started||modalOpen())return;if(document.pointerLockElement===canvas)look(event.movementX,event.movementY);else if(dragging){look(event.clientX-lastX,event.clientY-lastY);lastX=event.clientX;lastY=event.clientY;}});
  const stopDrag=()=>{dragging=false;};window.addEventListener('pointerup',stopDrag);window.addEventListener('pointercancel',stopDrag);
  document.addEventListener('pointerlockchange',()=>{$('#ui').classList.toggle('unlocked',document.pointerLockElement!==canvas);releaseKeys();dragging=false;});
  document.addEventListener('pointerlockerror',()=>toast('Mouse capture is unavailable. Drag to look, or use A / D to steer.'));
  window.addEventListener('keydown',event=>{
    if(residentSession)return;
    if(skyRide&&!modalOpen()){
      if(event.code==='KeyS'||event.code==='ArrowDown'){event.preventDefault();keys.add(event.code);return;}
      if(['KeyA','KeyD','ArrowLeft','ArrowRight','Space','Escape','KeyR'].includes(event.code)){event.preventDefault();if(!event.repeat){if(event.code==='Escape')exitSkyway();else if(event.code==='KeyR')beginSkyway();else rideInput(skyRide,event.code);}}
      return;
    }
    if(airborne()){
      if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.code)){
        event.preventDefault();if(arrival.phase==='parachute'||arrival.phase==='balloon'&&arrival.elapsed>=JOURNEY_SECONDS)keys.add(event.code);
      }
      return;
    }
    if(['INPUT','TEXTAREA','SELECT'].includes(event.target.tagName))return;
    if(event.code==='KeyM'&&!event.repeat&&(!modalOpen()||$('#map-dialog').open)){event.preventDefault();expandMap();return;}
    if(modalOpen())return;
    if(mapZoomKey(event))return;
    if(event.code==='KeyP'&&!event.repeat){document.body.classList.toggle('photo-hidden');event.preventDefault();return;}
    if(event.code==='Escape'){document.body.classList.remove('photo-hidden');releaseKeys();return;}
    if(!started)return;
    if(ATTACK_KEYS[event.code]&&!event.repeat){event.preventDefault();strike(...ATTACK_KEYS[event.code]);return;}
    if(event.code==='KeyX'&&!event.repeat&&!isUrban){event.preventDefault();changeTravel();return;}
    if(event.code==='KeyV'&&!event.repeat&&!isUrban){event.preventDefault();toggleWardrobe();return;}
    if(event.code==='KeyF'&&!event.repeat){event.preventDefault();talk();return;}
    if(event.code==='KeyC'&&!event.repeat){orbitYaw=0;return;}
    if(event.code==='KeyR'&&!event.repeat){reset();return;}
    if(['KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE','KeyB','ShiftLeft','ShiftRight','Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.code)){event.preventDefault();if(event.code!=='Space'||!event.repeat)keys.add(event.code);}
  });
  window.addEventListener('keyup',event=>keys.delete(event.code));window.addEventListener('blur',()=>{releaseKeys();dragging=false;audioContext?.suspend();});window.addEventListener('focus',()=>{if(soundOn)audioContext?.resume();});
  document.addEventListener('visibilitychange',()=>{releaseKeys();if(document.hidden)audioContext?.suspend();else if(soundOn)audioContext?.resume();});
  document.querySelectorAll('[data-attack]').forEach(button=>button.addEventListener('pointerdown',e=>{e.preventDefault();const [type,side]=button.dataset.attack.split(',');strike(type,Number(side));}));
  document.querySelectorAll('[data-key]').forEach(button=>{button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);keys.add(button.dataset.key);});for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,()=>keys.delete(button.dataset.key));});
  window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
}

function openDialog(id){if(document.pointerLockElement)document.exitPointerLock();releaseKeys();if(id!=='#game-menu'&&$('#game-menu').open)$('#game-menu').close();$(id).showModal();}
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

try{initialize();}catch(error){console.error(error);document.querySelector('#app').innerHTML=`<main class="fatal"><div><span class="eyebrow">A small detour</span><h1>The world couldn’t open.</h1><p>This experience needs WebGL 2. Try a recent Chrome, Edge, Firefox, or Safari with hardware acceleration enabled.</p><button class="enter" id="retry">Try again ${icon('arrow')}</button></div></main>`;if(!/webgl|creating.*context/i.test(error.message||''))$('.fatal p').textContent='The game encountered a startup error: '+(error.message||'Unknown error')+'. Please reload after the update.';$('#retry').onclick=()=>location.reload();}
