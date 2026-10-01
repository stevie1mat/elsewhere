export function coopEndpoint(){
  const configured=import.meta.env?.VITE_COOP_URL;
  if(configured){try{const url=new URL(configured);if(!['ws:','wss:'].includes(url.protocol)||location.protocol==='https:'&&url.protocol!=='wss:')return '';return url.href;}catch{return '';}}
  return ['localhost','127.0.0.1'].includes(location.hostname)?`ws://${location.hostname}:8787/coop`:'';
}
export class CoopClient {
  constructor({onState,onWelcome,onStatus,onExit,onError}){
    Object.assign(this,{onState,onWelcome,onStatus,onExit,onError});this.active=false;this.connected=false;this.room=null;this.id=null;this.token=null;this.attempt=0;this.state=null;this.socket=null;this.generation=0;
  }
  join(room){
    if(this.active)return;
    this.endpoint=coopEndpoint();if(!this.endpoint){this.onError('Online co-op is not configured on this site yet.');return;}
    this.active=true;this.room=room||null;this.token=null;this.attempt=0;
    try{if(room)this.token=sessionStorage.getItem(`elsewhere:room:${room}`);}catch{}
    this.connect();
  }
  connect(){
    const generation=++this.generation;let rejected=false,duplicate=false,rejectionMessage=null;
    this.onStatus(this.attempt?'Reconnecting…':'Connecting…');
    const ws=this.socket=new WebSocket(this.endpoint);
    const timeout=setTimeout(()=>{if(!this.connected)ws.close();},8000);
    ws.onopen=()=>{if(generation===this.generation)ws.send(JSON.stringify({type:'join',room:this.room,token:this.token}));};
    ws.onmessage=event=>{
      if(generation!==this.generation)return;
      let m;try{m=JSON.parse(event.data);}catch{return;}
      if(m.type==='welcome'){
        clearTimeout(timeout);this.connected=true;this.room=m.room;this.token=m.token;this.id=m.id;this.attempt=0;
        try{sessionStorage.setItem(`elsewhere:room:${this.room}`,this.token);sessionStorage.setItem('elsewhere:last-room',this.room);}catch{}
        this.onWelcome(m);this.onStatus('Connected');
      }else if(m.type==='state'){
        if(!Number.isInteger(m.stage)||m.stage<0||m.stage>3||!Array.isArray(m.players))return;
        this.state=m;this.onState(m);this.onStatus(m.players.length===2?'Two riders connected':'Waiting for your friend…');
      }else if(m.type==='error'){
        if(!this.connected){
          rejected=true;rejectionMessage=m.message;
          duplicate=!!this.token&&(m.code==='RIDER_CONNECTED'||m.message==='This rider is already connected in another tab.');
          this.forgetRoom();
          if(duplicate){this.token=null;return;}
        }
        this.onError(m.message);
      }
    };
    ws.onerror=()=>{};
    ws.onclose=()=>{
      clearTimeout(timeout);if(generation!==this.generation)return;
      this.connected=false;
      if(!this.active)return;
      if(duplicate){this.connect();return;}
      if(!rejected&&this.room&&this.token&&this.attempt<5){this.attempt++;this.onStatus('Connection lost · reconnecting…');this.retry=setTimeout(()=>this.connect(),Math.min(1000*this.attempt,5000));}
      else {this.active=false;this.state=null;this.forgetRoom();this.onExit();this.onStatus(rejectionMessage||'Offline');if(!rejected)this.onError('Could not reach the co-op server. Your solo game is available.');}
    };
  }
  send(message){if(this.connected&&this.socket.readyState===WebSocket.OPEN)this.socket.send(JSON.stringify(message));}
  position(p){this.send({type:'position',position:{x:p.x,z:p.z,yaw:p.yaw,walked:p.walked,speed:p.speed}});}
  advance(stage,stop){this.send({type:'advance',stage,stop});}
  forgetRoom(){
    try{if(this.room)sessionStorage.removeItem(`elsewhere:room:${this.room}`);if(sessionStorage.getItem('elsewhere:last-room')===this.room)sessionStorage.removeItem('elsewhere:last-room');}catch{}
  }
  leave(){
    this.send({type:'leave'});this.active=false;this.connected=false;++this.generation;clearTimeout(this.retry);this.socket?.close();this.state=null;
    this.forgetRoom();
    this.room=this.id=this.token=null;this.onExit();this.onStatus('Solo ride');
  }
}
