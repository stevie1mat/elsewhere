export const STORY_VERSION=1;
const art=name=>`/assets/story/${name}-v1.jpg`;
export const STORY_CHAPTERS=[
  {image:art('packing'),alt:'Hands fold a blue shirt into a suitcase beside a recipe notebook and a photograph.',label:'01 · What you carry',title:'A life doesn’t fit in a suitcase.',body:'You fold a familiar shirt. Make room for a photograph. Tuck a recipe between the pages of a notebook. You check the bag again, although you already know what is inside.',note:'Some things are too important to leave. Others are too large to take.'},
  {image:art('goodbye'),alt:'A traveler and a loved one share an embrace at an open doorway.',label:'02 · The goodbye',title:'One more minute at the door.',body:'There are practical things to say. Keep your papers safe. Charge your phone. Let us know when you arrive. You hold on a little longer than you meant to.',note:'“And eat something, okay?”'},
  {image:art('crossing'),alt:'A traveler looks through a ferry window at the sea, holding a phone.',label:'03 · In between',title:'The familiar shore gets smaller.',body:'Some people leave for work. Some for love, safety, study, or the chance to begin again. Your reasons belong to you. Across the water, you rehearse the first things you might say.',note:'You can look forward to somewhere new and still miss what you left.'},
  {image:art('crossing'),alt:'Morning light crosses the sea outside the traveler’s window.',label:'04 · A message from home',title:'“Tell me when you get there.”',body:'You listen to the message once more. For a moment, a familiar voice makes the distance feel smaller. You begin a reply, erase it, then type: “Almost there.”',note:'You don’t have to know how everything will work out today.'},
  {image:art('arrival'),alt:'The traveler sees Porto Sol’s waterfront, lighthouse, bicycles and arrival balloon.',label:'05 · Porto Sol',title:'A place that doesn’t know your name. Yet.',body:'The town comes into view: balconies, bicycles, washing in the breeze. You hear unfamiliar voices and smell someone cooking. Ordinary life is happening here. Soon, yours will be part of it.',note:'A new beginning doesn’t mean leaving yourself behind.'},
  {image:art('arrival'),alt:'A colorful balloon waits above the arrival terrace overlooking Porto Sol.',label:'06 · Your first morning',title:'You’ve arrived. The rest is unwritten.',body:'A balloon carries you in from the sea. Mara, a local welcome guide, will meet you on the island and show you to your first room. A place to put down your suitcase. A little time to find your feet.',note:'First, a room and a friendly face. The rest can wait until you’ve put your bag down.'},
];

export function mountOpeningStory({onFinish=()=>{}}={}){
  const dialog=document.createElement('dialog');dialog.id='opening-story';dialog.setAttribute('aria-labelledby','story-title');
  dialog.innerHTML='<img class="story-art" alt=""><div class="story-shade"></div><header class="story-header"><span>ELSEWHERE <small>A place to call home</small></span><button type="button" class="story-skip">Skip story ↗</button></header><section class="story-copy" aria-live="polite" aria-atomic="true"><p class="story-label"></p><h1 id="story-title" tabindex="-1"></h1><p class="story-body"></p><p class="story-note"></p></section><footer class="story-footer"><div class="story-progress" aria-label="Story progress"></div><div class="story-controls"><button type="button" class="story-back">← Back</button><button type="button" class="story-next">Continue →</button></div></footer>';
  document.body.append(dialog);
  const $=selector=>dialog.querySelector(selector);let index=0,active=false,previousFocus;
  function render(focus=true){
    const chapter=STORY_CHAPTERS[index];$('.story-art').src=chapter.image;$('.story-art').alt=chapter.alt;
    $('.story-label').textContent=chapter.label;$('#story-title').textContent=chapter.title;$('.story-body').textContent=chapter.body;$('.story-note').textContent=chapter.note;
    $('.story-back').disabled=index===0;$('.story-next').textContent=index===STORY_CHAPTERS.length-1?'Begin my journey →':'Continue →';
    $('.story-progress').textContent=`${String(index+1).padStart(2,'0')} / ${String(STORY_CHAPTERS.length).padStart(2,'0')}`;
    if(focus)$('#story-title').focus();
    if(index+1<STORY_CHAPTERS.length){const preload=new Image();preload.src=STORY_CHAPTERS[index+1].image;}
  }
  function finish(){if(active)dialog.close();}
  function next(){if(index===STORY_CHAPTERS.length-1)finish();else{index++;render();}}
  $('.story-next').onclick=next;$('.story-back').onclick=()=>{if(index>0){index--;render();}};$('.story-skip').onclick=finish;
  dialog.addEventListener('click',e=>e.stopImmediatePropagation());
  dialog.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='ArrowRight'){e.preventDefault();next();}if(e.key==='ArrowLeft'&&index>0){e.preventDefault();index--;render();}});
  dialog.addEventListener('cancel',e=>{e.preventDefault();finish();});
  dialog.addEventListener('close',()=>{if(!active)return;active=false;document.body.classList.remove('story-open');previousFocus?.focus?.();onFinish();});
  return {get active(){return active;},open(){if(active)return;index=0;active=true;previousFocus=document.activeElement;document.exitPointerLock?.();document.body.classList.add('story-open');render(false);dialog.showModal();$('.story-next').focus();}};
}
