import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { WebSocketServer,WebSocket } from 'ws';
import { Rooms } from './rooms.js';

export function createCoopServer({origins=[],rooms=new Rooms()}={}){
  const http=createServer((req,res)=>{res.writeHead(req.url==='/health'?200:404,{'Content-Type':'application/json'});res.end(JSON.stringify(req.url==='/health'?{ok:true}:{error:'Not found'}));});
  const wss=new WebSocketServer({noServer:true,maxPayload:4096,perMessageDeflate:false});
  http.on('upgrade',(req,socket,head)=>{
    if(req.url!=='/coop'||(origins.length&&!origins.includes(req.headers.origin))||wss.clients.size>=250){socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');socket.destroy();return;}
    wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws));
  });
  const send=(ws,data)=>{if(ws.readyState===WebSocket.OPEN&&ws.bufferedAmount<65536)ws.send(JSON.stringify(data));};
  const broadcast=r=>{const state=rooms.snapshot(r);for(const p of r.players.values())if(p.peer)send(p.peer,state);};
  wss.on('connection',ws=>{
    let membership=null,windowStart=Date.now(),count=0,alive=true;
    const joinTimeout=setTimeout(()=>{if(!membership)ws.close(1008,'Join timeout');},10000);joinTimeout.unref();
    ws.on('pong',()=>{alive=true;});ws.isAlive=()=>alive;ws.markPing=()=>{alive=false;};
    ws.on('error',()=>{});
    ws.on('message',(data,binary)=>{
      if(Date.now()-windowStart>1000){windowStart=Date.now();count=0;}
      if(++count>40){ws.close(1008,'Too many messages');return;}
      try{
        if(binary)throw Error('Text messages required.');
        const m=JSON.parse(data.toString());if(!m||typeof m!=='object')throw Error('Invalid message.');
        if(m.type==='join'&&!membership){
          if(m.room!=null&&!/^[a-f0-9]{16}$/.test(m.room))throw Error('Enter the 16-character room code from your friend.');
          membership=rooms.join(m.room,m.token,ws);clearTimeout(joinTimeout);
          send(ws,{type:'welcome',id:membership.player.id,token:membership.player.token,room:membership.room.code,position:membership.player.position});broadcast(membership.room);return;
        }
        if(!membership)throw Error('Join a room first.');
        const {room,player}=membership;
        if(m.type==='position'){if(rooms.position(room,player,m.position))broadcast(room);}
        else if(m.type==='advance'){rooms.advance(room,player,m);broadcast(room);}
        else if(m.type==='leave'){rooms.disconnect(room,player,true);membership=null;broadcast(room);ws.close(1000,'Left room');}
      }catch(error){send(ws,{type:'error',message:error.message,code:error.code});if(!membership)ws.close(1008,'Join failed');}
    });
    ws.on('close',()=>{clearTimeout(joinTimeout);if(membership){rooms.disconnect(membership.room,membership.player);broadcast(membership.room);}});
  });
  const heartbeat=setInterval(()=>{rooms.sweep();for(const ws of wss.clients){if(!ws.isAlive())ws.terminate();else{ws.markPing();ws.ping();}}},15000);heartbeat.unref();
  return {http,rooms,close:async()=>{clearInterval(heartbeat);for(const ws of wss.clients)ws.terminate();await new Promise(resolve=>wss.close(resolve));await new Promise(resolve=>http.close(resolve));}};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const origins=(process.env.ALLOWED_ORIGINS||'').split(',').map(s=>s.trim()).filter(Boolean);
  const server=createCoopServer({origins});const port=Number(process.env.PORT||8787);
  server.http.listen(port,process.env.HOST||'127.0.0.1',()=>console.log(`Co-op server listening on port ${port}`));
  for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>server.close().then(()=>process.exit(0)));
}
