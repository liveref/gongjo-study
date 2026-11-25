import {test} from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs';
const source=fs.readFileSync('public/sync.js','utf8');
function device(server,account='A',storage=new Map()){
 const nodes=new Map(),el=id=>{if(!nodes.has(id))nodes.set(id,{hidden:false,textContent:''});return nodes.get(id)};
 let current={},online=true;const window={addEventListener(){}};
 const ctx=vm.createContext({window,document:{hidden:false,querySelector:el,addEventListener(){}},localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},crypto,AbortSignal,Date,setTimeout:()=>1,clearTimeout(){},setInterval(){},fetch:async(url,opts)=>{
  if(!online)throw Error('offline');if(!account)return{status:401,ok:false};const rows=server[account]??=(new Map());
  if(opts.method==='POST'){const b=JSON.parse(opts.body);if(b.accountId!==account)return {status:409,ok:false};for(const c of b.changes){const key=c.id+':'+c.field,r=rows.get(key);if(!r&&c.base===0||r&&(r.revision===c.base||r.op===c.op))rows.set(key,{...c,revision:c.base+1});}}
  return {status:200,ok:true,json:async()=>({user:{id:account,name:account},fields:[...rows.values()].map(r=>({...r}))})};
 }});
 vm.runInContext(source,ctx);window.StudySync.start({validate:x=>x,replace:x=>{current=x},toast(){}});
 return{sync:()=>el('#syncNow').onclick(),api:window.StudySync,el,storage,records:()=>current,offline:v=>online=!v,account:v=>account=v};
}
const tick=()=>new Promise(r=>setImmediate(r));const id='2018-1-10-calc';
test('two clients sync, offline queue reload, conflict resolution and account switch',async()=>{
 const server={},a=device(server),b=device(server);await tick();a.api.change(id,{rounds:3,hidden:true});await a.sync();await b.sync();assert.equal(b.records()[id].rounds,3);assert.equal(b.records()[id].hidden,true);
 b.offline(true);b.api.change(id,{memo:'offline memo'});await b.sync();const reloaded=device(server,'A',b.storage);await tick();await reloaded.sync();await a.sync();assert.equal(a.records()[id].memo,'offline memo');
 a.api.change(id,{rounds:4});reloaded.api.change(id,{rounds:1});await a.sync();await reloaded.sync();assert.equal(reloaded.el('#syncConflict').hidden,false);assert.equal(reloaded.records()[id].rounds,1);
 reloaded.el('#keepServer').onclick();await reloaded.sync();assert.equal(reloaded.records()[id].rounds,4);
 reloaded.account('B');await reloaded.sync();assert.equal(Object.keys(reloaded.records()).length,0);reloaded.api.change(id,{rounds:2});await reloaded.sync();await a.sync();assert.equal(a.records()[id].rounds,4);
});
test('legacy migration preserves existing server fields; logged out records stay local',async()=>{
 const server={},storage=new Map([['gongjo-study-records-v1',JSON.stringify({[id]:{rounds:5,memo:'old memo',hidden:false,bookmark:true,status:'done'}})]]);const a=device(server);await tick();a.api.change(id,{rounds:2});await a.sync();const b=device(server,'A',storage);await tick();b.el('#migrateRecords').onclick();await b.sync();assert.equal(b.records()[id].rounds,2);assert.equal(b.records()[id].memo,'old memo');
 b.account(null);await b.sync();assert.equal(b.api.change(id,{rounds:1}),true);b.api.guestSave({[id]:{rounds:1}});assert.equal(server.A.get(id+':rounds').value,2);
});

test('wrong note survives reload and syncs to another device',async()=>{const server={},a=device(server),b=device(server);await tick();a.api.change(id,{wrongNote:true});await a.sync();await b.sync();assert.equal(b.records()[id].wrongNote,true);const reloaded=device(server,'A',b.storage);await tick();assert.equal(reloaded.records()[id].wrongNote,true);reloaded.api.change(id,{wrongNote:false});await reloaded.sync();await a.sync();assert.equal(a.records()[id].wrongNote,false);});
