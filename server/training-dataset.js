import {createHash} from 'node:crypto';
import {trainingPrompt} from './training-context.js';
import {trainingChoiceDecision} from './training-choice.js';
export function buildTrainingDataset(examples,{minExamples=24,minTrials=3}={}){
 const rows=[],seen=new Set();
 for(const e of examples||[]){
  if(!e.modelInput||!e.request||!e.trialId||!e.result||!['interactive_teacher','automatic_teacher','teacher_reviewed_student'].includes(e.source))continue;
  try{trainingChoiceDecision(e.choice);}catch{continue;}
  if(['no_chair','no_food','no_money','blocked_route'].includes(e.scenario)&&e.choice.task!=='stop')continue;
  const row={prompt:trainingPrompt(e.modelInput,e.request),completion:JSON.stringify(e.choice)+'<|im_end|>'},key=createHash('sha256').update(JSON.stringify(row)).digest('hex');
  if(!seen.has(key)){rows.push({...row,trialId:e.trialId,scenario:e.scenario});seen.add(key);}
 }
 const trials=[...new Set(rows.map(r=>r.trialId))].sort(),holdout=new Set(trials.length>=3?trials.slice(-1):[]);
 const clean=({prompt,completion})=>({prompt,completion});const train=rows.filter(r=>!holdout.has(r.trialId)).map(clean),valid=rows.filter(r=>holdout.has(r.trialId)).map(clean);
 const ready=rows.length>=minExamples&&trials.length>=minTrials&&valid.length>0&&train.length>0;
 return {ready,reason:ready?'Verified data is ready for a candidate adapter.':`Collecting verified examples: ${rows.length}/${minExamples}, trials ${trials.length}/${minTrials}.`,examples:rows.length,trials:trials.length,train,valid,hash:createHash('sha256').update(JSON.stringify(rows)).digest('hex'),weightsUpdated:false};
}
export function loraConfig({model,data,adapterPath,iters=40}){
 return {model,train:true,fine_tune_type:'lora',data,adapter_path:adapterPath,num_layers:1,batch_size:1,iters,learning_rate:1e-5,steps_per_report:1,steps_per_eval:10,save_every:10,val_batches:4,max_seq_length:2048,grad_checkpoint:true,mask_prompt:true,lora_parameters:{keys:['self_attn.q_proj','self_attn.v_proj'],rank:4,scale:8,dropout:0}};
}
