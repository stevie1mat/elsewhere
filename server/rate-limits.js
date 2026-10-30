function duration(text){let total=0,found=false;for(const m of String(text||'').matchAll(/([\d.]+)\s*(ms|h|m|s)/g)){found=true;total+=Number(m[1])*({ms:1,s:1000,m:60000,h:3600000}[m[2]]);}return found?Math.ceil(total):null;}
export function rateLimitDetails(message='',headers){
 const retry=headers?.get('retry-after');let retryMs=retry?(Number.isFinite(Number(retry))?Number(retry)*1000:Date.parse(retry)-Date.now()):null;
 const stated=duration(message.match(/try again in\s+([\d.hms\s]+)/i)?.[1]);if(stated)retryMs=Math.max(retryMs||0,stated);
 const match=message.match(/on (tokens per (?:day|minute)|requests per (?:day|minute))[^:]*:\s*Limit\s+([\d,]+),\s*Used\s+([\d,.]+),\s*Requested\s+([\d,]+)/i);
 return {retryMs:Number.isFinite(retryMs)&&retryMs>0?retryMs:60000,...(match?{kind:match[1],limit:Number(match[2].replaceAll(',','')),used:Number(match[3].replaceAll(',','')),requested:Number(match[4].replaceAll(',',''))}:{})};
}
