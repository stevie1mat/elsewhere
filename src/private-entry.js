import './private-entry.css';
const app=document.querySelector('#app');
let refreshingVersion=false;
const assetError=error=>/dynamically imported module|loading chunk|importing a module script|preload.*css|failed to fetch module/i.test(error?.message||String(error));
function refreshVersion(){
  if(refreshingVersion)return true;
  // Only refresh once per minute, so network failures cannot create a reload loop.
  try{const last=Number(sessionStorage.getItem('porto:asset-refresh')||0);if(Date.now()-last<60000)return false;sessionStorage.setItem('porto:asset-refresh',String(Date.now()));}catch{return false;}
  refreshingVersion=true;shell('Updating your city…','A new version is ready. Reconnecting to your saved life.');
  const url=new URL(location.href);url.searchParams.set('_update',String(Date.now()));location.replace(url.href);return true;
}
window.addEventListener('vite:preloadError',event=>{if(refreshVersion())event.preventDefault();});
function shell(title,message){
  app.replaceChildren();const main=document.createElement('main');main.className='private-entry';
  const small=document.createElement('small');small.textContent='ELSEWHERE · PRIVATE WORLD';const heading=document.createElement('h1');heading.textContent=title;
  const copy=document.createElement('p');copy.textContent=message;main.append(small,heading,copy);app.append(main);return main;
}
async function start(){
  shell('Checking in on your city…','Connecting to your resident’s saved life.');
  try{
    const response=await fetch('/api/resident',{cache:'no-store'});
    if(response.status===401){login();return;}
    if(!response.ok){let message='The hosted game server is unavailable.';try{message=(await response.json()).error||message;}catch{}throw Error(message);}
    window.portoResident=await response.json();
    if(location.search)history.replaceState(null,'',location.pathname);
    await import('./main.js');
  }catch(error){
    console.error(error);if(refreshingVersion)return;
    const stale=assetError(error);if(stale&&refreshVersion())return;
    const main=shell(stale?'The game update could not load.':'Your city is temporarily offline.',stale?'Please refresh to load the latest game version. Your saved character is safe.':error.message||'Please try connecting again.');
    const button=document.createElement('button');button.textContent='Try again';button.onclick=()=>location.reload();main.append(button);
  }
}
function login(){
  const main=shell('Your city is waiting.','Enter your access code to check in on your resident.');
  const form=document.createElement('form'),input=document.createElement('input'),button=document.createElement('button'),error=document.createElement('p');
  input.type='password';input.inputMode='numeric';input.autocomplete='current-password';input.required=true;input.setAttribute('aria-label','Access code');button.textContent='Enter Porto Sol';error.setAttribute('role','alert');form.append(input,button,error);main.append(form);
  form.onsubmit=async event=>{
    event.preventDefault();button.disabled=true;error.textContent='';
    try{const response=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:input.value})});
      if(!response.ok){let message='Unable to sign in.';try{message=(await response.json()).error||message;}catch{}throw Error(message);}
      await start();
    }catch(e){error.textContent=e.message;}finally{button.disabled=false;}
  };input.focus();
}
void start();
