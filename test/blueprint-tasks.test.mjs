import test from 'node:test';
import assert from 'node:assert/strict';
import {patientBlueprintTasks,renderBlueprintTasks} from '../patient/blueprint-tasks.mjs';
test('patient work displays only allowed outstanding statuses, generic labels and dates, never staff or clinical fields',()=>{
  const value=[{id:'TSK-BP-'+'a'.repeat(40),label:'PRIVATE-CLINICAL-TEXT',status:'awaiting-provider-review',dueAt:'2026-12-02T14:00:00Z',owner:'private-staff',completionCondition:'private-condition'},
    {id:'action-'+'b'.repeat(40),status:'needs-planning',dueAt:null},{id:'TSK-BP-'+'c'.repeat(40),status:'completed',dueAt:'2026-12-02T14:00:00Z'}];
  const tasks=patientBlueprintTasks(value);assert.equal(tasks.length,2);assert.doesNotMatch(JSON.stringify(tasks),/PRIVATE|private|completed/);
  const created=[],target={replaceChildren(){},append(){}};renderBlueprintTasks(target,value,{createElement(tag){const n={tag,textContent:''};created.push(n);return n;}});
  assert.ok(created.some(n=>n.textContent.includes('timing awaiting review')));assert.equal(target.hidden,false);
  renderBlueprintTasks(target,undefined,{createElement(){throw Error('disabled view must not render');}});assert.equal(target.hidden,true);
});
