export function medicationDescription(medication) {
  return [medication.name, medication.strengthForm, medication.dose, medication.route, medication.frequency]
    .filter(value => typeof value === 'string' && value.trim()).join(' · ');
}

export function resolveMedicationSelection(body, medications) {
  const fail = message => { throw Object.assign(new Error(message), { status: 409 }); };
  if (!body.medicationReference) {
    if (body.medicationVersion) fail('Choose the medication again.');
    return null; // Explicit patient-reported medicine; never represented as a chart-verified match.
  }
  if (!/^[a-f0-9]{64}$/.test(body.medicationReference) || !/^[a-f0-9]{64}$/.test(body.medicationVersion || '')) fail('Choose the medication again from your current list.');
  const matches = (Array.isArray(medications) ? medications : []).filter(m => m.refill?.reference === body.medicationReference);
  if (matches.length !== 1 || matches[0].refill.version !== body.medicationVersion) fail('Your medication list changed. Refresh it and review your request again.');
  const medication = matches[0];
  if (body.type === 'refill' && medication.refill.eligible !== true) fail('This medicine is not listed as current for refills. Send a medication question or call the office.');
  return medication;
}
