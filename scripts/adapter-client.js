import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
import {createLocalClient} from '../server/local-client.js';
export function createAdapterClient({root,manifest}){return createLocalClient({fetchImpl:async(_url,options)=>{
 const body=JSON.parse(options.body);const result=await new Promise((ok,fail)=>{const child=spawn(resolve(root,'.venv-training/bin/python'),[resolve(root,'scripts/comparison-inference.py'),manifest.baseModel,manifest.adapterPath],{cwd:root,stdio:['pipe','pipe','pipe'],signal:options.signal,timeout:120000});let out='',error='';child.stdout.on('data',chunk=>{out+=chunk;if(out.length>1000000){child.kill('SIGTERM');fail(Error('Adapter response exceeded its size limit.'));}});child.stderr.on('data',chunk=>error=(error+chunk).slice(-200));child.stdin.on('error',fail);child.once('error',fail);child.once('close',code=>{if(code!==0)return fail(Error('Adapter inference failed: '+error));try{const response=out.trim().split('\n').map(line=>JSON.parse(line)).findLast(x=>x.text!==undefined||x.error);if(response?.error)throw Error(response.error);if(typeof response?.text!=='string')throw Error('Adapter returned no decision.');ok(response.text);}catch(e){fail(e);}});child.stdin.end(JSON.stringify({prompt:body.prompt,seed:0,max_tokens:body.max_tokens})+'\n');});
 return Response.json({choices:[{finish_reason:'stop',text:result}]});
 }});}
