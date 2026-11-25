'use strict';
window.StudySync=(()=>{
 const KEY='gongjo-study-records-v1';
 let config,ready=false;
 function load(){try{return config.validate(JSON.parse(localStorage.getItem(KEY)||'{}'));}catch{return {};}}
 function status(text){document.querySelector('#syncStatus').textContent=text;}
 function start(next){
  config=next;ready=true;
  document.querySelector('#syncAccount').textContent='이 브라우저에 학습 기록 저장';
  status('회독·오답노트는 이 브라우저에 저장돼요. 다른 기기로 옮길 때는 기록 백업·복원을 사용해 주세요.');
  for(const id of ['syncLogin','syncLogout','migrateRecords','syncConflict'])document.querySelector('#'+id).hidden=true;
  const button=document.querySelector('#syncNow');button.textContent='저장 기록 다시 불러오기';
  button.onclick=()=>{config.replace(load());status('이 브라우저의 저장 기록을 불러왔어요.');};
  window.addEventListener('storage',event=>{if(event.key===KEY)config.replace(load());});
  config.replace(load());
 }
 function guestSave(records){localStorage.setItem(KEY,JSON.stringify(records));status('이 브라우저에 저장됨');}
 return {start,change:()=>ready,guestSave,isReady:()=>ready};
})();
