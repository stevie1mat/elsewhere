// Vercel forwards authenticated game API traffic to the always-on simulation.
// Provider secrets stay on Render. PRIVATE_SERVER_URL can override the deployed backend.
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  const fail=(status,message)=>{res.statusCode=status;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({error:message}));};
  const path=new URL(req.url,'https://localhost').pathname;
  const methods={'/api/login':'POST','/api/resident':'GET','/api/resident/world':'POST','/api/resident/chat':'POST'};
  if(!methods[path])return fail(404,'Not found');
  if(req.method!==methods[path])return fail(405,'Method not allowed');
  if(req.method==='POST'&&req.headers.origin){
    try{if(new URL(req.headers.origin).host!==req.headers.host)return fail(403,'Origin rejected');}catch{return fail(403,'Origin rejected');}
  }
  let base;
  try{base=new URL(process.env.PRIVATE_SERVER_URL||'https://elsewhere-ocqx.onrender.com');if(base.protocol!=='https:')throw Error();}
  catch{return fail(503,'The hosted game server is not connected. Set PRIVATE_SERVER_URL in Vercel to your Render service URL, then redeploy.');}
  try{
    let body;
    if(req.method==='POST'){
      if(req.body!==undefined)body=typeof req.body==='string'?req.body:JSON.stringify(req.body);
      else{const chunks=[];let size=0;for await(const chunk of req){size+=Buffer.byteLength(chunk);if(size>1500000)return fail(413,'Request too large');chunks.push(Buffer.from(chunk));}body=Buffer.concat(chunks);}
      if(Buffer.byteLength(body)>1500000)return fail(413,'Request too large');
    }
    const response=await fetch(new URL(path,base),{method:req.method,headers:{...(req.headers.cookie?{Cookie:req.headers.cookie}:{}),'Content-Type':'application/json'},body,redirect:'error',signal:AbortSignal.timeout(45000)});
    res.statusCode=response.status;res.setHeader('Content-Type',response.headers.get('content-type')||'application/json');
    if(response.headers.has('retry-after'))res.setHeader('Retry-After',response.headers.get('retry-after'));
    const cookies=response.headers.getSetCookie();if(cookies.length)res.setHeader('Set-Cookie',cookies);
    res.end(Buffer.from(await response.arrayBuffer()));
  }catch{return fail(503,'The game server could not be reached. Please try again shortly.');}
}
