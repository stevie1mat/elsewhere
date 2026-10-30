export function createSupabaseStore({url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY,id=process.env.RESIDENT_ID||'porto-main',fetchImpl=fetch}={}){
  const configured=!!(url&&key);
  if(configured){const parsed=new URL(url);if(parsed.protocol!=='https:')throw Error('SUPABASE_URL must use HTTPS.');}
  const headers={apikey:key,...(key?.startsWith('eyJ')?{Authorization:`Bearer ${key}`}:{ }),'Content-Type':'application/json'};
  async function request(path,options={}){
    let response;
    try{response=await fetchImpl(new URL('/rest/v1/'+path,url),{...options,headers,signal:AbortSignal.timeout(12000)});}
    catch{throw Error('Supabase connection unavailable; local save retained.');}
    if(!response.ok)throw Error(`Supabase storage returned ${response.status}. Check server credentials and resident tables.`);
    return response;
  }
  return {configured,id,async load(){
    const response=await request(`resident_saves?id=eq.${encodeURIComponent(id)}&select=checkpoint,saved_at&limit=1`);
    const rows=await response.json();if(!Array.isArray(rows))throw Error('Invalid Supabase save response.');
    if(!rows.length)return null;
    const state=rows[0].checkpoint;
    if(state?.version!==1||!Number.isFinite(state.player?.x)||!Number.isFinite(state.player?.z)||!state.arrival||!Array.isArray(state.events)||!Array.isArray(state.route))throw Error('Invalid Supabase checkpoint; refusing to reset the resident.');
    return state;
  },async save(state){await request('rpc/save_resident',{method:'POST',body:JSON.stringify({p_id:id,p_checkpoint:state})});}};
}
