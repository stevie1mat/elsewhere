import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createGroqClient,createMistralClient,createResilientClient,residentContext} from '../server/groq.js';
import {createResident} from '../server/resident.js';
const env=fileURLToPath(new URL('../.env',import.meta.url));if(existsSync(env))process.loadEnvFile(env);
const client=process.argv.includes('--mistral')?createMistralClient():process.argv.includes('--fallback')?createResilientClient():createGroqClient();
try{
  if(process.argv.includes('--models')){
    const response=await fetch('https://api.groq.com/openai/v1/models',{headers:{Authorization:`Bearer ${process.env.GROQ_API_KEY}`},signal:AbortSignal.timeout(15000)});
    const data=await response.json();console.log(JSON.stringify({status:response.status,models:data.data?.map(m=>m.id),errorType:data.error?.type,errorCode:data.error?.code}));
    process.exit(response.ok?0:1);
  }
  const state=createResident();state.arrival.phase='landed';
  const decision=await client.complete(residentContext(state),'Choose your first autonomous activity.');
  console.log(JSON.stringify({connected:true,provider:client.provider,model:client.model,action:decision.action,destination:decision.destination,intention:decision.intention}));
}catch(error){console.error(error.message);process.exitCode=1;}
