'use strict';
const $ = s => document.querySelector(s);
const KEY = 'gongjo-study-records-v1';
const bank = window.QUESTION_BANK.map(q=>({year:2018,round:1,sourceZip:'18년1회.zip',...q}));
const pageNumber = p => typeof p==='number'?p-4369:p.page;
const pageFile = p => typeof p==='number'?`IMG_${p}.JPG`:p.filename;
const pageAsset = p => typeof p==='number'?`assets/IMG_${p}.jpg`:p.asset;
const examLabel = q => `${q.year}년 ${q.round}회`;
const units = bank.flatMap(q => q.units.map(u => ({...q,...u,id:`${q.year}-${q.round}-${q.n}-${u.mode}`})));
const curriculum=window.PDF_CURRICULUM;
const keyOf=q=>`${q.year}-${q.round}-${q.n}`;
const questions=curriculum.questions.map(entry=>{
 const q=bank.find(q=>keyOf(q)===entry.key);
 if(!q||q.title!==entry.title||q.category!==entry.category)throw new Error('PDF 기준 데이터와 일치하지 않습니다.');
 const parts=units.filter(u=>keyOf(u)===entry.key);
 return {...q,...entry,parts};
});
const partsOf=q=>questions.find(x=>keyOf(x)===keyOf(q)).parts;
const questionFor=u=>questions.find(q=>keyOf(q)===keyOf(u));
const modeMatches=q=>mode==='all'||q.parts.some(u=>u.mode===mode);
const visibleParts=q=>q.parts.filter(u=>!record(u.id).hidden);
const isHidden=q=>!visibleParts(q).length;
const inWrongNote=q=>q.parts.some(u=>record(u.id).wrongNote);
const allDone=q=>q.parts.every(u=>record(u.id).status==='done');
const modes = {calc:'계산문제',written:'서술형',diagram:'그림·선도'};
const pdfModes = {calc:'계산',written:'서술',diagram:'도면·선도'};
const levels = {1:'🌱 기초',2:'🌿 응용',3:'🌳 종합'};
const states = {new:'아직 안 풀었어요',review:'다시 풀어볼래요',done:'혼자 풀었어요'};
let records={},mode='all',category='all',view='all',current=null,toastTimer;
try {records=validateRecords(JSON.parse(localStorage.getItem(KEY)||'{}'));} catch {records={};}
function validateRecords(value){
 if(!value||typeof value!=='object'||Array.isArray(value)) throw new Error('기록 형식이 올바르지 않아요.');
 const clean={};
 for(const [id,r] of Object.entries(value)){
  if(!/^\d{4}-\d+-\d+-(calc|written|diagram)$/.test(id)||!r||typeof r!=='object')continue;
  clean[id]={status:Object.hasOwn(states,r.status)?r.status:'new',bookmark:r.bookmark===true,memo:typeof r.memo==='string'?r.memo.slice(0,5000):'',rounds:Number.isInteger(r.rounds)?Math.max(0,Math.min(5,r.rounds)):0,hidden:r.hidden===true,wrongNote:r.wrongNote===true};
 }
 return clean;
}
function record(id){return records[id]||{status:'new',bookmark:false,memo:'',rounds:0,hidden:false,wrongNote:false};}
function save(id,change){if(!window.StudySync.change(id,change))return;records[id]={...record(id),...change};try{window.StudySync.guestSave(records);}catch{toast('저장 공간이 부족하거나 저장이 차단됐어요. 기록을 백업해 주세요.');}updateStats();renderCards();}
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3500);}
function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
function updateStats(){
 $('#allCount').textContent=questions.filter(q=>!isHidden(q)).length;
 $('#wrongCount').textContent=questions.filter(inWrongNote).length;
 $('#hiddenCount').textContent=questions.filter(q=>q.parts.some(u=>record(u.id).hidden)).length;
 $('#questionTotal').textContent=bank.length;
 $('#unitTotal').textContent=units.length;
 $('#unitDenominator').textContent=`/ ${questions.length} 문제`;
 document.querySelectorAll('[data-mode]').forEach(b=>b.querySelector('span').textContent=questions.filter(q=>(b.dataset.mode==='all'||q.parts.some(u=>u.mode===b.dataset.mode))&&(view==='wrong'?inWrongNote(q):view==='hidden'?q.parts.some(u=>record(u.id).hidden):!isHidden(q))).length);
 const known=units.map(u=>record(u.id));
 const bookmarks=known.filter(r=>r.bookmark&&!r.hidden).length,review=known.filter(r=>r.status==='review'&&!r.hidden).length,done=known.filter(r=>r.status==='done').length;
 $('#bookCount').textContent=questions.filter(q=>visibleParts(q).some(u=>record(u.id).bookmark)).length;
 $('#reviewCount').textContent=questions.filter(q=>visibleParts(q).some(u=>record(u.id).status==='review')).length;
 $('#doneCount').textContent=questions.filter(q=>!isHidden(q)&&allDone(q)).length;
 const doneQuestions=questions.filter(allDone).length;$('#completedStat').textContent=doneQuestions;$('#progressBar').style.width=`${doneQuestions/questions.length*100}%`;
}
function renderCategories(){
 const cats=curriculum.categories.filter(c=>questions.some(q=>q.category===c&&modeMatches(q)));
 if(!cats.includes(category))category='all';
 $('#categories').replaceChildren();
 for(const c of ['all',...cats]){const b=el('button',`category${category===c?' active':''}`,c==='all'?'전체 유형':`${String(curriculum.categories.indexOf(c)+1).padStart(2,'0')}. ${c}`);b.setAttribute('aria-pressed',String(category===c));b.onclick=()=>{category=c;renderCategories();renderCards();};$('#categories').append(b);}
}
function filtered(){
 const s=$('#searchInput').value.trim().toLowerCase();const lv=$('#levelSelect').value;
 const exam=$('#examSelect').value;
 return questions.filter(q=>modeMatches(q)&&(exam==='all'||`${q.year}-${q.round}`===exam)&&(category==='all'||q.category===category)&&(lv==='all'||String(q.level)===lv)&&(`${q.n}번 ${q.title} ${q.category} ${q.tags.join(' ')} ${q.summary} ${examLabel(q)}`.toLowerCase().includes(s))&&(view==='wrong'?inWrongNote(q):view==='hidden'?q.parts.some(u=>record(u.id).hidden):!isHidden(q)&&(view==='all'||(view==='bookmarks'?visibleParts(q).some(u=>record(u.id).bookmark):view==='done'?allDone(q):visibleParts(q).some(u=>record(u.id).status===view))))).sort((a,b)=>$('#sortSelect').value==='number'?a.n-b.n||a.number-b.number:a.number-b.number);
}
function renderCards(){
 const list=filtered();$('#cards').replaceChildren();$('#empty').hidden=!!list.length;
 const count=el('b','',String(list.length));$('#resultCount').replaceChildren(count,document.createTextNode(`문제 · ${mode==='all'?'PDF와 같은 원문 목록':modes[mode]+' 포함 원문'} · PDF 순서 유지`));
 for(const q of list){
  const card=el('article','card'+(inWrongNote(q)?' wrong-note-card':'')),open=el('button','card-open');card.dataset.pdfNumber=q.number;card.dataset.questionKey=q.key;
  const id=q.parts[0].id;open.setAttribute('aria-label',`${examLabel(q)} ${q.n}번 문제 · ${q.title}, ${levels[q.level]}, 원문 전체 열기`);open.onclick=()=>openProblem(id);
  const top=el('div','card-top');top.append(el('span','type-label',`${String(curriculum.categories.indexOf(q.category)+1).padStart(2,'0')}. ${q.category}`),el('span',`level level-${q.level}`,levels[q.level]));open.append(top,el('h3','',q.title),el('p','exam-reference',`${examLabel(q)} ${q.n}번 문제`),el('strong','textbook-page',`교재 ${window.BOOK_START_PAGES[q.key]}쪽`));
  if(new Set(q.parts.map(u=>u.level)).size>1)open.append(el('p','',`부분별: ${q.parts.map(u=>`${pdfModes[u.mode]} ${levels[u.level].slice(3)}`).join(' / ')}`));
  const tags=el('div','tags');q.tags.forEach(t=>tags.append(el('span','',`#${t}`)));open.append(tags);
  const bottom=el('div','card-bottom');bottom.append(el('span','',q.parts.map(u=>pdfModes[u.mode]).join(' / ')),el('span','','원문 전체 꺼내기 →'));card.append(open,bottom);
  for(const part of q.parts){const controls=el('div','practice-controls');const label=el('button','text-button',`기존 기록 · ${modes[part.mode]}${q.parts.length>1?' · '+part.part:''} ↗`);label.onclick=()=>openProblem(part.id);controls.append(label,roundControls(part),problemActions(part));card.append(controls);}
  $('#cards').append(card);
 }
}
function roundControls(u){
 const box=el('div','round-controls'),value=record(u.id).rounds||0;
 box.setAttribute('role','group');box.setAttribute('aria-label',examLabel(u)+' '+u.n+'번 '+modes[u.mode]+' 회독수');
 const stars=el('div','round-stars');
 for(let n=1;n<=5;n++){const b=el('button','round-star'+(n<=value?' filled':''),n<=value?'★':'☆');b.type='button';b.setAttribute('aria-label',n+'회독으로 설정');b.setAttribute('aria-pressed',String(n<=value));b.onclick=()=>{save(u.id,{rounds:n===value?n-1:n});if(current)refreshDetail();};stars.append(b);}
 box.append(el('span','round-label',value+' / 5회독'),stars);return box;
}
function hideControl(u){const hidden=record(u.id).hidden,b=el('button','hide-problem',hidden?'다시 꺼내기':'자신 있어요 · 숨기기');b.type='button';b.setAttribute('aria-label',examLabel(u)+' '+u.n+'번 '+modes[u.mode]+' '+(hidden?'숨김 해제':'숨기기'));b.onclick=()=>{save(u.id,{hidden:!record(u.id).hidden});if(current)refreshDetail();toast(hidden?'기본 문제 목록에 다시 꺼냈어요.':'숨긴 문제로 옮겼어요. 언제든 다시 꺼낼 수 있어요.');};return b;}
function problemActions(u){const actions=el('div','problem-actions');actions.append(hideControl(u),wrongNoteControl(u));return actions;}
function wrongNoteControl(u){const q=questionFor(u),active=inWrongNote(q),b=el('button','wrong-note-button'+(active?' selected':''),active?'오답노트 ✓':'오답노트');b.type='button';b.setAttribute('aria-label',`${examLabel(q)} ${q.n}번 문제 오답노트 ${active?'해제':'추가'}`);b.setAttribute('aria-pressed',String(active));b.onclick=()=>{if(active){for(const p of q.parts.filter(p=>record(p.id).wrongNote))save(p.id,{wrongNote:false});}else save(q.parts[0].id,{wrongNote:true});if(current)refreshDetail();};return b;}
function setMode(next){mode=next;category='all';document.querySelectorAll('.tab').forEach(b=>{const active=b.dataset.mode===mode;b.classList.toggle('active',active);b.setAttribute('aria-selected',String(active));});renderCategories();renderCards();}
function promptFor(u){return `공조냉동기계기사 실기 ${examLabel(u)} ${u.n}번의 ${u.part}을 함께 공부하고 싶어요.\n유형: ${u.category} / ${modes[u.mode]}\n문제 요약:\n${u.summary}\n\n원본: ${u.sourceZip}의 ${u.pages.map(pageFile).join(', ')} (교재 ${u.pages.map(pageNumber).join(', ')}쪽).\n첨부 자료를 확인하고, 확인되지 않는 조건은 추측하지 마세요. 원본이 보이지 않으면 사진을 요청해 주세요.\n저는 노베이스예요. 기본 개념과 용어부터 쉬운 비유로 설명해 주세요. 그림 → 짧은 설명 → 확인 질문${u.mode==='calc'?' → 빈칸 계산':''} 순서로 한 단계씩 진행하고 제 답을 기다려 주세요. ${u.mode==='written'?'제 답을 먼저 듣고 빠진 핵심을 보완한 뒤 시험용 답안으로 정리해 주세요. ':''}공식은 처음에 기호 분수식과 한글 분수식을 함께 보여주고, 기호의 뜻과 단위를 빠짐없이 설명해 주세요. 마지막에는 답과 자주 하는 실수, 시험 함정, 복습문제를 정리해 주세요. 발랄하고 다정한 말투로 알려주세요.`;}
function openProblem(id){
 const u=units.find(x=>x.id===id);if(!u)return;current=u;
 const q=questionFor(u);
 $('#detailMeta').textContent=`${examLabel(u)} ${u.n}번 문제 · 원문 전체`;$('#detailTitle').textContent=u.title;$('#detailSummary').textContent=u.summary.replace(/\n?전체 조건과 소문항은 원본 사진을 확인해 주세요\. 사진에는 인접 문제와 교재 풀이도 포함됩니다\./g,'').trim();
 $('#detailTags').replaceChildren(...[q.category,levels[q.level],q.parts.map(p=>modes[p.mode]).join(' / ')].map(t=>el('span','',t)));
 $('#pageLabel').textContent=`교재 ${u.pages.map(pageNumber).join(' · ')}쪽`;
 $('#sourceImages').hidden=true;$('#sourceImages').replaceChildren();$('#sourceToggle').setAttribute('aria-expanded','false');$('#sourceToggle').textContent='원본 펼치기 · 풀이 포함 ↓';
 $('#promptText').value=promptForWhole(u);refreshDetail();
 const d=$('#problemDialog');if(!d.open)d.showModal();d.scrollTop=0;
}
function refreshDetail(){$('#detailPractice').replaceChildren(roundControls(current),problemActions(current));}
function showInfo(title,html){$('#infoTitle').textContent=title;$('#infoBody').innerHTML=html;$('#infoDialog').showModal();}
$('#sourceToggle').onclick=()=>{
 const box=$('#sourceImages'),show=box.hidden;box.hidden=!show;$('#sourceToggle').setAttribute('aria-expanded',String(show));$('#sourceToggle').textContent=show?'원본 접기 ↑':'원본 펼치기 · 풀이 포함 ↓';
 if(show&&!box.children.length)current.pages.forEach(p=>{const f=el('figure','source-page'),caption=el('figcaption'),link=el('a','','크게 열기 ↗');link.href=pageAsset(p);link.target='_blank';link.rel='noopener';caption.append(document.createTextNode(`${pageFile(p)} · ${pageNumber(p)}쪽`),link);const img=el('img');img.src=link.href;img.alt=`${examLabel(current)} ${current.n}번 원본 교재 사진 ${pageNumber(p)}쪽. 같은 페이지의 다른 문제와 풀이가 포함될 수 있습니다.`;img.loading='lazy';img.width=1600;img.height=2133;f.append(caption,img);box.append(f);});
};
$('#copyPrompt').onclick=async()=>{try{await navigator.clipboard.writeText($('#promptText').value);toast('학습 요청을 복사했어요. ChatGPT에 붙여넣어 주세요.');}catch{$('#promptText').closest('details').open=true;$('#promptText').focus();$('#promptText').select();toast('요청 내용을 길게 눌러 복사해 주세요.');}};
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>b.closest('dialog').close());
document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{view=b.dataset.view;document.querySelectorAll('[data-view]').forEach(x=>x.classList.toggle('active',x===b));$('#viewTitle').textContent={all:'내 문제 서재',wrong:'오답노트',bookmarks:'다시 꺼내 보고 싶은 문제',review:'조금 더 연습할 문제',done:'혼자 풀어낸 문제',hidden:'숨긴 문제 · 언제든 다시 꺼내요'}[view];updateStats();renderCards();});
$('#searchInput').oninput=renderCards;$('#levelSelect').onchange=renderCards;$('#examSelect').onchange=renderCards;$('#sortSelect').onchange=renderCards;
$('#resetBtn').onclick=()=>{category='all';$('#examSelect').value='all';$('#searchInput').value='';$('#levelSelect').value='all';view='all';document.querySelector('[data-view="all"]').click();renderCategories();renderCards();};
$('.brand').onclick=e=>{e.preventDefault();$('#resetBtn').click();setMode('all');window.scrollTo({top:0,behavior:'smooth'});};
$('#levelInfo').onclick=()=>showInfo('난이도는 이렇게 나눴어요',`<p>공식 난이도나 출제 빈도가 아닌, 노베이스 학습자를 위한 초기 학습 순서예요.</p><h3>🌱 기초</h3><p>개념 하나와 간단한 계산 또는 그림 구별부터 시작해요.</p><h3>🌿 응용</h3><p>조건 판단과 여러 단계 계산, 원인과 결과를 연결해요.</p><h3>🌳 종합</h3><p>도면·선도·장치의 흐름을 읽고 여러 개념을 함께 사용해요.</p><p>‘쉬운 순서’는 난이도 → 권장 학습 순서로 정렬해요. 배점만으로 난이도를 정하지 않았어요.</p>`);
const backupControls=`<h3>학습 기록 관리</h3><p>로그인하면 진도·회독수·숨김·책갈피·메모가 계정별로 서버에 저장돼요. 다른 기기도 같은 ChatGPT 계정으로 로그인하세요. 연결이 끊기면 변경을 기기에 보관했다가 다시 연결될 때 전송해요. 로그인하지 않은 기록은 현재 브라우저에만 저장돼요.</p><button class="outline" onclick="exportRecords()">기록 백업 ↓</button> <button class="outline" onclick="document.querySelector('#importFile').click()">기록 복원 ↑</button>`;
$('#guideBtn').onclick=()=>showInfo('차곡차곡, 이렇게 사용해요',`<ol><li>계산·서술·그림/선도 중 하나를 선택해요.</li><li>유형을 고르면 쉬운 순서대로 문제가 보여요.</li><li>문제를 열어 요약과 원본을 확인해요. 원본에는 교재 풀이도 포함돼요.</li><li>‘학습 요청 복사’를 누르고 자료를 올린 ChatGPT 대화에 붙여넣어요. 새 대화에는 문제 사진도 첨부해 주세요.</li><li>공부한 뒤 별을 눌러 1~5회독을 표시해요. 현재 마지막으로 채운 별을 다시 누르면 한 단계 줄어들어요. 상태와 메모도 남길 수 있어요.</li><li>자신 있는 문제는 ‘숨기기’를 눌러 기본 목록에서 빼세요. ‘숨긴 문제’에서 ‘다시 꺼내기’로 해제해요. 계산·서술·선도로 나눈 학습 항목은 각각 기록해요.</li></ol><p>이 웹앱은 GPT API를 사용하지 않아요. 자동 채점이나 AI 대화 기능은 없으며, 공부는 ChatGPT에서 진행해요.</p>${backupControls}`);
$('#dataBtn').onclick=()=>showInfo('내 문제은행의 자료',`<h3>현재 수록</h3><p>2018년 1·2·3회 / 각 1~15번<br>2019년 1회 1~15번 · 2·3회 1~14번<br>2020년 1·2회 1~15번 · 3·4회 1~14번<br>2021~2024년 각 1·2·3회 / 각 1~14번<br>교재 811~1242쪽<br>출처: 18년1회.zip, 18년2회3회.zip, 19년도.zip, 20년.zip, IMG_5591.zip</p><p>문제 요약은 원본을 확인해 작성했어요. 계산에 필요한 전체 조건·도면·상태값은 원본 사진을 기준으로 확인해 주세요.</p><h3>${bank.length}문제, ${units.length}개 학습 항목</h3><p>계산·서술·도면이 함께 있는 문제는 학습 항목을 나누었어요. 난이도는 공식 등급이 아니라 초보자를 위한 권장 학습 순서예요. 각 학습 항목의 진도와 메모는 따로 저장돼요.</p><h3>다음 회차를 추가하려면</h3><p>이 문제은행을 만든 ChatGPT/Codex 대화에 새 자료를 올려 주세요. 원본 확인 → 소문항 구분 → 유형·난이도 검토 후 문제은행에 추가하는 방식이에요. 웹앱 자체의 자동 분류 기능은 없어요.</p>${backupControls}<p><button class="outline" onclick="document.querySelector('#infoDialog').close();document.querySelector('#guideBtn').click()">사용 방법 보기 →</button></p>`);
function exportRecords(){const data={schemaVersion:1,exportedAt:new Date().toISOString(),records};const a=document.createElement('a');const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));a.href=url;a.download=`공조-학습기록-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('학습 기록을 백업했어요.');}
window.exportRecords=exportRecords;$('#exportBtn').onclick=exportRecords;$('#importBtn').onclick=()=>$('#importFile').click();
$('#importFile').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>2_000_000)throw new Error('백업 파일 크기를 확인해 주세요.');const parsed=JSON.parse(await f.text());if(parsed.schemaVersion!==1)throw new Error('지원하지 않는 백업 형식이에요.');const imported=validateRecords(parsed.records);if(!Object.keys(imported).length)throw new Error('복원할 학습 기록이 없어요.');if(!confirm('백업 기록을 합칠까요? 같은 항목의 현재 기록은 백업 내용으로 바뀝니다.'))return;const merged={...records,...imported};if(!window.StudySync.isReady())throw new Error('계정 연결 확인 후 다시 복원해 주세요.');for(const [id,r] of Object.entries(imported))window.StudySync.change(id,r);window.StudySync.guestSave(merged);records=merged;updateStats();renderCards();if(current)refreshDetail();toast('학습 기록을 복원했어요.');}catch(err){toast(err instanceof SyntaxError?'올바른 학습 기록 JSON 파일을 선택해 주세요.':err.message);}finally{e.target.value='';}};
for(const label of [...new Set(bank.map(q=>`${q.year}-${q.round}`))].sort().reverse()){const [year,round]=label.split('-');const opt=el('option','',`${year}년 ${round}회`);opt.value=label;$('#examSelect').append(opt);}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function promptForWhole(u){const q=questionFor(u);return `공조냉동기계기사 실기 ${examLabel(q)} ${q.n}번 원문 전체를 함께 공부하고 싶어요.\n유형: ${q.category} / 대표 난이도: ${levels[q.level]}\n포함 형태: ${q.parts.map(p=>modes[p.mode]).join(' / ')}\n문제 요약:\n${q.summary}\n\n원본: ${q.sourceZip}의 ${q.pages.map(pageFile).join(', ')} (교재 ${q.pages.map(pageNumber).join(', ')}쪽).\n소문항은 따로 떼지 말고 교재의 (1)번부터 순서대로 진행하고, 앞에서 구한 값이 필요하면 연결해 주세요. 자료에서 확인되지 않는 내용은 추측하지 마세요. 원본이 보이지 않으면 사진을 요청해 주세요.\n저는 노베이스예요. 기본 개념과 용어부터 쉬운 비유로, 그림 → 짧은 설명 → 확인 질문 → 빈칸 계산 순서로 한 단계씩 진행하고 제 답을 기다려 주세요. 공식은 처음에 기호 분수식 = 한글 분수식을 한 줄에 함께 표시하고 기호의 뜻과 단위를 설명해 주세요. 마지막에는 답·자주 하는 실수·시험 함정·복습문제를 정리해 주세요.`;}
function showPdfGuide(){showInfo('PDF와 같은 선수학습 순서',`<p><a class="outline" href="${curriculum.pdf}" target="_blank" rel="noopener">동일한 PDF 열기 · 원문 314문제 ↗</a></p>${curriculum.guidePages.map((text,i)=>`<h3>PDF ${i+1}쪽</h3><pre style="white-space:pre-wrap;font:inherit;line-height:1.8">${escapeHtml(text)}</pre>`).join('')}<h3>기존 기록 보존</h3><p>기본 목록은 원문 314문제이며, 포함 형태 필터도 같은 원문을 한 번만 표시합니다. 기존 342개 항목의 회독·상태·책갈피·메모·숨김은 기존 식별자로 유지됩니다. 한 원문의 모든 부분을 완료한 경우에만 ‘모든 부분을 혼자 풀었어요’에 계산됩니다. 일부만 숨긴 원문은 다른 부분을 계속 볼 수 있습니다.</p>${backupControls}`);}
$('#guideBtn').onclick=showPdfGuide;
$('#levelInfo').onclick=showPdfGuide;
$('#dataBtn').onclick=()=>showInfo('PDF 기준 자료 안내',`<p>2018~2024년 22회차, 원문 314문제입니다. 유형별 순서·대표 난이도·문제명·연도·회차·번호는 선수학습 순서 PDF 그대로입니다. 계산·서술·도면은 포함 형태이며 원문을 나눠 표시하지 않습니다.</p><p>교재 811~1242쪽 / 출처: 18년1회.zip, 18년2회3회.zip, 19년도.zip, 20년.zip, IMG_5591.zip. 원본 사진과 기존 문제 데이터는 변경하지 않았습니다.</p><p><a href="${curriculum.pdf}" target="_blank" rel="noopener">동일한 PDF 열기 ↗</a></p><button class="outline" id="openPdfGuide">PDF 학습 방법과 순서 선정 이유</button>${backupControls}`);
$('#infoBody').addEventListener('click',e=>{if(e.target.id==='openPdfGuide')showPdfGuide();});
$('#sortSelect').options[0].textContent='PDF 선수학습 순서';
$('#sortSelect').value='easy';
updateStats();renderCategories();renderCards();


window.StudySync.start({validate:validateRecords,toast,replace:next=>{records=next;updateStats();renderCards();if(current)refreshDetail();}});
