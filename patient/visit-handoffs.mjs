const text = (value, max = 3000) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const array = (value, max) => Array.isArray(value) ? value.slice(0, max) : [];

export function returnedLabPanels(reports) {
  return array(reports, 30).filter(report => /^result-[a-f0-9]{40}$/.test(report?.id || '') && ['reviewed', 'awaiting-review'].includes(report.reviewStatus))
    .map(report => ({ id: report.id, title: text(report.title, 160), source: 'returned-laboratory-report',
      status: report.reviewStatus === 'reviewed' ? 'Provider reviewed' : 'Provider review pending',
      summary: `Reported ${text(report.reportedAt, 40)} · ${text(report.source, 120)}`,
      results: array(report.results, 40).map(result => ({ name: text(result.name, 160), value: text(result.value, 80), unit: text(result.unit, 80),
        labRange: text(result.referenceRange, 160), status: text(result.flag, 40),
        meaning: report.reviewStatus === 'reviewed' ? text(report.explanation) : 'Your result is available. Your provider has not reviewed it yet.' })).filter(result => result.name && result.value),
    })).filter(panel => panel.title && panel.results.length);
}
export function patientVisitSummaries(summaries) {
  return array(summaries, 50).filter(summary => /^visit-[a-f0-9]{40}$/.test(summary?.id || '') && text(summary.approvedAt, 40))
    .map(summary => ({ title: text(summary.title, 160), summary: text(summary.summary), instructions: text(summary.instructions),
      followUp: text(summary.followUp, 1000), encounterDate: text(summary.encounterDate, 10), approvedAt: text(summary.approvedAt, 40) }))
    .filter(summary => summary.title && summary.summary && summary.instructions && summary.followUp);
}
export function renderVisitSummaries(target, summaries, documentImpl = document) {
  target.replaceChildren();
  const create = (tag, value) => { const node = documentImpl.createElement(tag); node.textContent = value; return node; };
  const visits = patientVisitSummaries(summaries);
  if (!visits.length) { target.append(create('p', 'No provider-approved visit summary has been shared yet.')); return; }
  for (const visit of visits) {
    const card = create('article', ''); card.className = 'item';
    card.append(create('h3', visit.title), create('p', `Visit ${visit.encounterDate} · Provider approved`),
      create('p', visit.summary), create('h4', 'Instructions'), create('p', visit.instructions), create('h4', 'Follow-up'), create('p', visit.followUp));
    target.append(card);
  }
}
