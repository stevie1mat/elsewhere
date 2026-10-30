import {execFileSync} from 'node:child_process';

export function parseSwapMB(text){
 const match=/used\s*=\s*([\d.]+)([MGT])/.exec(text);
 if(!match)throw Error('Cannot read Mac swap usage.');
 return Number(match[1])*({M:1,G:1024,T:1048576}[match[2]]);
}
export function readMemory(){
 if(process.platform!=='darwin')throw Error('The Mac worker requires macOS memory monitoring.');
 const read=key=>execFileSync('/usr/sbin/sysctl',['-n',key],{encoding:'utf8',timeout:3000});
 return {swapMB:parseSwapMB(read('vm.swapusage')),pressure:Number(read('kern.memorystatus_vm_pressure_level'))};
}
export function memoryIssue(current,baseline){
 if(current.pressure!==1)return 'macOS memory pressure is elevated';
 if(current.swapMB>baseline.swapMB+32)return 'swap usage increased by more than 32 MB';
 return null;
}
// Keep the original swap baseline: recovery must not silently accept more swap.
export function createMemoryRecovery({baseline,now=()=>Date.now(),stableMs=60000}={}){
 let waiting=false,stableSince=null,resumeAfter=0,trips=0,reason=null;
 return {get waiting(){return waiting;},get reason(){return reason;},sample(current){
  const issue=current?memoryIssue(current,baseline):'memory monitoring failed';
  if(issue){stableSince=null;reason=issue;if(waiting)return null;
   waiting=true;trips++;resumeAfter=now()+Math.min(600000,stableMs*2**Math.min(trips-1,4));return 'pause';
  }
  if(!waiting)return null;
  stableSince??=now();
  if(now()-stableSince<stableMs||now()<resumeAfter)return null;
  waiting=false;reason=null;stableSince=null;return 'resume';
 }};
}
