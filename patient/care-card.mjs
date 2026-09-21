const $ = id => document.getElementById(id);
const titles = { refill:'Refill a medicine', pharmacy:'Pharmacy problem', question:'Medicine question', side:'Report a side effect', change:'Ask about changing a medicine' };
let type = '', payload = null, key = null, busy = false;
const token = () => sessionStorage.getItem('bhw_pt_session') || '';
function show(id) { for (const section of document.querySelectorAll('main > section')) section.hidden = section.id !== id; $('status').textContent = ''; const heading = $(id).querySelector('h2'); heading.tabIndex = -1; heading.focus(); }
function login() { location.replace('/patient/?next=care-card'); }
function reset() { payload = null; key = null; $('request-form').reset(); show('welcome'); }
$('checkin').onclick = () => show('program');
$('medication').onclick = () => show('types');
document.querySelectorAll('[data-home]').forEach(b => b.onclick = reset);
document.querySelectorAll('[data-type]').forEach(b => b.onclick = () => { type = b.dataset.type; $('request-title').textContent = titles[type]; show('details'); });
$('back-types').onclick = () => show('types');
$('edit').onclick = () => { if (!busy) show('details'); };
$('another').onclick = reset;
$('signout').onclick = () => { sessionStorage.removeItem('bhw_pt_session'); sessionStorage.removeItem('bhw_pt_family'); login(); };
$('request-form').onsubmit = event => {
  event.preventDefault();
  const next = { type, medication:$('medicine').value.trim(), remaining:$('remaining').value.trim(), pharmacy:$('pharmacy').value.trim(), message:$('message').value.trim() };
  if (!next.medication || !next.message) { $('status').textContent = 'Enter the medicine and what you need.'; return; }
  // Keep the retry reference for an unchanged request, including after an ambiguous network error.
  if (JSON.stringify(next) !== JSON.stringify(payload)) key = crypto.randomUUID();
  payload = next;
  $('summary').replaceChildren();
  for (const [label,value] of [['Request',titles[type]],['Medicine',next.medication],['Amount left',next.remaining || 'Not entered'],['Pharmacy',next.pharmacy || 'Not entered'],['Your message',next.message]]) { const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;$('summary').append(dt,dd); }
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
    for (const med of data.dashboard.medications || []) if(med.name && med.clinicalStatus === 'active') { const option=document.createElement('option');option.value=[med.name,med.dose].filter(Boolean).join(' ');$('medicines').append(option); }
    show('welcome');
  } catch(error) { $('status').textContent = `${error.message} You can refresh to try again or call the office.`; }
}
start();
