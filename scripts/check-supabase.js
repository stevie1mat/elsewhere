import {createSupabaseStore} from '../server/supabase-store.js';
process.loadEnvFile(new URL('../.env',import.meta.url));
try{const store=createSupabaseStore();const state=await store.load();console.log(JSON.stringify({connected:true,hasSavedLife:!!state,phase:state?.arrival?.phase}));}catch(error){console.error(error.message);process.exitCode=1;}
