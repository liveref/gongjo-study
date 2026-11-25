import assert from 'node:assert/strict';
const base='http://127.0.0.1:5173';
let r=await fetch(base);assert.equal(r.status,200);assert.match(await r.text(),/syncLogin/);
r=await fetch(base+'/api/records');assert.equal(r.status,401);
r=await fetch(base+'/signin-with-chatgpt?return_to=%2F',{redirect:'manual'});const cookie=r.headers.get('set-cookie').split(';')[0];
const headers={cookie};r=await fetch(base+'/api/records',{headers});assert.equal(r.status,200);let data=await r.json();const id=data.user.id;
const changes=[{id:'2018-1-10-calc',field:'rounds',value:3,base:0,op:crypto.randomUUID()}];
const post=async(body,extra={})=>fetch(base+'/api/records',{method:'POST',headers:{...headers,'Content-Type':'application/json','X-Study-Sync':'1',Origin:base,...extra},body:JSON.stringify(body)});
assert.equal((await post({accountId:'another-user',changes})).status,409);
assert.equal((await post({accountId:id,changes},{Origin:'https://other.invalid'})).status,403);
r=await post({accountId:id,changes});assert.equal(r.status,200);data=await r.json();assert.equal(data.fields.find(x=>x.field==='rounds').value,3);
r=await fetch(base+'/api/records',{headers});data=await r.json();assert.equal(data.fields.find(x=>x.field==='rounds').value,3);
for(const path of ['/assets/IMG_5180.jpg','/assets/2018-23/img_5211.jpg']){r=await fetch(base+path,{method:'HEAD'});assert.match(r.headers.get('content-type'),/^image\//);}
console.log('PASS: page, anonymous denial, sign-in, account validation, CSRF rejection, D1 write/read, both image sets.');
