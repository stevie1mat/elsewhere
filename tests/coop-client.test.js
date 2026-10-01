import test from 'node:test';
import assert from 'node:assert/strict';
import { CoopClient } from '../src/coop.js';

function setup(t){
  const saved=new Map([['elsewhere:last-room','0123456789abcdef'],['elsewhere:room:0123456789abcdef','copied-token']]);
  const sockets=[],errors=[],statuses=[];let exits=0;
  class Socket {
    static OPEN=1;
    constructor(){this.readyState=1;sockets.push(this);}
    send(raw){this.sent=JSON.parse(raw);}
    close(){this.onclose?.();}
    message(value){this.onmessage({data:JSON.stringify(value)});}
  }
  for(const [key,value] of Object.entries({WebSocket:Socket,location:{hostname:'localhost',protocol:'http:'},sessionStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)}})){
    const descriptor=Object.getOwnPropertyDescriptor(globalThis,key);
    Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});
    t.after(()=>descriptor?Object.defineProperty(globalThis,key,descriptor):delete globalThis[key]);
  }
  const client=new CoopClient({onState(){},onWelcome(){},onStatus:s=>statuses.push(s),onExit(){exits++;},onError:e=>errors.push(e)});
  t.after(()=>client.leave());
  return {client,sockets,saved,errors,statuses,get exits(){return exits;}};
}

test('a copied active rider session retries once as a new rider',t=>{
  const {client,sockets,saved,errors}=setup(t);
  client.join('0123456789abcdef');sockets[0].onopen();
  assert.equal(sockets[0].sent.token,'copied-token');
  sockets[0].message({type:'error',code:'RIDER_CONNECTED',message:'This rider is already connected in another tab.'});
  sockets[0].close();
  assert.equal(sockets.length,2);sockets[1].onopen();
  assert.equal(sockets[1].sent.token,null);
  assert.equal(sockets[1].sent.room,'0123456789abcdef');
  assert.deepEqual(errors,[]);
  sockets[1].message({type:'welcome',room:'0123456789abcdef',token:'new-token',id:'new-rider'});
  assert.equal(client.connected,true);
  assert.equal(saved.get('elsewhere:room:0123456789abcdef'),'new-token');
});

test('a full room after a duplicate session clears saved entry and stops retrying',t=>{
  const state=setup(t),{client,sockets,saved,errors,statuses}=state;
  client.join('0123456789abcdef');
  sockets[0].message({type:'error',code:'RIDER_CONNECTED',message:'Already connected'});sockets[0].close();
  sockets[1].message({type:'error',message:'This room already has two riders.'});sockets[1].close();
  assert.equal(sockets.length,2);assert.equal(client.active,false);assert.equal(state.exits,1);
  assert.equal(saved.size,0);assert.deepEqual(errors,['This room already has two riders.']);
  assert.equal(statuses.at(-1),'This room already has two riders.');
});

test('expired saved rooms are cleared and normal reconnects keep the rider identity',t=>{
  const {client,sockets,saved}=setup(t);
  client.join('0123456789abcdef');sockets[0].onopen();
  assert.equal(sockets[0].sent.token,'copied-token');
  sockets[0].message({type:'error',message:'Room not found or expired.'});sockets[0].close();
  assert.equal(saved.size,0);assert.equal(client.active,false);
});
