import { verifyCareConnectPatientSession, signHealthCorePatientToken } from './_shared/patient-session.mjs';
import { asLambdaHandler } from './_shared/lambda-adapter.mjs';
import crypto from 'node:crypto';
const MAX_REQUEST=2_150_000, MAX_FILE=512*1024;
async function limitedText(request){const reader=request.body?.getReader();if(!reader)return '';let size=0;const chunks=[];try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_REQUEST){await reader.cancel();throw Object.assign(Error('Too large'),{status:413});}chunks.push(Buffer.from(value));}return Buffer.concat(chunks).toString('utf8');}finally{reader.releaseLock();}}
function download(file){
  if(!file || !/^att-[a-f0-9]{40}$/.test(file.id) || !/^[a-z0-9][a-z0-9 _().-]{0,99}$/i.test(file.name) || file.name.includes('..') || !Number.isSafeInteger(file.size) || file.size<1 || file.size>MAX_FILE
    || typeof file.contentBase64!=='string' || file.contentBase64.length>Math.ceil(MAX_FILE/3)*4)throw Error('Invalid download');
  const bytes=Buffer.from(file.contentBase64,'base64');
  if(bytes.length!==file.size || bytes.toString('base64')!==file.contentBase64 || crypto.createHash('sha256').update(bytes).digest('hex')!==file.sha256)throw Error('Invalid download');
  return new Response(bytes,{headers:{'Content-Type':'application/octet-stream','Content-Disposition':`attachment; filename="${file.name}"`,'Cache-Control':'no-store, private','X-Content-Type-Options':'nosniff','Content-Security-Policy':"sandbox; default-src 'none'"}});
}
const json = (status, body) => new Response(JSON.stringify(body), {status,headers:{'Content-Type':'application/json','Cache-Control':'no-store, private','X-Content-Type-Options':'nosniff'}});
const environment = () => Object.fromEntries(['SESSION_SECRET','CARE_CONNECT_PATIENT_TOKEN_SECRET','HEALTH_CORE_API_URL','SYNTHETIC_PORTAL_MESSAGING_ENABLED'].map(k=>[k,globalThis.Netlify?.env?.get?.(k)||process.env[k]]));
export function createPatientMessagesHandler({ environment:configuration=environment, fetchImpl=fetch, now=Date.now }={}) {
  return async request => {
    if (!['GET','POST'].includes(request.method)) return json(405,{ok:false,error:'GET or POST only.'});
    const env=typeof configuration==='function'?configuration():configuration;
    const token=(request.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
    const session=verifyCareConnectPatientSession(token,env.SESSION_SECRET,now());
    if (!session) return json(401,{ok:false,error:'Please sign in again.'});
    if (session.bhwPatientId!=='BHW0000') return json(403,{ok:false,error:'Real-patient messaging is disabled.'});
    if (env.SYNTHETIC_PORTAL_MESSAGING_ENABLED!=='true') return json(503,{ok:false,error:'Messaging is not enabled. Please call the office.'});
    let base;
    try { base=new URL(env.HEALTH_CORE_API_URL); if (base.protocol!=='https:'||base.username||base.password||base.search||base.hash) throw Error(); }
    catch { return json(503,{ok:false,error:'Messaging is unavailable. Please call the office.'}); }
    const url=new URL(request.url);
    const query=new URLSearchParams();
    for (const key of ['threadId','before']) { const value=url.searchParams.get(key); if(value) { if(!/^msg-[a-f0-9]{40}$/.test(value)) return json(400,{ok:false,error:'Invalid conversation reference.'}); query.set(key,value); } }
    const attachmentId=url.searchParams.get('attachmentId');
    if(attachmentId){if(request.method!=='GET' || !query.has('threadId') || !/^att-[a-f0-9]{40}$/.test(attachmentId))return json(400,{ok:false,error:'Invalid file reference.'});query.set('attachmentId',attachmentId);}
    try {
      const raw=request.method==='POST'?await limitedText(request):undefined;
      const upstreamToken=signHealthCorePatientToken(session,env.CARE_CONNECT_PATIENT_TOKEN_SECRET,now());
      const response=await fetchImpl(`${base.href.replace(/\/$/,'')}/v1/patient-portal/BHW0000/messages${query.size?'?'+query:''}`,{
        method:request.method,headers:{Authorization:`Bearer ${upstreamToken}`,Accept:'application/json',...(raw?{'Content-Type':'application/json'}:{})},
        body:raw,redirect:'error',signal:AbortSignal.timeout(8000)});
      const data=await response.json().catch(()=>null);
      if (!data || typeof data.ok!=='boolean' || (response.ok && data.ok!==true)) return json(502,{ok:false,saveUnconfirmed:request.method==='POST',error:'Save could not be confirmed. Retry the same submission.'});
      if (!response.ok) return json([400,401,403,404,409,413,422,429,503].includes(response.status)?response.status:502,{ok:false,error:response.status<500?data.error:'Messaging is unavailable. Please call the office.'});
      if(attachmentId){if(data.attachment?.id!==attachmentId)throw Error('Invalid file reference');return download(data.attachment);}
      if(request.method==='POST') { let command;try{command=JSON.parse(raw);}catch{return json(400,{ok:false,error:'Invalid message request.'});}
        if(command.action!=='preferences' && data.commandId!==command.commandId) return json(502,{ok:false,saveUnconfirmed:true,error:'Save could not be confirmed. Retry the same submission.'}); }
      return json(200,data);
    } catch(error) { if(error.status===413)return json(413,{ok:false,error:'Message request is too large.'});return json(502,{ok:false,saveUnconfirmed:request.method==='POST',error:request.method==='POST'?'Save could not be confirmed. Retry the same submission, or refresh your inbox before composing again.':'Messages could not be loaded. Please try again.'}); }
  };
}
const handle=createPatientMessagesHandler();
export default handle;
export const handler=asLambdaHandler(handle);
export const config={path:'/api/patient-portal/messages'};
