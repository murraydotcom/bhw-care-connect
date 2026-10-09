import assert from 'node:assert/strict';
import test from 'node:test';
import crypto from 'node:crypto';
import {createPatientMessagesHandler} from '../netlify/functions/patient-messages.mjs';
import {createMessagesClient} from '../patient/messages-client.mjs';
import {readMessageFiles,downloadMessageFile} from '../patient/message-attachments.mjs';
const SECRET='synthetic-session-secret';
const claims={kind:'patient',patientAuthVersion:2,bhwPatientId:'BHW0000',schemaVersion:'bhw.patient-portal-access.v1',accessType:'self',proxyAccessAllowed:false,pilotCohort:'primary-care-adult-v1',programs:['primary'],portalAccessStatus:'active',preferredChannel:'email',verifiedChannel:'email',contactVerifiedAt:new Date().toISOString(),consentedAt:new Date().toISOString(),portalInvitedAt:new Date().toISOString(),authorizationUpdatedAt:new Date().toISOString(),exp:Date.now()+300000};
const token=(extra={})=>{const p=Buffer.from(JSON.stringify({...claims,...extra})).toString('base64url');return p+'.'+crypto.createHmac('sha256',SECRET).update(p).digest('base64url');};
const env={SESSION_SECRET:SECRET,CARE_CONNECT_PATIENT_TOKEN_SECRET:'synthetic-upstream-secret',HEALTH_CORE_API_URL:'https://health.example.test',SYNTHETIC_PORTAL_MESSAGING_ENABLED:'true'};
const command={action:'compose',commandId:crypto.randomUUID(),subject:'Synthetic test',body:'Hello',topic:'general',nonUrgentAcknowledged:true};
const req=(body,auth=token(),query='')=>new Request('https://care.example.test/api/patient-portal/messages'+query,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+auth,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
test('authenticated bridge binds patient identity and forwards a short-lived token without returning it',async()=>{let observed;const handle=createPatientMessagesHandler({environment:env,fetchImpl:async(url,options)=>{observed={url,options};return Response.json({ok:true,thread:{id:'synthetic'},commandId:command.commandId});}});
 const r=await handle(req({...command,bhwPatientId:'BHW1234',role:'provider'}));assert.equal(r.status,200);assert.equal(observed.url,'https://health.example.test/v1/patient-portal/BHW0000/messages');const c=JSON.parse(Buffer.from(observed.options.headers.Authorization.slice(7).split('.')[0],'base64url').toString());assert.equal(c.bhwPatientId,'BHW0000');assert.equal(c.exp-c.iat,60);assert.equal(c.role,'patient-portal');assert.equal('token' in await r.json(),false);assert.equal(r.headers.get('cache-control'),'no-store, private');assert.equal(observed.options.redirect,'error');});
test('bridge fails closed for missing/expired/real sessions, bad references and disabled configuration',async()=>{let calls=0;const fetchImpl=async()=>{calls++;return Response.json({ok:true});};let handle=createPatientMessagesHandler({environment:env,fetchImpl});for(const auth of ['',token({exp:1}),token({proxyAccessAllowed:true})])assert.equal((await handle(req(null,auth))).status,401);assert.equal((await handle(req(null,token({bhwPatientId:'BHW1234'})))).status,403);assert.equal((await handle(req(null,token(),'?threadId=../BHW1234'))).status,400);
 handle=createPatientMessagesHandler({environment:{...env,SYNTHETIC_PORTAL_MESSAGING_ENABLED:'false'},fetchImpl});assert.equal((await handle(req())).status,503);assert.equal(calls,0);});
test('bridge preserves conflict/permission failures and marks uncertain writes for safe retry',async()=>{for(const status of [401,403,409,429]){const handle=createPatientMessagesHandler({environment:env,fetchImpl:async()=>Response.json({ok:false,error:'Synthetic rejection'},{status})});assert.equal((await handle(req(command))).status,status);}
 const uncertain=createPatientMessagesHandler({environment:env,fetchImpl:async()=>{throw Error('timeout');}});assert.equal((await (await uncertain(req(command))).json()).saveUnconfirmed,true);
 const missing=createPatientMessagesHandler({environment:env,fetchImpl:async()=>Response.json({ok:true})});assert.equal((await missing(req(command))).status,502);
});
test('patient client checks command receipt and preserves command identity across retries',async()=>{const bodies=[];let attempt=0;const client=createMessagesClient({getToken:()=>token(),fetchImpl:async(url,options)=>{bodies.push(options.body);if(!attempt++)return Response.json({ok:false,saveUnconfirmed:true,error:'Retry'},{status:502});return Response.json({ok:true,commandId:command.commandId,thread:{}});}});await assert.rejects(client({command}),e=>e.saveUnconfirmed===true);await client({command});assert.equal(bodies[0],bodies[1]);
 const noReceipt=createMessagesClient({getToken:()=>token(),fetchImpl:async()=>Response.json({ok:true})});await assert.rejects(noReceipt({command}),e=>e.saveUnconfirmed===true);
});
test('patient file downloads stay authenticated and private and reject corrupt upstream bytes',async()=>{
 const bytes=Buffer.from('BHW0000 synthetic download');const file={id:'att-'+'a'.repeat(40),name:'synthetic.txt',size:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),contentBase64:bytes.toString('base64')};const query='?threadId=msg-'+'b'.repeat(40)+'&attachmentId='+file.id;let calls=0;
 const handle=createPatientMessagesHandler({environment:env,fetchImpl:async(url)=>{calls++;assert(url.endsWith(query));return Response.json({ok:true,attachment:file});}});
 const r=await handle(req(null,token(),query));assert.equal(r.status,200);assert.equal(r.headers.get('content-type'),'application/octet-stream');assert.equal(r.headers.get('content-disposition'),'attachment; filename="synthetic.txt"');assert.equal(r.headers.get('cache-control'),'no-store, private');assert.equal(Buffer.from(await r.arrayBuffer()).equals(bytes),true);
 assert.equal((await handle(req(null,'',query))).status,401);assert.equal((await handle(req(null,token(),'?attachmentId='+file.id))).status,400);assert.equal(calls,1);
 const broken=createPatientMessagesHandler({environment:env,fetchImpl:async()=>Response.json({ok:true,attachment:{...file,contentBase64:Buffer.from('altered').toString('base64')}})});assert.equal((await broken(req(null,token(),query))).status,502);
 const rejected=createPatientMessagesHandler({environment:env,fetchImpl:async()=>Response.json({ok:false,error:'A file failed security checks.'},{status:422})});assert.equal((await rejected(req(command))).status,422);
});
test('browser file preparation is bounded and stale or altered downloads never invoke a save',async()=>{
 const files=await readMessageFiles([new File(['Synthetic file'],'synthetic.txt',{type:'text/plain'})]);assert.equal(files[0].contentBase64,Buffer.from('Synthetic file').toString('base64'));
 await assert.rejects(readMessageFiles([new File(['x'],'synthetic.html',{type:'text/html'})]));await assert.rejects(readMessageFiles(Array.from({length:4},()=>new File(['x'],'synthetic.txt'))));await assert.rejects(readMessageFiles([new File(['x'.repeat(512*1024+1)],'synthetic.txt')]));
 const blob=new Blob(['Synthetic file']);const metadata={id:'att-'+'a'.repeat(40),name:'synthetic.txt',size:blob.size,sha256:crypto.createHash('sha256').update('Synthetic file').digest('hex')};
 const api=async()=>({blob});await downloadMessageFile({api,threadId:'msg-'+'b'.repeat(40),file:metadata,isCurrent:()=>false});
 await assert.rejects(downloadMessageFile({api,file:{...metadata,sha256:'0'.repeat(64)},isCurrent:()=>false}),/verified/);
 const client=createMessagesClient({getToken:()=>token(),fetchImpl:async()=>new Response(blob,{headers:{'Content-Type':'application/octet-stream'}})});assert.equal((await client({query:{attachmentId:metadata.id},download:true})).blob.size,blob.size);
});
