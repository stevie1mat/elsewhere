import test from 'node:test';import assert from 'node:assert/strict';
import {usageDay,dailyUsageView} from '../server/daily-usage.js';import {recordTelemetry} from '../server/ai-telemetry.js';
const stamp=s=>Date.parse(s),attempt=(at,provider='Groq',usage={input:100,output:20,total:120})=>({at,provider,model:'test',usage,status:'success'});
test('Toronto midnight and DST determine the daily bucket, not host timezone',()=>{
 assert.equal(usageDay(stamp('2026-10-30T03:59:59Z')),'2026-10-29');assert.equal(usageDay(stamp('2026-10-30T04:00:00Z')),'2026-10-30');assert.equal(usageDay(stamp('2026-01-01T04:59:59Z')),'2025-12-31');
});
test('counts providers separately, preserves totals across save/restore, and leaves unknown usage unknown',()=>{
 const ai={};const a=attempt(Date.now());recordTelemetry(ai,{attempts:[a,{...a,provider:'Mistral',usage:null}]});let view=dailyUsageView(ai.telemetry);assert.equal(view.total,120);assert.equal(view.requests,2);assert.equal(view.missing,1);assert.equal(view.current.providers.Mistral.total,0);
 const restored=JSON.parse(JSON.stringify(ai));recordTelemetry(restored,{attempts:[{...a,at:a.at+1}]});view=dailyUsageView(restored.telemetry);assert.equal(view.total,240);assert.equal(view.requests,3);
});
test('migration reconstructs only retained history, marks partial, never assigns lifetime tokens to today',()=>{
 const at=Date.now(),t={total:141463,recent:[attempt(at)]};const view=dailyUsageView(t,at);assert.equal(view.total,120);assert.equal(view.partial,true);assert.equal(t.daily,undefined);
 const ai={telemetry:t};recordTelemetry(ai,{attempts:[attempt(at+1)]});assert.equal(dailyUsageView(t,at).total,240);assert.equal(t.total,141583);
});
test('empty next day resets while historical daily records remain available',()=>{
 const ai={};const at=Date.now();recordTelemetry(ai,{attempts:[attempt(at)]});const next=at+86400000*2;const view=dailyUsageView(ai.telemetry,next);assert.equal(view.total,0);assert.equal(view.requests,0);assert.equal(view.partial,false);assert.equal(view.days.length,1);
});
