import {restoreLife,lifeStep,canDoLife,advanceLife,LIFE_STEPS} from './settling-story.js';
export function mountSettlingStory({storage,getPlayer,getWorld,releaseKeys,onChange=()=>{}}){
 let state=restoreLife(storage.get('settling-story')),active=false,saveFailed=false;
 const card=document.createElement('section');card.id='life-card';card.hidden=true;
 card.innerHTML='<small id="life-chapter"></small><h2 id="life-title"></h2><p id="life-objective"></p><div class="life-actions"><button id="life-act"></button><button id="life-journal">Journal</button></div><p id="life-pocket"></p>';document.querySelector('#app').append(card);
 const dialog=document.createElement('dialog');dialog.id='life-dialog';dialog.innerHTML='<small id="life-label"></small><h2 id="life-speaker"></h2><div id="life-copy"></div><div id="life-choices"></div><button id="life-close">Back to the town</button>';document.body.append(dialog);
 const $=id=>document.getElementById(id);
 function close(){dialog.close();releaseKeys();}
 $('life-close').onclick=close;
 dialog.addEventListener('keydown',e=>e.stopPropagation());dialog.addEventListener('click',e=>e.stopPropagation());dialog.addEventListener('close',releaseKeys);
 function open(){releaseKeys();document.exitPointerLock?.();dialog.showModal();}
 function interact(){
  if(!active||state.complete||!canDoLife(state,getPlayer()))return false;
  const step=lifeStep(state);$('life-label').textContent=`CHAPTER ${step.chapter} · ${step.title}`;$('life-speaker').textContent=step.speaker;$('life-copy').textContent=step.text;$('life-choices').replaceChildren();
  step.choices.forEach((choice,i)=>{const button=document.createElement('button');button.textContent=choice.label;button.disabled=state.money<(choice.cost||0);button.onclick=()=>{
   const next=advanceLife(state,getPlayer(),i);if(next===state)return;
   state=next;saveFailed=storage.set('settling-story',state)===false;onChange(state);close();update(true);
  };$('life-choices').append(button);});
  open();return true;
 }
 function journal(){
  $('life-label').textContent='YOUR LIFE IN PORTO SOL';$('life-speaker').textContent=state.complete?'Tomorrow has an address':'Your journal';$('life-copy').replaceChildren();$('life-choices').replaceChildren();
  const entries=[{title:'People you know',text:state.friends.join(', ')||'A town full of people you have yet to meet.'},{title:`In your pocket · €${state.money}`,text:state.items.join(' · ')||'A suitcase and a new address.'},...state.journal];
  for(const entry of entries){const article=document.createElement('article'),title=document.createElement('h3'),body=document.createElement('p');title.textContent=entry.title;body.textContent=entry.text;article.append(title,body);$('life-copy').append(article);}
  open();
 }
 $('life-act').onclick=()=>state.complete?journal():interact();$('life-journal').onclick=journal;
 function update(enabled){
  active=enabled;const world=getWorld();if(world){world.lifeObjective=enabled?lifeStep(state):null;world.lifeWorld?.update(state,enabled);}
  card.hidden=!enabled||dialog.open||!!document.querySelector('dialog[open]');
  const step=lifeStep(state),p=getPlayer();
  $('life-chapter').textContent=step?`CHAPTER ${step.chapter} OF 4 · ${state.stage+1} / ${LIFE_STEPS.length}`:'FIRST DAYS COMPLETE';
  $('life-title').textContent=step?.title||'You have a place here';
  $('life-objective').textContent=step?`${step.place} · ${Math.round(Math.hypot(p.x-step.x,p.z-step.z))}m · Follow the gold marker`:'Your room, your neighbours, and tomorrow. Explore freely or revisit your journal.';
  $('life-act').textContent=state.complete?'Read your story':canDoLife(state,p)?'F · Continue story':'Walk to the gold marker';$('life-act').disabled=!state.complete&&!canDoLife(state,p);
  $('life-pocket').textContent=(saveFailed?'Progress could not be saved in this browser · ':'')+`€${state.money} · ${state.items.includes('Bag of warm bread')?'Carrying warm bread':state.friends.length+' neighbours met'}`;
 }
 return {update,interact,journal,get state(){return state;}};
}
