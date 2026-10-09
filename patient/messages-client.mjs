export function createMessagesClient({getToken,fetchImpl=fetch,endpoint='/api/patient-portal/messages'}={}) {
  return async ({query={},command,download=false}={}) => {
    const token=getToken();
    if (!token) throw Object.assign(new Error('Please sign in again.'),{status:401});
    const params=new URLSearchParams(query);
    const response=await fetchImpl(endpoint+(params.size?'?'+params:''),{method:command?'POST':'GET',cache:'no-store',
      headers:{Authorization:`Bearer ${token}`,...(command?{'Content-Type':'application/json'}:{})},
      body:command?JSON.stringify(command):undefined,signal:AbortSignal.timeout(10000)});
    if(download && response.ok){
      if(response.headers.get('content-type')!=='application/octet-stream')throw new Error('File download could not be confirmed.');
      const blob=await response.blob();if(!blob.size || blob.size>512*1024)throw new Error('Invalid file download.');return {blob};
    }
    const data=await response.json().catch(()=>null);
    if (!response.ok || data?.ok!==true) throw Object.assign(new Error(data?.error||'Messaging could not be confirmed. Retry the same submission.'),{status:response.status,saveUnconfirmed:command && (!data || data.saveUnconfirmed===true || response.status>=500)});
    if(command && command.action!=='preferences' && data.commandId!==command.commandId) throw Object.assign(new Error('Save could not be confirmed. Retry the same submission.'),{saveUnconfirmed:true});
    return data;
  };
}
