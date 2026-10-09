import {createMessagesClient} from './messages-client.mjs?v=messaging-2';
import {readMessageFiles,downloadMessageFile} from './message-attachments.mjs?v=messaging-2';
export function mountPatientMessages({root,getToken,isPreview=false,onExpired=()=>{}}) {
  const $=id=>root.querySelector('#'+id);
  const api=createMessagesClient({getToken});
  let current=null,pending=null,nextBefore=null,rows=[],generation=0,active=true,loading=false,idleTimer=null,pollTimer=null,featureAvailable=false,attachmentsEnabled=false;
  $('message-new').disabled=true;
  const status=text=>{$('message-status').textContent=text;};
  const node=(tag,text)=>{const e=document.createElement(tag);e.textContent=text;return e;};
  const clear=()=>{active=false;clearTimeout(idleTimer);clearInterval(pollTimer);generation++;current=pending=null;rows=[];$('conversation-title').textContent='Choose a conversation';$('conversation-list').replaceChildren();$('conversation-messages').replaceChildren();$('message-file-selection').textContent='';$('message-form').reset();$('message-form').hidden=true;};
  const fail=error=>{
    if(error.status===401){clear();status('Your session expired. Sign in again. Unsaved drafts were cleared.');onExpired();return;}
    status(error.message||'Messages are unavailable. Please call the office.');
  };
  function renderList(){
    $('conversation-list').replaceChildren(...rows.map(row=>{const b=node('button',row.subject+' · '+row.status+(row.unreadCount&&$('message-badge-preference').checked?' · '+row.unreadCount+' unread':''));b.type='button';b.className='message-thread-button';b.onclick=()=>{if(!pending)void open(row.id).catch(fail);};return b;}));
    if(!rows.length)$('conversation-list').append(node('p','No conversations yet.'));
    $('messages-more').hidden=!nextBefore;
  }
  function renderThread(){
    $('conversation-title').textContent=current?.subject||'New message';
    $('conversation-messages').replaceChildren(...(current?.messages||[]).map(m=>{
      const a=node('article','');a.className='portal-message '+m.senderKind;
      a.append(node('strong',m.senderKind==='patient'?'You':m.senderName),node('small',new Date(m.sentAt).toLocaleString()+' · '+m.status),node('p',m.body));
      for(const file of m.attachments || []){const b=node('button','Download '+file.name+' ('+Math.ceil(file.size/1024)+' KB)');b.type='button';b.onclick=()=>{const version=generation;b.disabled=true;void downloadMessageFile({api,threadId:current.id,file,isCurrent:()=>active&&version===generation}).catch(fail).finally(()=>{b.disabled=false;});};a.append(b);}return a;
    }));
    $('new-message-fields').hidden=Boolean(current);
    $('message-form').hidden=false;
    $('message-subject').required=!current;
    $('message-body').value='';$('message-nonurgent').checked=false;
    $('message-files').value='';$('message-files').disabled=!attachmentsEnabled;$('message-file-selection').textContent='';
    $('message-send').textContent=current?'Send reply':'Send message';
  }
  async function load(more=false){
    if(!active||loading)return;loading=true;
    const version=generation;
    try {
    const data=await api({query:more&&nextBefore?{before:nextBefore}:{}});
    if(version!==generation)return;
    if(!featureAvailable){featureAvailable=true;$('message-new').disabled=false;scheduleExpiry();}
    attachmentsEnabled=data.attachments?.enabled===true;$('message-files').disabled=!attachmentsEnabled || Boolean(pending);
    $('message-file-help').textContent=attachmentsEnabled?'Up to 3 files, 512 KB each. PDF, PNG, JPEG, or text. Use synthetic files only.':'File attachments are currently unavailable.';
    rows=more?[...rows,...data.threads]:data.threads;nextBefore=data.nextBefore;
    if(data.preferences)$('message-badge-preference').checked=data.preferences.showUnreadBadge;
    renderList();status('Messages loaded. Synthetic BHW0000 only.');
    } finally { loading=false; }
  }
  async function open(id){
    const version=++generation;
    const data=await api({query:{threadId:id}});if(version!==generation)return;
    current=data.thread;renderThread();
    // A read receipt means this conversation was opened; it does not promise clinical review.
    if(current.unreadCount){
      const result=await api({command:{action:'read',commandId:crypto.randomUUID(),threadId:id,expectedRevision:current.revision}});
      if(version!==generation)return;current=result.thread;renderThread();void load().catch(fail);
    }
  }
  $('message-new').onclick=()=>{if(pending)return;generation++;current=null;renderThread();$('message-subject').focus();};
  $('messages-refresh').onclick=()=>{if(!pending)void load().catch(fail);};
  $('messages-more').onclick=()=>void load(true).catch(fail);
  $('message-form').onsubmit=async event=>{
    event.preventDefault();if(!active||$('message-send').disabled)return;if(!$('message-form').reportValidity())return;
    const version=generation;
    const button=$('message-send');button.disabled=true;
    for(const input of $('message-form').querySelectorAll('input,textarea,select'))input.disabled=true;
    try{
      const files=pending?null:await readMessageFiles($('message-files').files);if(version!==generation)return;
      const command=pending||{action:current?'reply':'compose',commandId:crypto.randomUUID(),body:$('message-body').value,
        nonUrgentAcknowledged:$('message-nonurgent').checked,...(files.length?{attachments:files}:{}),...(current?{threadId:current.id,expectedRevision:current.revision}:{subject:$('message-subject').value,topic:$('message-topic').value})};
      pending=command;status(command.attachments?.length?'Checking files and sending your message…':'Sending your message…');
      const result=await api({command});if(version!==generation)return;pending=null;current=result.thread;renderThread();status('Sent securely to your care team.');await load();}
    catch(error){if(version!==generation)return;if(!error.saveUnconfirmed)pending=null;fail(error);button.textContent=pending?'Retry same message':'Send message';}
    finally{button.disabled=false;for(const input of $('message-form').querySelectorAll('input,textarea,select'))input.disabled=Boolean(pending);$('message-files').disabled=Boolean(pending)||!attachmentsEnabled;}
  };
  $('message-files').onchange=()=>{$('message-file-selection').textContent=Array.from($('message-files').files).map(f=>f.name+' ('+Math.ceil(f.size/1024)+' KB)').join(', ');};
  $('message-clear-files').onclick=()=>{if(pending||$('message-send').disabled)return;$('message-files').value='';$('message-file-selection').textContent='';};
  $('message-badge-preference').onchange=async()=>{
    try{await api({command:{action:'preferences',commandId:crypto.randomUUID(),showUnreadBadge:$('message-badge-preference').checked}});renderList();status('Preference saved. External email and text alerts remain disabled.');}
    catch(error){$('message-badge-preference').checked=!$('message-badge-preference').checked;fail(error);}
  };
  function scheduleExpiry(){
    if(!active||!featureAvailable)return;
    clearTimeout(idleTimer);let expires=Date.now()+15*60*1000;
    try{const claims=JSON.parse(atob(getToken().split('.')[0].replace(/-/g,'+').replace(/_/g,'/')));expires=Math.min(expires,claims.exp);}catch{}
    idleTimer=setTimeout(()=>{clear();onExpired();},Math.max(0,expires-Date.now()));
  }
  document.addEventListener('pointerdown',scheduleExpiry);document.addEventListener('keydown',scheduleExpiry);
  window.addEventListener('pagehide',clear,{once:true});
  if(!isPreview){scheduleExpiry();pollTimer=setInterval(async()=>{
    if(!active||!featureAvailable||pending||document.hidden||$('message-body').value||$('message-files').files.length)return;
    try{await load();if(current){const latest=rows.find(r=>r.id===current.id);if(latest&&latest.revision!==current.revision)await open(current.id);}}catch(error){fail(error);}
  },30000);}
  if(isPreview){$('message-new').disabled=true;status('Messaging requires authenticated BHW0000 testing. This visual preview does not save messages.');}
  else void load().catch(fail);
  return {clear:()=>{clear();document.removeEventListener('pointerdown',scheduleExpiry);document.removeEventListener('keydown',scheduleExpiry);}};
}
