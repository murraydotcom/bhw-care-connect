import test from 'node:test';
import assert from 'node:assert/strict';
import { returnedLabPanels, patientVisitSummaries, renderVisitSummaries } from '../patient/visit-handoffs.mjs';
const report = { id: 'result-' + 'a'.repeat(40), title: 'Synthetic result', reportedAt: '2026-10-09T10:00:00Z', source: 'Synthetic laboratory rehearsal',
  reviewStatus: 'awaiting-review', results: [{ name: 'Synthetic analyte', value: '4.2', unit: 'synthetic', referenceRange: '1–5', flag: 'normal' }], explanation: 'Unapproved explanation' };
test('returned raw results render independently of review and released Blueprint interpretation', () => {
  const panel = returnedLabPanels([report])[0]; assert.equal(panel.results[0].value, '4.2'); assert.equal(panel.status, 'Provider review pending'); assert.doesNotMatch(JSON.stringify(panel), /Unapproved explanation/);
  const reviewed = returnedLabPanels([{ ...report, reviewStatus: 'reviewed', explanation: 'Approved patient explanation', interpretation: 'Private reasoning' }])[0];
  assert.equal(reviewed.results[0].meaning, 'Approved patient explanation'); assert.doesNotMatch(JSON.stringify(reviewed), /Private reasoning/);
  assert.deepEqual(returnedLabPanels([{ ...report, id: 'BHW1234' }]), []);
});
test('patient visit summaries use an explicit allowlist and render narrative as text', () => {
  const value = { id: 'visit-' + 'b'.repeat(40), title: 'Synthetic visit', summary: '<script>synthetic</script>', instructions: 'Approved instructions', followUp: 'Approved follow-up', encounterDate: '2026-10-09', approvedAt: '2026-10-09T10:00:00Z', noteId: 'private-note', subjective: 'Private raw note', signedContentHash: 'Private digest' };
  assert.doesNotMatch(JSON.stringify(patientVisitSummaries([value])), /private-note|Private raw note|Private digest/);
  const created = [];
  const documentImpl = { createElement(tag) { const node = { tag, textContent: '', append(...children) { this.children = children; } }; created.push(node); return node; } };
  const target = { replaceChildren() {}, append() {} }; renderVisitSummaries(target, [value], documentImpl);
  assert.equal(created.some(n => n.textContent === '<script>synthetic</script>'), true); assert.equal(created.some(n => n.tag === 'script'), false);
  assert.deepEqual(patientVisitSummaries([{ ...value, approvedAt: '' }]), []);
});
