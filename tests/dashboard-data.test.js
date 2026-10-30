import test from 'node:test';import assert from 'node:assert/strict';
import {dashboardModel,escapeHtml,researchSnapshot} from '../src/dashboard-data.js';
test('dashboard derives real history without mutating saves or generating missing data',()=>{
 const s={paused:true,player:{x:25,z:-78},arrival:{phase:'landed'},needs:{energy:50},ai:{enabled:true,connected:false,telemetry:{total:120,recent:[]}},events:[{at:100,message:'A real event'}],outcomes:[{at:200,activity:'rest',place:'Bench',reward:.1,moneyChange:0}],worldRequests:[{name:'Resident request'},{name:'Developer inventory',source:'action capability check'}]};
 const before=JSON.stringify(s),m=dashboardModel(s,1000);assert.equal(JSON.stringify(s),before);assert.equal(m.events[0].at,200);assert.equal(m.progress.history.length,1);assert.equal(m.progress.score,55);assert.equal(m.latency,null);assert.equal(m.requests.length,1);assert.equal(m.status.text,'Paused · AI stopped');
 assert.equal(dashboardModel({},1000).progress.score,null);assert.equal(dashboardModel({},1000).activity,'idle');assert.deepEqual(dashboardModel({},1000).events,[]);
});
test('dynamic HTML is escaped and research exports identify simulation evidence',()=>{
 assert.equal(escapeHtml('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
 const snapshot=researchSnapshot({thought:'a saved thought'},1000);assert.equal(snapshot.exportedAt,'1970-01-01T00:00:01.000Z');assert.match(snapshot.note,/Not model weights/);assert.equal(snapshot.resident.thought,'a saved thought');
});
