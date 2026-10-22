export function patientBlueprintTasks(value) {
  return (Array.isArray(value)?value:[]).slice(0,500).filter(t=>/^(?:TSK-BP-|action-)[a-f0-9]{40}$/.test(t?.id||'')
    &&['open','blocked','awaiting-provider-review','awaiting-queue','needs-planning'].includes(t.status)&&(t.status==='needs-planning'||Number.isFinite(Date.parse(t.dueAt))))
    .map(t=>({id:t.id,label:'Care-team follow-up',status:t.status,dueAt:t.dueAt}));
}
export function renderBlueprintTasks(target,value,documentImpl=document) {
  target.replaceChildren();target.hidden=!Array.isArray(value);if(target.hidden)return;
  const node=(tag,text)=>{const n=documentImpl.createElement(tag);n.textContent=text;return n;};
  target.append(node('h2','Care-team follow-up'));
  const tasks=patientBlueprintTasks(value);
  if(!tasks.length){target.append(node('p','No outstanding care-team work is listed for this Blueprint.'));return;}
  for(const t of tasks)target.append(node('p',`${t.label} · ${t.status.replaceAll('-',' ')}${t.dueAt?' · due '+new Date(t.dueAt).toLocaleString():' · timing awaiting review'}`));
}
