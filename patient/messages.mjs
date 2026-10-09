import {createMessagesClient} from './messages-client.mjs?v=messaging-1';
export function mountPatientMessages({root,getToken,isPreview=false,onExpired=()=>{}}) {
  const $=id=>root.querySelector('#'+id);
  const api=createMessagesClient({getToken});
  let current=null,pending=null,nextBefore=null,rows=[],generation=0,active=true,loading=false,idleTimer=null,pollTimer=null;
  const status=text=>{$('message-status').textContent=text;};
  const node=(tag,text)=>{const e=document.createElement(tag);e.textContent=text;return e;};
  const clear=()=>{active=false;clearTimeout(idleTimer);clearInterval(pollTimer);generation++;current=pending=null;rows=[];$('conversation-title').textContent='Choose a conversation';$('conversation-list').replaceChildren();$('conversation-messages').replaceChildren();$('message-form').reset();$('message-form').hidden=true;};
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
      a.append(node('strong',m.senderKind==='patient'?'You':m.senderName),node('small',new Date(m.sentAt).toLocaleString()+' · '+m.status),node('p',m.body));return a;
    }));
    $('new-message-fields').hidden=Boolean(current);
    $('message-form').hidden=false;
    $('message-subject').required=!current;
    $('message-body').value='';$('message-nonurgent').checked=false;
    $('message-send').textContent=current?'Send reply':'Send message';
  }
  async function load(more=false){
    if(!active||loading)return;loading=true;
    const version=generation;
    try {
    const data=await api({query:more&&nextBefore?{before:nextBefore}:{}});
    if(version!==generation)return;
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
    const command=pending||{action:current?'reply':'compose',commandId:crypto.randomUUID(),body:$('message-body').value,
      nonUrgentAcknowledged:$('message-nonurgent').checked,...(current?{threadId:current.id,expectedRevision:current.revision}:{subject:$('message-subject').value,topic:$('message-topic').value})};
    pending=command;for(const input of $('message-form').querySelectorAll('input,textarea,select'))input.disabled=true;
    try{const result=await api({command});if(version!==generation)return;pending=null;current=result.thread;renderThread();status('Sent securely to your care team.');await load();}
    catch(error){if(version!==generation)return;if(!error.saveUnconfirmed)pending=null;fail(error);button.textContent=pending?'Retry same message':'Send message';}
    finally{button.disabled=false;for(const input of $('message-form').querySelectorAll('input,textarea,select'))input.disabled=Boolean(pending);}
  };
  $('message-badge-preference').onchange=async()=>{
    try{await api({command:{action:'preferences',commandId:crypto.randomUUID(),showUnreadBadge:$('message-badge-preference').checked}});renderList();status('Preference saved. External email and text alerts remain disabled.');}
    catch(error){$('message-badge-preference').checked=!$('message-badge-preference').checked;fail(error);}
  };
  function scheduleExpiry(){
    clearTimeout(idleTimer);let expires=Date.now()+15*60*1000;
    try{const claims=JSON.parse(atob(getToken().split('.')[0].replace(/-/g,'+').replace(/_/g,'/')));expires=Math.min(expires,claims.exp);}catch{}
    idleTimer=setTimeout(()=>{clear();onExpired();},Math.max(0,expires-Date.now()));
  }
  root.addEventListener('pointerdown',scheduleExpiry);root.addEventListener('keydown',scheduleExpiry);
  window.addEventListener('pagehide',clear,{once:true});
  if(!isPreview){scheduleExpiry();pollTimer=setInterval(async()=>{
    if(!active||pending||document.hidden||$('message-body').value)return;
    try{await load();if(current){const latest=rows.find(r=>r.id===current.id);if(latest&&latest.revision!==current.revision)await open(current.id);}}catch(error){fail(error);}
  },30000);}
  if(isPreview){$('message-new').disabled=true;status('Messaging requires authenticated BHW0000 testing. This visual preview does not save messages.');}
  else void load().catch(fail);
  return {clear:()=>{clear();root.removeEventListener('pointerdown',scheduleExpiry);root.removeEventListener('keydown',scheduleExpiry);}};
}
