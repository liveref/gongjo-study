import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import vm from 'node:vm';

const files=['public/data.js','public/data-2018-23.js','public/data-2019.js','public/data-2020.js'];
function catalog(original=false){
 const context=vm.createContext({window:{}});
 for(const f of files){
  const text=original?readFileSync(`tests/baseline/ef715000ff7f2c4a4ea8e969267da0e7dc36773b/${f}`,'utf8'):readFileSync(f,'utf8');
  vm.runInContext(text,context);
 }
 if(!original)vm.runInContext(readFileSync('public/data-2021-2024.js','utf8'),context);
 return JSON.parse(JSON.stringify(context.window.QUESTION_BANK));
}
const bank=catalog();
const unitIds=qs=>qs.flatMap(q=>q.units.map(u=>`${q.year??2018}-${q.round??1}-${q.n}-${u.mode}`));
test('existing questions and record identities survive unchanged',()=>{
 const old=catalog(true);
 assert.equal(old.length,146);
 assert.deepEqual(bank.slice(0,146),old);
 assert.deepEqual(unitIds(bank.slice(0,146)),unitIds(old));
 for(const f of ['public/sync.js','lib/record-store.mjs','app/api/records/route.ts','db/schema.ts','.openai/hosting.json']){
  assert.equal(readFileSync(f,'utf8').replace(/\r\n/g,'\n').replace(",'wrongNote'",''),readFileSync(`tests/baseline/ef715000ff7f2c4a4ea8e969267da0e7dc36773b/${f}`,'utf8').replace(/\r\n/g,'\n'));
 }
});
test('168 additions: complete sessions, valid modes, unique IDs, complete photo references',()=>{
 const added=bank.slice(146);assert.equal(added.length,168);assert.equal(bank.length,314);
 for(let y=2021;y<=2024;y++)for(let s=1;s<=3;s++)assert.deepEqual(added.filter(q=>q.year===y&&q.round===s).map(q=>q.n),Array.from({length:14},(_,i)=>i+1));
 const ids=unitIds(bank);assert.equal(ids.length,342);assert.equal(new Set(ids).size,ids.length);
 const photos=new Set();
 for(const q of added){
  assert.equal(q.sourceZip,'IMG_5591.zip');assert.ok(q.title&&q.category&&q.summary);
  for(const u of q.units){assert.ok(['calc','written','diagram'].includes(u.mode));assert.ok([1,2,3].includes(u.level));assert.ok(u.part&&u.focus);}
  for(const p of q.pages){assert.ok(existsSync(`public/${p.asset}`),p.asset);photos.add(p.asset);}
 }
 assert.equal(photos.size,116);assert.equal(readdirSync('public/assets/2021-2024').length,116);
});
test('mixed source demands get separate learning items; chart lookup alone stays calculation',()=>{
 const q=(y,s,n)=>bank.find(q=>q.year===y&&q.round===s&&q.n===n);
 assert.deepEqual(q(2024,1,3).units.map(u=>u.mode),['diagram','written']);
 assert.deepEqual(q(2024,3,6).units.map(u=>u.mode),['written','calc']);
 assert.deepEqual(q(2022,3,2).units.map(u=>u.mode),['calc','diagram']);
 assert.deepEqual(q(2023,1,10).units.map(u=>u.mode),['calc']);
 const html=readFileSync('app/library.html','utf8');
 assert.ok(html.indexOf('data-2021-2024.js')<html.indexOf('src="app.js"'));
});
