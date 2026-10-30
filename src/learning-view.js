const time=value=>new Date(value).toLocaleString();
const node=(tag,text,className)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(className)e.className=className;return e;};
export function mountLearningView(){
  const card=node('aside',undefined,'learning-live');card.setAttribute('aria-label','Live learning');
  card.innerHTML='<header><strong>Learning live</strong><button type="button" aria-label="Minimize learning">−</button></header><div class="learning-live-content"><p id="learning-counts"></p><p id="learning-new"></p><button id="learning-open" type="button">Inspect learning & reuse ↗</button></div>';
  const panel=node('section',undefined,'learning-inspector');panel.hidden=true;panel.setAttribute('aria-label','Learning evidence and memory reuse');
  panel.innerHTML='<header><div><small>EXPERIENCE → OUTCOME → MEMORY</small><h2>What is being learned?</h2></div><button id="learning-close" type="button" aria-label="Close learning inspector">×</button></header><p id="learning-overview"></p><h3>Latest measured outcome</h3><div id="learning-outcome"></div><h3>Learned activity preferences</h3><p>Scores compare measured need relief and money spent or earned. More trials provide more evidence; these scores do not retrain the AI model.</p><div class="learning-table-wrap"><table><thead><tr><th>Activity / place</th><th>Trials</th><th>Mean score</th><th>Updated</th></tr></thead><tbody id="learning-preferences"></tbody></table></div><h3>New verified observations</h3><p>These come from game state, not camera images or sounds.</p><ol id="learning-observations"></ol><h3>Recent completed experiences</h3><ol id="learning-outcomes"></ol><h3>Memory cache & reuse</h3><p id="learning-cache"></p><details open><summary>Cached memory summary</summary><pre id="learning-summary"></pre></details><details><summary>Memory actually sent in the last AI request</summary><pre id="learning-used"></pre></details>';
  document.querySelector('#app').append(card,panel);
  let signature='',latest=null,minimized=false;
  card.querySelector('header button').onclick=()=>{minimized=!minimized;card.classList.toggle('minimized',minimized);card.querySelector('header button').textContent=minimized?'+':'−';card.querySelector('header button').setAttribute('aria-label',minimized?'Expand learning':'Minimize learning');};
  card.querySelector('#learning-open').onclick=()=>{panel.hidden=false;render(latest,true);panel.querySelector('#learning-close').focus();};
  panel.querySelector('#learning-close').onclick=()=>{panel.hidden=true;card.querySelector('#learning-open').focus();};
  function render(s,force=false){
    if(!s)return;latest=s;const learning=s.learning||{},cache=s.memoryCache||{},last=s.outcomes?.at(-1);
    card.querySelector('#learning-counts').textContent=`${learning.totalOutcomes||0} outcomes learned · ${cache.hits||0} cache reuses`;
    card.querySelector('#learning-new').textContent=last?`${last.activity} at ${last.place} · measured score ${last.reward>=0?'+':''}${last.reward}`:'Learning begins after the next activity finishes.';
    if(panel.hidden)return;
    const key=JSON.stringify([learning,s.observations,s.outcomes,cache,s.ai?.localRecallHits,s.ai?.telemetry?.requests]);if(!force&&key===signature)return;signature=key;
    panel.querySelector('#learning-overview').textContent=`${learning.totalOutcomes||0} measured outcomes · ${(s.observations||[]).length} retained observations · ${s.ai?.localRecallHits||0} grounded replies without AI calls. All saved with your resident.`;
    const outcome=panel.querySelector('#learning-outcome');outcome.replaceChildren();
    if(last){outcome.append(node('p',`${last.activity} at ${last.place} · ${time(last.at)} · €${last.moneyChange>=0?'+':''}${last.moneyChange}`));
      const table=node('table');const head=node('tr');for(const label of ['Need','Before','After','Change'])head.append(node('th',label));table.append(head);
      for(const key of Object.keys(last.before||{})){const row=node('tr'),before=Math.round(last.before[key]),after=Math.round(last.after[key]),delta=after-before;for(const text of [key,before,after,(delta>0?'+':'')+delta])row.append(node('td',text));table.append(row);}outcome.append(table);
    }else outcome.append(node('p','No measured outcomes yet. Activities already in progress before the update may not have a baseline.'));
    const preferences=panel.querySelector('#learning-preferences');preferences.replaceChildren();
    for(const [key,p] of Object.entries(learning.preferences||{}).sort((a,b)=>b[1].lastAt-a[1].lastAt)){const row=node('tr');for(const text of [key.replace('|',' · '),p.count,p.meanReward,time(p.lastAt)])row.append(node('td',text));preferences.append(row);}
    if(!preferences.children.length){const row=node('tr'),cell=node('td','No learned preferences yet.');cell.colSpan=4;row.append(cell);preferences.append(row);}
    const observations=panel.querySelector('#learning-observations');observations.replaceChildren();for(const o of [...(s.observations||[])].reverse()){observations.append(node('li',`${time(o.at)} · ${o.activity} · ${(o.nearbyPlaces||[]).map(p=>`${p.name} (${p.metres}m)`).join(', ')||`x ${o.position.x}, z ${o.position.z}`} · source: ${o.source}`));}
    const outcomes=panel.querySelector('#learning-outcomes');outcomes.replaceChildren();for(const o of [...(s.outcomes||[])].reverse())outcomes.append(node('li',`${time(o.at)} · ${o.activity} at ${o.place} · score ${o.reward} · money ${o.moneyChange>=0?'+':''}${o.moneyChange}`));
    panel.querySelector('#learning-cache').textContent=`${cache.builds||0} summaries built locally · ${cache.hits||0} summary reuses · zero AI calls for summarization. Rebuilds only when observations or measured outcomes change.`;
    panel.querySelector('#learning-summary').textContent=cache.summary?JSON.stringify(cache.summary,null,2):'No summary built yet.';
    let used=null;try{const messages=s.ai?.telemetry?.lastExchange?.sent?.messages||[];const context=JSON.parse(messages.find(m=>m.role==='user')?.content||'{}');used=context.world?.memory;}catch{}
    panel.querySelector('#learning-used').textContent=used?JSON.stringify(used,null,2):'No request using the new memory format has been recorded yet.';
  }
  return {update:render};
}
