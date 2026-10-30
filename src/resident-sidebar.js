import './resident-sidebar.css';
export function mountResidentSidebar(){
 const app=document.querySelector('#app'),mobile=matchMedia('(max-width: 760px)');
 document.body.classList.add('resident-sidebar-layout');
 const toggle=document.createElement('button');toggle.id='resident-menu-toggle';toggle.type='button';toggle.setAttribute('aria-controls','resident-sidebar');toggle.innerHTML='<span aria-hidden="true">☰</span><span>Menu</span>';
 const backdrop=document.createElement('button');backdrop.id='resident-menu-backdrop';backdrop.type='button';backdrop.setAttribute('aria-label','Close menu');backdrop.tabIndex=-1;
 const sidebar=document.createElement('aside');sidebar.id='resident-sidebar';sidebar.setAttribute('aria-label','City controls');
 sidebar.innerHTML='<header><div><small>ELSEWHERE</small><h2>Your resident</h2></div><button type="button" aria-label="Collapse sidebar">‹</button></header><div class="resident-sidebar-scroll"><section data-sidebar="resident"><h3>Resident</h3></section><section data-sidebar="life"><h3>Life controls</h3></section><section data-sidebar="learning"><h3>Learning & research</h3></section><section data-sidebar="camera"><h3>Camera</h3></section><details data-sidebar="map"><summary>Neighborhood map</summary></details><details data-sidebar="world"><summary>World & appearance</summary></details><details data-sidebar="more"><summary>More controls</summary></details></div>';
 app.append(backdrop,sidebar,toggle);
 const dashboardLink=document.createElement('a');dashboardLink.href='/dashboard';dashboardLink.className='resident-dashboard-link';dashboardLink.textContent='Resident dashboard ↗';sidebar.querySelector('[data-sidebar="learning"]').append(dashboardLink);
 const trainingLink=document.createElement('a');trainingLink.href='/training';trainingLink.className='resident-dashboard-link';trainingLink.textContent='Training ground ↗';sidebar.querySelector('[data-sidebar="learning"]').append(trainingLink);
 const targets={resident:['#resident-ai-connection','#resident-brain-toggle','.resident-phone-badge'],life:['#resident-playback','#arrival-ui'],learning:['.learning-live'],camera:['#spectator-controls'],map:['.map-card'],world:['.top-actions','.character-tools'],more:['.journey','.quest-card','#pickup-hud','.bottom-bar']};
 function collect(){for(const [group,selectors] of Object.entries(targets))for(const selector of selectors){const element=document.querySelector(selector),parent=sidebar.querySelector(`[data-sidebar="${group}"]`);if(element&&element.parentElement!==parent)parent.append(element);}}
 collect();const observer=new MutationObserver(collect);observer.observe(app,{childList:true,subtree:true});
 let open=!mobile.matches;
 function setOpen(value,focus=false){open=value;document.body.classList.toggle('resident-menu-open',open);toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Collapse city controls':'Open city controls');sidebar.inert=!open;sidebar.setAttribute('aria-hidden',String(!open));backdrop.hidden=!open||!mobile.matches;
  if(mobile.matches&&open){sidebar.setAttribute('role','dialog');sidebar.setAttribute('aria-modal','true');}else{sidebar.removeAttribute('role');sidebar.removeAttribute('aria-modal');}
  document.querySelector('#viewport').inert=mobile.matches&&open;
  if(focus)(open?sidebar.querySelector('header button'):toggle).focus();
 }
 toggle.onclick=()=>setOpen(!open,true);sidebar.querySelector('header button').onclick=()=>setOpen(false,true);backdrop.onclick=()=>setOpen(false,true);
 sidebar.addEventListener('click',event=>{const action=event.target.closest('#resident-brain-toggle,#resident-ai-connection,.resident-phone-badge,#learning-open,.learning-score-button,#spectator-controls button,.top-actions button,#map-expand');if(action&&mobile.matches)setOpen(false);});
 document.addEventListener('keydown',event=>{if(!open)return;if(event.key==='Escape'&&!document.querySelector('dialog[open]')){setOpen(false,true);event.preventDefault();}
  if(event.key==='Tab'&&mobile.matches&&sidebar.contains(document.activeElement)){const focusable=[...sidebar.querySelectorAll('button,a[href],input,select,summary')].filter(e=>!e.disabled&&e.getClientRects().length);const first=focusable[0],last=focusable.at(-1);if(event.shiftKey&&document.activeElement===first){last?.focus();event.preventDefault();}else if(!event.shiftKey&&document.activeElement===last){first?.focus();event.preventDefault();}}
 });
 mobile.addEventListener('change',()=>setOpen(!mobile.matches));setOpen(open);
 return {close:()=>setOpen(false),destroy(){observer.disconnect();}};
}
