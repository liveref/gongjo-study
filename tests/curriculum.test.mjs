import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
const files=['data.js','data-2018-23.js','data-2019.js','data-2020.js','data-2021-2024.js'];
const ctx=vm.createContext({window:{}});
for(const file of [...files,'curriculum.js','book-pages.js'])vm.runInContext(readFileSync(`public/${file}`,'utf8'),ctx);
const bank=JSON.parse(JSON.stringify(ctx.window.QUESTION_BANK)).map(q=>({year:2018,round:1,...q}));
const curriculum=JSON.parse(JSON.stringify(ctx.window.PDF_CURRICULUM));
const bookPages=JSON.parse(JSON.stringify(ctx.window.BOOK_START_PAGES));
const expected=JSON.parse(readFileSync('tests/pdf-order.json','utf8'));
test('all 314 parent rows exactly match sequence independently extracted from original PDF',()=>{
 assert.equal(curriculum.questions.length,314);
 assert.deepEqual(curriculum.questions.map(q=>q.key),expected.keys_extracted_from_original_pdf);
 assert.equal(new Set(curriculum.questions.map(q=>q.key)).size,314);
 assert.equal(createHash('sha256').update(readFileSync(`public/${curriculum.pdf}`)).digest('hex'),expected.sha256);
 const catOrder=['열전달','냉동부하','펌프','송풍기','냉동사이클','열교환기','공기조화','난방부하','냉방부하','냉각탑','덕트','보일러·급탕','냉동장치 운전','흡수식 냉동','배관·시공','전기제어','적산'];
 assert.deepEqual(curriculum.categories,catOrder);
 for(const row of curriculum.questions){const q=bank.find(q=>`${q.year}-${q.round}-${q.n}`===row.key);assert.ok(q);assert.equal(row.title,q.title);assert.equal(row.category,q.category);assert.equal(row.level,Math.max(...q.units.map(u=>u.level)));}
});
test('all original source text, photos metadata, 342 record keys, storage implementation and schema remain unchanged',()=>{
 for(const file of [...files.map(f=>`public/${f}`),'public/sync.js','lib/record-store.mjs','app/api/records/route.ts','db/schema.ts','.openai/hosting.json'])assert.equal(readFileSync(file,'utf8').replace(/\r\n/g,'\n').replace(",'wrongNote'",''),readFileSync(`tests/baseline/67bf553a9360f4b727053534f6231cd00e98dfa5/${file}`,'utf8').replace(/\r\n/g,'\n'));
});
class Element{
 constructor(tag='div'){this.tagName=tag;this.children=[];this.dataset={};this.style={};this.value='all';this.options=[{textContent:''}];this.classList={toggle(){},add(){},remove(){}};this.attrs={};this.hidden=false;this.open=false;}
 append(...xs){this.children.push(...xs);} prepend(...xs){this.children.unshift(...xs);} replaceChildren(...xs){this.children=[...xs];}
 setAttribute(k,v){this.attrs[k]=v;} getAttribute(k){return this.attrs[k];} querySelector(){return this.span??=new Element('span');} addEventListener(){} close(){this.open=false;} showModal(){this.open=true;}
}
function app(fixture={}){
 const elements=new Map();const get=s=>{if(!elements.has(s))elements.set(s,new Element());return elements.get(s);};
 const tabs=['all','calc','written','diagram'].map(mode=>{const e=new Element('button');e.dataset.mode=mode;return e;});
 get('#searchInput').value=''; get('#sortSelect').value='easy';
 const changes=[];
 const context=vm.createContext({window:{QUESTION_BANK:JSON.parse(JSON.stringify(bank)),PDF_CURRICULUM:curriculum,BOOK_START_PAGES:bookPages,StudySync:{start(){},change(...args){changes.push(args);return true;},guestSave(){},isReady(){return true;}},scrollTo(){}},localStorage:{getItem(){return JSON.stringify(fixture);}},document:{querySelector:get,querySelectorAll(s){return s==='[data-mode]'||s==='.tab'?tabs:[];},createElement:t=>new Element(t),createTextNode:s=>({textContent:s}),activeElement:null},setTimeout(){},clearTimeout(){}});
 vm.runInContext(readFileSync('public/app.js','utf8'),context);
 return {context,elements,get,changes};
}
test('actual default UI renders 314 unique PDF ordered cards; filters retain parent order and highest level',()=>{
 const {context,get,changes}=app();
 assert.deepEqual(get('#cards').children.map(c=>c.dataset.questionKey),expected.keys_extracted_from_original_pdf);
 assert.equal(get('#cards').children.length,314);assert.equal(changes.length,0);
 assert.deepEqual(get('#categories').children.slice(1).map(b=>b.textContent),curriculum.categories.map((s,i)=>`${String(i+1).padStart(2,'0')}. ${s}`));
 vm.runInContext("setMode('calc')",context);
 const filtered=curriculum.questions.filter(row=>bank.find(q=>`${q.year}-${q.round}-${q.n}`===row.key).units.some(u=>u.mode==='calc'));
 assert.deepEqual(get('#cards').children.map(c=>c.dataset.questionKey),filtered.map(q=>q.key));
 get('#levelSelect').value='3';vm.runInContext('renderCards()',context);
 assert.ok(get('#cards').children.some(c=>c.dataset.questionKey==='2019-1-2'));
 assert.ok(get('#cards').children.some(c=>c.dataset.questionKey==='2020-3-14'));
});
test('all cards show exam reference below title, no PDF list number, and keep the form in the footer',()=>{
 const {get,context}=app();
 const flatten=e=>[e.textContent??'',...e.children.flatMap(flatten)];
 for(const card of get('#cards').children){
  const q=bank.find(q=>`${q.year}-${q.round}-${q.n}`===card.dataset.questionKey);
  const open=card.children[0];
  assert.equal(open.children[1].tagName,'h3');
  assert.equal(open.children[2].className,'exam-reference');
  assert.equal(open.children[2].textContent,`${q.year}년 ${q.round}회 ${q.n}번 문제`);
  assert.ok(!flatten(card).join(' ').includes('PDF 목록'));
  assert.ok(!open.attrs['aria-label'].includes('PDF'));
  assert.ok(!flatten(card.children[1]).join(' ').includes(`${q.year}년`));
 }
 vm.runInContext("openProblem('2024-3-2-calc')",context);
 assert.equal(get('#detailMeta').textContent,'2024년 3회 2번 문제 · 원문 전체');
 assert.ok(!get('#promptText').value.includes('PDF 목록'));
 assert.match(readFileSync('public/style.css','utf8'),/\.card \.exam-reference\{color:#b3261e;/);
});
test('314 bold first textbook pages sit immediately below exam reference, with right-page starts verified separately',()=>{
 const {get}=app();assert.equal(Object.keys(bookPages).length,314);
 for(const card of get('#cards').children){const key=card.dataset.questionKey;const label=card.children[0].children[3];assert.equal(label.tagName,'strong');assert.equal(label.className,'textbook-page');assert.equal(label.textContent,`교재 ${bookPages[key]}쪽`);assert.ok(Number.isInteger(bookPages[key]));}
 for(const [key,page] of Object.entries({'2018-1-1':811,'2019-1-7':870,'2021-1-2':1013,'2022-2-1':1085,'2023-1-1':1119,'2024-3-2':1225,'2024-3-14':1242}))assert.equal(bookPages[key],page);
 for(const q of bank){const first=q.pages[0];const span=typeof first==='number'?[first-4369]:String(first.page).match(/\d+/g).map(Number);const start=bookPages[`${q.year}-${q.round}-${q.n}`];assert.ok(start>=span[0]&&start<=span.at(-1));}
});
test('existing split records remain stored without automatic writes after detail controls are removed',()=>{
 const fixture={'2018-1-3-calc':{memo:'계산 메모',rounds:4,status:'done',bookmark:true,hidden:false},'2018-1-3-diagram':{memo:'선도 메모',rounds:2,status:'review',bookmark:false,hidden:true}};
 const {context,get,changes}=app(fixture);
 vm.runInContext("openProblem('2018-1-3-calc')",context);assert.equal(vm.runInContext("record('2018-1-3-calc').memo",context),'계산 메모');
 assert.match(get('#promptText').value,/원문 전체/);assert.match(get('#promptText').value,/교재의 \(1\)번부터/);
 vm.runInContext("openProblem('2018-1-3-diagram')",context);assert.equal(vm.runInContext("record('2018-1-3-diagram').memo",context),'선도 메모');
 assert.equal(vm.runInContext("record('2018-1-3-calc').rounds",context),4);
 assert.equal(vm.runInContext("record('2018-1-3-diagram').rounds",context),2);
 assert.equal(changes.length,0);
 vm.runInContext('showPdfGuide()',context);
 for(const text of curriculum.guidePages)assert.ok(get('#infoBody').innerHTML.includes(text.slice(0,20)));
});


test('wrong-note toggle groups the whole original question, colors cards, filters independently and preserves existing progress',()=>{
 const id='2018-1-3-calc';const {context,get,changes}=app({[id]:{rounds:4,memo:'기존 메모',hidden:false}});
 vm.runInContext("wrongNoteControl(units.find(u=>u.id==='2018-1-3-diagram')).onclick()",context);
 const card=get('#cards').children.find(c=>c.dataset.questionKey==='2018-1-3');assert.match(card.className,/wrong-note-card/);
 assert.equal(get('#wrongCount').textContent,1);
 vm.runInContext("view='wrong';renderCards()",context);assert.deepEqual(get('#cards').children.map(c=>c.dataset.questionKey),['2018-1-3']);
 assert.equal(vm.runInContext("record('2018-1-3-calc').rounds",context),4);assert.equal(vm.runInContext("record('2018-1-3-calc').memo",context),'기존 메모');
 vm.runInContext("wrongNoteControl(units.find(u=>u.id==='2018-1-3-diagram')).onclick()",context);assert.equal(get('#cards').children.length,0);assert.equal(changes.length,2);
});
