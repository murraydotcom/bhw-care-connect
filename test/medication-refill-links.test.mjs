import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { createCareCardRequestsHandler } from '../netlify/functions/_shared/care-card-requests.mjs';
import { resolveMedicationSelection } from '../patient/medication-request-contract.mjs';
const secret='synthetic-only-care-card-secret', now=Date.parse('2026-11-18T12:00:00Z');
const med={name:'Synthetic drug',strengthForm:'10 mg tablet',instructions:'Take one tablet daily',clinicalStatus:'active',refill:{reference:'a'.repeat(64),version:'b'.repeat(64),eligible:true}};
const body={type:'refill',medicationReference:med.refill.reference,medicationVersion:med.refill.version,message:'Please review my refill',medication:'Forged different medicine',bhwPatientId:'BHW9999'};
function session(id='BHW0000') {
 const date=new Date(now).toISOString();
 const payload=Buffer.from(JSON.stringify({kind:'patient',patientAuthVersion:2,bhwPatientId:id,exp:now+60000,schemaVersion:'bhw.patient-portal-access.v1',accessType:'self',proxyAccessAllowed:false,pilotCohort:'primary-care-adult-v1',programs:['primary'],portalAccessStatus:'active',preferredChannel:'email',verifiedChannel:'email',contactVerifiedAt:date,consentedAt:date,portalInvitedAt:date,authorizationUpdatedAt:date})).toString('base64url');
 return payload+'.'+crypto.createHmac('sha256',secret).update(payload).digest('base64url');
}
function request(value=body,token=session()){return new Request('https://synthetic.test/api/patient-portal/medication-requests',{method:'POST',headers:{Authorization:'Bearer '+token,'Idempotency-Key':'synthetic-refill-0001'},body:JSON.stringify(value)});}
function setup(medications=[med],options={}){
 const sent=[];
 const handler=createCareCardRequestsHandler({secret:()=>secret,now:()=>now,configured:()=>true,
  dashboard:async()=>Response.json({ok:true,dashboard:{medications}}),queue:async v=>{sent.push(v);return {patientRequest:{patientRequestId:'REQ-SYNTHETIC'}}},...options});
 return {handler,sent};
}
test('refill resolves the signed-in patient list and preserves exact medication details in staff intake',async()=>{
 const {handler,sent}=setup();const response=await handler(request());assert.equal(response.status,200);
 assert.equal(sent[0].body.bhwPatientId,'BHW0000');assert.match(sent[0].body.message,/Synthetic drug · 10 mg tablet/);
 assert.match(sent[0].body.message,/Take one tablet daily/);assert.doesNotMatch(sent[0].body.message,/Forged/);
 assert.equal(sent[0].body.routing.downstreamReference,`health-core-medication:${med.refill.reference}:${med.refill.version}`);
 assert.equal(sent[0].body.notificationMode,'none');assert.equal(sent[0].body.manualNotifyOnly,true);
 assert.equal(sent[0].body.medicationOrders,undefined);
});
test('stale, foreign, stopped, duplicate or missing medication matches never enter the queue',async()=>{
 for(const medications of [[],[{...med,refill:{...med.refill,version:'c'.repeat(64)}}],[{...med,clinicalStatus:'stopped',refill:{...med.refill,eligible:false}}],[med,med]]){
  const {handler,sent}=setup(medications);assert.equal((await handler(request())).status,409);assert.equal(sent.length,0);
 }
 const {handler,sent}=setup([med]);assert.equal((await handler(request({...body,medicationReference:'d'.repeat(64)}))).status,409);assert.equal(sent.length,0);
});
test('revoked access, forged sessions and upstream failure cannot create linked requests',async()=>{
 for(const options of [{dashboard:async()=>Response.json({error:'revoked'},{status:403})},{dashboard:async()=>{throw Error('private failure')}}]){
  const {handler,sent}=setup([med],options);assert.ok((await handler(request())).status>=400);assert.equal(sent.length,0);
 }
 const {handler,sent}=setup();assert.equal((await handler(request(body,'forged'))).status,401);assert.equal(sent.length,0);
});
test('unlisted medicines remain explicit patient reports and cannot impersonate a chart match',async()=>{
 const {handler,sent}=setup();const response=await handler(request({type:'refill',medication:'Name on bottle',message:'Missing from my list'}));assert.equal(response.status,200);
 assert.match(sent[0].body.message,/Patient-reported medication \(not matched to the chart\)/);assert.equal(sent[0].body.routing.downstreamReference,undefined);
 assert.throws(()=>resolveMedicationSelection({medicationVersion:med.refill.version},[med]));
});
test('retry identity is patient-scoped and identical retries keep the same intake reference',async()=>{
 const {handler,sent}=setup();await handler(request());await handler(request());assert.equal(sent[0].submissionId,sent[1].submissionId);
});
test('myBHW medication cards open the same care request form with an opaque medication reference',()=>{
 const app=fs.readFileSync(new URL('../patient/app.mjs',import.meta.url),'utf8');
 const form=fs.readFileSync(new URL('../pages/bhw-care-card.html',import.meta.url),'utf8');
 assert.match(app,/bhw-care-card\.html\?medication=/);assert.match(form,/id="medicine-reference"/);assert.doesNotMatch(form,/<datalist/);
});
