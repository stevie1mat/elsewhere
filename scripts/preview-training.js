// Frontend-only preview: reuse the hosted API, never start a second saved life.
import {createServer} from 'node:http';
import {readFileSync,statSync,existsSync} from 'node:fs';
import {resolve,extname,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import proxy from '../server/vercel-proxy.js';
const dist=resolve(dirname(fileURLToPath(import.meta.url)),'../dist'),port=Number(process.env.TRAINING_PREVIEW_PORT||8899);
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.gltf':'model/gltf+json','.glb':'model/gltf-binary','.bin':'application/octet-stream','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.ico':'image/x-icon'};
const server=createServer(async(req,res)=>{
 try{const url=new URL(req.url,'http://127.0.0.1');if(url.pathname.startsWith('/api/')){await proxy(req,res);return;}
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
  const path=resolve(dist,'.'+decodeURIComponent(['/','/training','/training/','/dashboard','/dashboard/'].includes(url.pathname)?'/index.html':url.pathname));
  if(!path.startsWith(dist+'/')||!existsSync(path)||!statSync(path).isFile()){res.writeHead(404);res.end('Not found');return;}
  res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream','Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:readFileSync(path));
 }catch{res.writeHead(500);res.end('Preview unavailable.');}
});
server.listen(port,'127.0.0.1',()=>process.stdout.write(`Training ground: http://127.0.0.1:${port}/training\nUses the existing hosted game API. No local simulation or fixture model.\n`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
