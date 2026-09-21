import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createCareCardRequestsHandler } from '../netlify/functions/_shared/care-card-requests.mjs';
const secret='synthetic-only-card-test', now=Date.now();
function token(overrides={}) {
 const date=new Date(now).toISOString();
 const p=Buffer.from(JSON.stringify({kind:'patient',patientAuthVersion:2,bhwPatientId:'BHW0000',exp:now+60000,schemaVersion:'bhw.patient-portal-access.v1',accessType:'self',proxyAccessAllowed:false,pilotCohort:'primary-care-adult-v1',programs:['primary'],portalAccessStatus:'active',preferredChannel:'email',verifiedChannel:'email',contactVerifiedAt:date,consentedAt:date,portalInvitedAt:date,authorizationUpdatedAt:date,...overrides})).toString('base64url');
 return p+'.'+crypto.createHmac('sha256',secret).update(p).digest('base64url');
}
const body={type:'refill',medication:'Synthetic medicine',message:'Please review',bhwPatientId:'BHW9999'};
function request(value=body,session=token(),key='synthetic-request-0001') { return new Request('https://synthetic.test/api/patient-portal/medication-requests',{method:'POST',headers:{Authorization:'Bearer '+session,'Idempotency-Key':key},body:JSON.stringify(value)}); }
function handler(options={}) { return createCareCardRequestsHandler({secret:()=>secret,configured:()=>true,dashboard:async()=>Response.json({ok:true}),queue:async()=>({patientRequest:{patientRequestId:'REQ-SYNTHETIC'}}),now:()=>now,...options}); }
test('patient identity comes from verified session and all five choices reach clinical review',async()=>{
 for(const type of ['refill','pharmacy','question','side','change']){
  let sent;
  const r=await handler({queue:async value=>{sent=value;return {patientRequest:{patientRequestId:'REQ-SYNTHETIC'}};}})(request({...body,type}));
  assert.equal(r.status,200);assert.equal(sent.body.bhwPatientId,'BHW0000');assert.equal(sent.body.requestType,'medication');assert.equal(sent.body.routing.targetSystem,'crewos');assert.equal(sent.body.manualNotifyOnly,true);assert.equal(sent.body.notificationMode,'none');assert.equal(sent.body.priority,type==='side'?'urgent':'high');
 }
});
test('invalid, expired, unlinked and inactive sessions cannot write',async()=>{
 let writes=0;
 const h=handler({queue:async()=>{writes++;}});
 for(const session of ['forged',token({exp:now-1}),token({bhwPatientId:''}),token({portalAccessStatus:'inactive'}),token({kind:'staff'})])assert.equal((await h(request(body,session))).status,401);
 assert.equal(writes,0);
});
test('current access revocation blocks a previously signed session',async()=>{
 let writes=0;
 const r=await handler({dashboard:async()=>Response.json({error:'revoked'},{status:403}),queue:async()=>writes++})(request());
 assert.equal(r.status,403);assert.equal(writes,0);
});
test('ambiguous retries keep a patient-scoped idempotency key',async()=>{
 const keys=[];const h=handler({queue:async v=>{keys.push(v.submissionId);return {patientRequest:{patientRequestId:'REQ-SYNTHETIC'}};}});
 await h(request());await h(request());await h(request(body,token({bhwPatientId:'BHW0001'})));
 assert.equal(keys[0],keys[1]);assert.notEqual(keys[0],keys[2]);
});
test('missing reference, upstream failure, and configuration do not report success',async()=>{
 for(const queue of [async()=>null,async()=>{throw Error('private content');}]){const r=await handler({queue})(request());assert.equal(r.status,502);assert.doesNotMatch(await r.text(),/private content/);}
 assert.equal((await handler({configured:()=>false})(request())).status,503);
});
test('malformed or incomplete submissions are rejected',async()=>{
 const h=handler();for(const value of [null,{}, {...body,type:'toString'}, {...body,medication:''}])assert.equal((await h(request(value))).status,400);
 assert.equal((await h(request(body,token(),''))).status,400);
 assert.equal((await h(request({...body,message:'x'.repeat(17000)}))).status,413);
});
