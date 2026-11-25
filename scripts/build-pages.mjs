import {cp,mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const output=resolve('pages-dist');
await mkdir(output,{recursive:true});
await cp('public',output,{recursive:true});
let html=await readFile('app/library.html','utf8');
html=html.replace('src="sync.js"','src="sync-pages.js"')
 .replace('로그인하면 기기 간 자동 동기화','기록은 이 브라우저에 저장')
 .replace('aria-label="계정과 자동 동기화"','aria-label="학습 기록 저장"')
 .replace('id="syncAccount">계정 연결 확인 중','id="syncAccount">이 브라우저에 학습 기록 저장')
 .replace('기존 기록을 안전하게 불러오고 있어요.','이 브라우저의 기록을 불러오고 있어요.')
 .replace('<a id="syncLogin"','<a hidden id="syncLogin"');
await writeFile(resolve(output,'index.html'),html);
await writeFile(resolve(output,'.nojekyll'),'');
console.log(`GitHub Pages site prepared: ${output}`);
