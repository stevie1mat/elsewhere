export const STORY_VERSION=1;
const art=name=>`/assets/story/cinema/${name}-v2.jpg`;
export const STORY_CHAPTERS=[
  {image:art('packing'),alt:'A cartoon traveler folds a shirt beside an open suitcase, a notebook and a family photograph.',label:'01 · What you carry',title:'A life doesn’t fit in a suitcase.',body:'You fold a familiar shirt. Make room for a photograph. Tuck a recipe between the pages of a notebook. You check the bag again, although you already know what is inside.',note:'Some things are too important to leave. Others are too large to take.'},
  {image:art('goodbye'),alt:'A traveler and a loved one share an embrace at an open doorway.',label:'02 · The goodbye',title:'One more minute at the door.',body:'There are practical things to say. Keep your papers safe. Charge your phone. Let us know when you arrive. You hold on a little longer than you meant to.',note:'“And eat something, okay?”'},
  {image:art('crossing'),alt:'A traveler looks through a ferry window at the sea, holding a phone.',label:'03 · In between',title:'The familiar shore gets smaller.',body:'Some people leave for work. Some for love, safety, study, or the chance to begin again. Your reasons belong to you. Across the water, you rehearse the first things you might say.',note:'You can look forward to somewhere new and still miss what you left.'},
  {image:art('crossing'),alt:'Morning light crosses the sea outside the traveler’s window.',label:'04 · A message from home',title:'“Tell me when you get there.”',body:'You listen to the message once more. For a moment, a familiar voice makes the distance feel smaller. You begin a reply, erase it, then type: “Almost there.”',note:'You don’t have to know how everything will work out today.'},
  {image:art('arrival'),alt:'The traveler sees Porto Sol’s waterfront, lighthouse, bicycles and arrival balloon.',label:'05 · Porto Sol',title:'A place that doesn’t know your name. Yet.',body:'The town comes into view: balconies, bicycles, washing in the breeze. You hear unfamiliar voices and smell someone cooking. Ordinary life is happening here. Soon, yours will be part of it.',note:'A new beginning doesn’t mean leaving yourself behind.'},
  {image:art('arrival'),alt:'The traveler waves from a balloon above Porto Sol’s waterfront.',label:'06 · Your first morning',title:'You’ve arrived. The rest is unwritten.',body:'A balloon carries you in from the sea. Mara, a local welcome guide, will meet you on the island and show you to your first room. A place to put down your suitcase. A little time to find your feet.',note:'First, a room and a friendly face. The rest can wait until you’ve put your bag down.'},
];

export const STORY_SUBTITLES = [
  'A little piece of home.',
  'One more moment together.',
  '',
  '“Tell me when you get there.”',
  'Somewhere new. A new beginning.',
  'Your first morning starts here.',
];
export const STORY_SCENE_MS = 4500;
// Removed captions also remove their timeline beat, rather than leaving a silent delay.
export const STORY_SCENES = STORY_CHAPTERS
  .map((chapter,chapterIndex)=>({...chapter,chapterIndex,subtitle:STORY_SUBTITLES[chapterIndex]}))
  .filter(scene=>scene.subtitle);

export function mountOpeningStory({onFinish=()=>{}}={}) {
  const dialog=document.createElement('dialog');
  dialog.id='opening-story';
  dialog.tabIndex=-1;
  dialog.setAttribute('aria-label','Opening film. Press Escape to skip.');
  dialog.innerHTML='<div class="story-cinema" aria-hidden="true"></div><div class="story-shade"></div><div class="story-grain" aria-hidden="true"></div><p class="story-subtitle" aria-live="polite" aria-atomic="true"></p>';
  document.body.append(dialog);
  const stage=dialog.querySelector('.story-cinema');
  const subtitle=dialog.querySelector('.story-subtitle');
  let index=0,active=false,previousFocus,artRequest=0,frameId=0,lastTime=0,elapsed=0,currentImage='',ready=false;

  function render() {
    const chapter=STORY_SCENES[index],request=++artRequest;
    elapsed=0;
    const showSubtitle=()=>{
      if(!active||request!==artRequest)return;
      subtitle.textContent=chapter.subtitle;
      ready=true;
      lastTime=performance.now();
    };
    // Keep the camera moving when successive subtitles share the same shot.
    if(currentImage===chapter.image){showSubtitle();return;}
    ready=false;
    const frame=document.createElement('div');frame.className='story-frame';
    const image=new Image();image.className='story-film-art';image.alt='';
    image.style.objectPosition=chapter.chapterIndex===1?'50% 35%':chapter.chapterIndex>3?'64% 35%':'60% 35%';
    image.onload=()=>{
      if(!active||request!==artRequest)return;
      while(stage.children.length>1)stage.firstElementChild.remove();
      stage.append(frame);
      currentImage=chapter.image;
      showSubtitle();
    };
    // A failed asset must not trap the player in the opening.
    image.onerror=showSubtitle;
    frame.append(image);image.src=chapter.image;
    if(index+1<STORY_SCENES.length){const preload=new Image();preload.src=STORY_SCENES[index+1].image;}
  }
  function tick(now) {
    if(!active)return;
    if(!document.hidden&&ready)elapsed+=now-lastTime;
    lastTime=now;
    if(elapsed>=STORY_SCENE_MS){
      if(index===STORY_SCENES.length-1){finish();return;}
      index++;render();
    }
    frameId=requestAnimationFrame(tick);
  }
  function finish(){if(active){cancelAnimationFrame(frameId);++artRequest;dialog.close();}}
  document.addEventListener('visibilitychange',()=>{lastTime=performance.now();});
  dialog.addEventListener('click',e=>e.stopImmediatePropagation());
  dialog.addEventListener('keydown',e=>e.stopPropagation());
  dialog.addEventListener('cancel',e=>{e.preventDefault();finish();});
  dialog.addEventListener('close',()=>{
    if(!active)return;
    active=false;ready=false;cancelAnimationFrame(frameId);++artRequest;
    document.body.classList.remove('story-open');previousFocus?.focus?.();onFinish();
  });
  return {
    get active(){return active;},
    open(){
      if(active)return;
      index=0;active=true;currentImage='';stage.replaceChildren();subtitle.textContent='';
      previousFocus=document.activeElement;document.exitPointerLock?.();
      document.body.classList.add('story-open');dialog.showModal();dialog.focus();
      lastTime=performance.now();render();frameId=requestAnimationFrame(tick);
    },
  };
}
