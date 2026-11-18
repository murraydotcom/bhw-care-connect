import { medicationDescription } from './medication-request-contract.mjs';
const $ = id => document.getElementById(id);
const titles = { refill:'Refill a medicine', pharmacy:'Pharmacy problem', question:'Medicine question', side:'Report a side effect', change:'Ask about changing a medicine' };
let type = '', payload = null, key = null, busy = false;
let medicationList = [];
function selectedMedication() { return medicationList.find(m => m.refill?.reference === $('medicine-reference').value); }
function updateMedication() {
  const manual = $('medicine-reference').value === 'unlisted';
  $('unlisted-medicine').hidden = !manual; $('medicine').required = manual;
  const med = selectedMedication();
  $('medicine-details').textContent = med ? [medicationDescription(med), med.instructions, `List status: ${med.clinicalStatus}`,
    type === 'refill' && !med.refill.eligible ? 'This medicine is not current for refills. Choose a medication question or call the office.' : ''].filter(Boolean).join(' · ') : '';
}
$('medicine-reference').onchange = updateMedication;
const token = () => sessionStorage.getItem('bhw_pt_session') || '';
function show(id) { for (const section of document.querySelectorAll('main > section')) section.hidden = section.id !== id; $('status').textContent = ''; const heading = $(id).querySelector('h2'); heading.tabIndex = -1; heading.focus(); }
function login() { location.replace('/patient/?next=care-card'); }
function reset() { payload = null; key = null; $('request-form').reset(); updateMedication(); show('welcome'); }
$('checkin').onclick = () => show('program');
$('medication').onclick = () => show('types');
document.querySelectorAll('[data-home]').forEach(b => b.onclick = reset);
document.querySelectorAll('[data-type]').forEach(b => b.onclick = () => { type = b.dataset.type; $('request-title').textContent = titles[type]; updateMedication(); show('details'); });
$('back-types').onclick = () => show('types');
$('edit').onclick = () => { if (!busy) show('details'); };
$('another').onclick = reset;
$('signout').onclick = () => { sessionStorage.removeItem('bhw_pt_session'); sessionStorage.removeItem('bhw_pt_family'); login(); };
$('request-form').onsubmit = event => {
  event.preventDefault();
  const selected = selectedMedication();
  const next = { type, medication: selected ? medicationDescription(selected) : $('medicine').value.trim(),
    ...(selected ? { medicationReference: selected.refill.reference, medicationVersion: selected.refill.version } : {}),
    remaining:$('remaining').value.trim(), pharmacy:$('pharmacy').value.trim(), message:$('message').value.trim() };
  if (!next.medication || !next.message || (!selected && $('medicine-reference').value !== 'unlisted')) { $('status').textContent = 'Choose the medicine and tell us what you need.'; return; }
  if (selected && type === 'refill' && !selected.refill.eligible) { $('status').textContent = 'This medicine is not current for refills. Send a medication question or call the office.'; return; }
  // Keep the retry reference for an unchanged request, including after an ambiguous network error.
  if (JSON.stringify(next) !== JSON.stringify(payload)) key = crypto.randomUUID();
  payload = next;
  $('summary').replaceChildren();
  for (const [label,value] of [['Request',titles[type]],['Medicine',next.medication],['Medication source',selected ? 'Your current Health Core list' : 'Patient-reported; chart review needed'],['Current recorded directions',selected?.instructions || 'Not recorded'],['Amount left',next.remaining || 'Not entered'],['Pharmacy',next.pharmacy || 'Not entered'],['Your message',next.message]]) { const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;$('summary').append(dt,dd); }
  show('review');
};
$('send').onclick = async () => {
  if (busy || !payload || !key) return;
  busy = true; $('send').disabled = true; $('edit').disabled = true; $('status').textContent = 'Sending your request…';
  try {
    const response = await fetch('/api/patient-portal/medication-requests', {method:'POST',headers:{Authorization:`Bearer ${token()}`,'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify(payload)});
    const data = await response.json();
    if (!response.ok || !data.ok || !data.reference) throw new Error(data.error || 'We could not confirm your request was saved. Please try again.');
    $('reference').textContent = data.reference; show('done'); payload = null; key = null;
  } catch (error) { $('status').textContent = error.message || 'Connection problem. Please try again or call the office.'; }
  finally { busy=false; $('send').disabled=false; $('edit').disabled=false; }
};
async function start() {
  if (!token()) { login(); return; }
  try {
    const response = await fetch('/api/patient-portal/dashboard',{headers:{Authorization:`Bearer ${token()}`},cache:'no-store'});
    if (response.status === 401) { sessionStorage.removeItem('bhw_pt_session'); login(); return; }
    const data = await response.json();
    if (!response.ok || !data.ok || !data.dashboard) throw new Error(data.error || 'Your care space could not be loaded.');
    const name = data.dashboard.patient?.preferredName || data.dashboard.patient?.firstName;
    $('greeting').textContent = name ? `How can we help, ${name}?` : 'How can we help?';
    medicationList = (data.dashboard.medications || []).filter(med => med.name && med.refill?.reference && med.refill?.version);
    for (const med of medicationList) { const option=document.createElement('option');option.value=med.refill.reference;option.textContent=[medicationDescription(med), med.instructions, med.clinicalStatus].filter(Boolean).join(' · ');$('medicine-reference').insertBefore(option,$('medicine-reference').lastElementChild); }
    show('welcome');
    const requested = new URLSearchParams(location.search).get('medication');
    if (requested && medicationList.some(med => med.refill.reference === requested)) {
      type = 'refill'; $('request-title').textContent = titles[type]; $('medicine-reference').value = requested; updateMedication(); show('details');
    }
  } catch(error) { $('status').textContent = `${error.message} You can refresh to try again or call the office.`; }
}
start();

