'use strict';
window.StudySync=(()=>{
 const F=['status','bookmark','memo','rounds','hidden'],GUEST='gongjo-study-records-v1';
 let cfg,user=null,ready=false,busy=false,timer,remote={},pending={},key='',conflicts=new Set();
 const k=(id,f)=>id+':'+f;
 function status(t){document.querySelector('#syncStatus').textContent=t;}
 function persist(){if(user)localStorage.setItem(key,JSON.stringify({remote,pending}));}
 function compose(){const r={};for(const c of [...Object.values(remote),...Object.values(pending)]){(r[c.id]??={})[c.field]=c.value;}return cfg.validate(r);}
 function redraw(){cfg.replace(compose());document.querySelector('#syncConflict').hidden=!conflicts.size;}
 function loadGuest(){let r={};try{r=cfg.validate(JSON.parse(localStorage.getItem(GUEST)||'{}'));}catch{}return r;}
 function selectUser(next){
  if(user?.id===next?.id&&ready)return;
  user=next;remote={};pending={};conflicts.clear();
  if(user){key='gongjo-cloud-v1:'+user.id;try{const cache=JSON.parse(localStorage.getItem(key)||'{}');remote=cache.remote||{};pending=cache.pending||{};}catch{} }
  else cfg.replace(loadGuest());
  document.querySelector('#syncLogin').hidden=!!user;document.querySelector('#syncLogout').hidden=!user;
  document.querySelector('#syncAccount').textContent=user?user.name:'로그인하면 다른 기기에서도 이어서 공부해요.';
  document.querySelector('#migrateRecords').hidden=!user||!!localStorage.getItem('gongjo-migrated-to:'+user.id)||!Object.keys(loadGuest()).length;
 }
 function accept(rows,sent=[]){
  const sentMap=Object.fromEntries(sent.map(c=>[k(c.id,c.field),c]));
  remote=Object.fromEntries(rows.map(c=>[k(c.id,c.field),c]));conflicts.clear();
  for(const [id,c]of Object.entries(pending)){
   const server=remote[id],prev=sentMap[id];
   if(server&&(server.op===c.op||server.value===c.value)){delete pending[id];continue;}
   if(server&&prev&&server.op===prev.op){c.base=server.revision;continue;}
   if((server?.revision||0)!==c.base)conflicts.add(id);
  }
  persist();redraw();
 }
 async function request(method,changes){
  const r=await fetch('/api/records',{method,credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(15000),...(changes?{headers:{'Content-Type':'application/json','X-Study-Sync':'1'},body:JSON.stringify({accountId:user.id,changes})}:{})});
  if(r.status===401){selectUser(null);ready=true;status('이 기기에만 저장 · 로그인 필요');return null;}
  if(r.status===409){ready=false;throw Error('account');}
  if(!r.ok)throw Error('network');return r.json();
 }
 async function sync(){
  if(busy||document.hidden)return;busy=true;
  try{
   const data=await request('GET');if(!data)return;
   selectUser(data.user);ready=true;accept(data.fields);status('동기화 중…');
   while(Object.keys(pending).some(id=>!conflicts.has(id))){
    const sent=Object.entries(pending).filter(([id])=>!conflicts.has(id)).slice(0,100).map(([,c])=>({...c}));
    const result=await request('POST',sent);if(!result)return;
    if(result.user.id!==user.id)throw Error('account');accept(result.fields,sent);
   }
   status(conflicts.size?'다른 기기와 변경이 겹쳤어요':'서버에 저장됨 · '+new Date().toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'}));
  }catch(e){status(e.message==='account'?'로그인 계정 확인 중 · 다시 동기화해 주세요':ready?'연결 대기 · 변경은 이 기기에 보관 중':'연결 확인 필요 · 다시 동기화를 눌러 주세요');}
  finally{busy=false;}
 }
 function schedule(){clearTimeout(timer);timer=setTimeout(sync,700);}
 function change(id,patch){
  if(!ready){cfg.toast('계정 연결을 확인한 뒤 다시 눌러 주세요.');return false;}
  if(!user)return true;
  for(const f of F){if(!(f in patch))continue;const idf=k(id,f);pending[idf]={id,field:f,value:patch[f],base:remote[idf]?.revision||0,op:crypto.randomUUID()};conflicts.delete(idf);}
  try{persist();}catch{status('기기 저장 공간 부족 · 페이지를 닫기 전에 서버 저장을 확인해 주세요.');}
  status('저장 중…');schedule();return true;
 }
 function guestSave(records){if(!user)localStorage.setItem(GUEST,JSON.stringify(records));}
 function migrate(){if(!user||!ready)return;for(const [id,r]of Object.entries(loadGuest())){const patch={};for(const f of F)if(!remote[k(id,f)]&&!pending[k(id,f)])patch[f]=r[f];change(id,patch);}localStorage.setItem('gongjo-migrated-to:'+user.id,'1');document.querySelector('#migrateRecords').hidden=true;redraw();schedule();cfg.toast('기존 기록을 옮겨요. 이미 서버에 있는 항목은 유지해요.');}
 function resolve(keepLocal){for(const id of conflicts){if(keepLocal){pending[id].base=remote[id]?.revision||0;pending[id].op=crypto.randomUUID();}else delete pending[id];}conflicts.clear();persist();redraw();schedule();}
 function start(config){cfg=config;document.querySelector('#syncNow').onclick=sync;document.querySelector('#migrateRecords').onclick=migrate;document.querySelector('#keepLocal').onclick=()=>resolve(true);document.querySelector('#keepServer').onclick=()=>resolve(false);
 document.querySelector('#syncLogout').onclick=e=>{if(Object.keys(pending).length){e.preventDefault();cfg.toast('아직 서버에 저장되지 않은 변경이 있어요. 동기화를 완료한 뒤 로그아웃해 주세요.');}};
 window.addEventListener('focus',sync);window.addEventListener('online',sync);document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync();});window.addEventListener('beforeunload',e=>{if(Object.keys(pending).length){e.preventDefault();e.returnValue='';}});setInterval(sync,20000);sync();}
 return {start,change,guestSave,isReady:()=>ready};
})();
