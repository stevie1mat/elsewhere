// Local inference can exceed a hosting proxy timeout. Poll one accepted job,
// rather than resubmitting the chat and restarting its task.
export async function residentChatRequest(message,onWait=()=>{}){
 const response=await fetch('/api/resident/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message})});if(response.status!==202)return response;
 const {jobId}=await response.json();const deadline=Date.now()+360000;
 while(Date.now()<deadline){onWait();await new Promise(r=>setTimeout(r,1000));const r=await fetch('/api/resident',{cache:'no-store'});if(!r.ok)return r;const s=await r.json(),job=s.ai?.chatTask;if(s.paused)return Response.json({error:'Game paused. Resume to chat.'},{status:409});if(job?.id!==jobId)return Response.json({error:'Local chat was cancelled or the server restarted. Please retry.'},{status:409});if(job.status==='complete')return Response.json({reply:job.reply});if(job.status==='error')return Response.json({error:job.error,retryAfterMs:job.retryAfterMs},{status:503});
 }
 return Response.json({error:'Local model took too long. Check the Mac worker.'},{status:503});
}
