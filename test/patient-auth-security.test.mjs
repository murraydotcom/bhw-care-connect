import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { verifyCareConnectPatientSession } from '../netlify/functions/_shared/patient-session.mjs';
const require = createRequire(import.meta.url);
process.env.SESSION_SECRET = 'synthetic-only-auth-regression';
const lib = require('../netlify/functions/_lib.js');
const source = readFileSync(new URL('../netlify/functions/patient-auth.js', import.meta.url), 'utf8');
function setup(response, options={}) {
 const calls={lookup:0,meds:0}; const exports={};
 const env={STYTCH_PROJECT_ID:'project-test-synthetic',STYTCH_SECRET:'secret-test-synthetic',SESSION_SECRET:process.env.SESSION_SECRET,PATIENT_PORTAL_PILOT_ENABLED:'true',...options.env};
 vm.runInNewContext(source,{exports,Buffer,process:{env},fetch:async()=>({ok:true,data:response,json:async()=>response}),require:path=>path==='./_lib'?{...lib,queryDb:async()=>{calls.meds++;if(options.failMeds)throw Error('private error');return [];}}:{operationsBase:()=>true,resolveGooglePatientIdentity:async input=>{calls.lookup++;calls.identity=input;return {bhwPatientId:'BHW0000',preferredName:'Synthetic',portalAuthorization:{}};}}});
 return {calls,run:async body=>{const r=await exports.handler({httpMethod:'POST',body:JSON.stringify(body)});return {status:r.statusCode,body:JSON.parse(r.body)};}};
}
const email='patient@example.test', phone='+14435550100';
const auth=(extra={})=>({method_id:'method-synthetic',user:{emails:[{email_id:'method-synthetic',email,verified:true}]},...extra});
const login=(extra={})=>({action:'verify',methodId:'method-synthetic',code:'123456',email,dob:'1986-01-01',portalContract:'google-v1',...extra});
test('verified exact email and SMS methods can resolve a patient',async()=>{
 for(const [response,body,expected] of [[auth(),login(),{email}],[auth({user:{phone_numbers:[{phone_id:'method-synthetic',phone_number:phone,verified:true}]}}),login({email:'',phone:'4435550100'}),{phone}]]){
  const h=setup(response); const r=await h.run(body);assert.equal(r.status,200);assert.equal(h.calls.lookup,1);
  for(const [k,v] of Object.entries(expected))assert.equal(h.calls.identity[k],v);
  assert.equal(lib.verify(r.body.token).patientAuthVersion,2);
 }
});
test('changed contact, unrelated verified contact, wrong method, unverified and missing evidence never resolve a record',async()=>{
 const cases=[
  [auth(),login({email:'other@example.test'})],
  [auth({user:{emails:[{email_id:'other-method',email,verified:true}]}}),login()],
  [auth({method_id:'other-method'}),login()],
  [auth({user:{emails:[{email_id:'method-synthetic',email,verified:false}]}}),login()],
  [{},login()],
  [auth(),login({email:'',phone})],
  [auth({user:{phone_numbers:[{phone_id:'method-synthetic',phone_number:'+14435550101',verified:true}]}}),login({email:'',phone})],
 ];
 for(const [response,body] of cases){const h=setup(response);const r=await h.run(body);assert.equal(r.status,401);assert.equal(h.calls.lookup,0);assert.equal(h.calls.meds,0);assert.equal(r.body.token,undefined);}
});
const session=extra=>lib.sign({kind:'patient',patientAuthVersion:2,patientId:'synthetic-self',dependentIds:['synthetic-dependent'],exp:Date.now()+60000,...extra});
test('medication reads reject missing, forged, expired, staff and old sessions before querying',async()=>{
 for(const token of [undefined,'forged',session({exp:Date.now()-1}),session({kind:'staff'}),session({patientAuthVersion:1})]){
  const h=setup(auth());assert.equal((await h.run({action:'meds',token,patientId:'synthetic-self'})).status,401);assert.equal(h.calls.meds,0);
 }
});
test('medication reads allow self and linked dependent, reject other and unlinked records',async()=>{
 for(const patientId of ['synthetic-self','synthetic-dependent']){const h=setup(auth());assert.equal((await h.run({action:'meds',token:session(),patientId})).status,200);assert.equal(h.calls.meds,1);}
 const h=setup(auth());assert.equal((await h.run({action:'meds',token:session(),patientId:'synthetic-other'})).status,403);
 assert.equal((await h.run({action:'meds',token:session({patientId:null,dependentIds:[]})})).status,409);assert.equal(h.calls.meds,0);
});
test('preview sessions cannot read real records and read failures do not look like an empty list',async()=>{
 const h=setup(auth());assert.equal((await h.run({action:'meds',token:session({demo:true})})).status,403);assert.equal(h.calls.meds,0);
 const failed=await setup(auth(),{failMeds:true}).run({action:'meds',token:session()});assert.equal(failed.status,502);assert.equal(failed.body.meds,undefined);
});
test('pre-fix sessions are also rejected by shared Google patient authorization',()=>{
 assert.equal(verifyCareConnectPatientSession(session({patientAuthVersion:undefined}),process.env.SESSION_SECRET),null);
});
