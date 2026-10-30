import test from 'node:test';
import assert from 'node:assert/strict';
import {aiTelemetryCsv} from '../src/ai-csv.js';
const attempt={at:1000,provider:'Groq',model:'test',status:'success',httpStatus:200,latencyMs:125,usage:{input:12,output:3,total:15}};
const ai={connected:true,provider:'Groq',telemetry:{startedAt:0,requests:8,input:100,output:20,total:120,usageReported:8,recent:[attempt],lastExchange:{...attempt,sent:{messages:['hello, "world"\nnext line']},received:{content:'rest'}}},providerHealth:[{provider:'Mistral',status:'unavailable',error:'=SUM(1,2)',retryAt:2000}]};
test('CSV includes actual token usage, cumulative totals, errors and ISO timestamps',()=>{
 const csv=aiTelemetryCsv(ai,{now:3000});assert.ok(csv.startsWith('\ufeff'));assert.match(csv,/'=SUM\(1,2\)/);assert.match(csv,/1970-01-01T00:00:01.000Z/);assert.match(csv,/"125","12","3","15"/);assert.match(csv,/"summary"/);assert.match(csv,/"request_attempt"/);assert.match(csv,/"provider_health"/);assert.ok(csv.includes('"8","100","20","120","8"'));assert.ok(csv.endsWith('\r\n'));
});
test('payload checkbox excludes sent messages and response content without losing usage',()=>{
 const full=aiTelemetryCsv(ai,{now:3000}),metrics=aiTelemetryCsv(ai,{includePayloads:false,now:3000});
 assert.match(full,/world/);assert.ok(!metrics.includes('world'));assert.ok(!metrics.includes('rest'));assert.match(metrics,/"125","12","3","15"/);
});
test('unreported tokens remain blank and text values escape quotes and newlines',()=>{
 const csv=aiTelemetryCsv({telemetry:{recent:[{...attempt,usage:null,error:'first, "quoted"\nsecond'}]}},{now:3000});
 assert.match(csv,/"125","","",""/);assert.match(csv,/"first, ""quoted""\nsecond"/);
});
