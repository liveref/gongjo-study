import {test} from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import {readFields,writeFields,validChange} from '../lib/record-store.mjs';
const sql=new DatabaseSync(':memory:');sql.exec('CREATE TABLE study_fields(user_id TEXT NOT NULL,unit_id TEXT NOT NULL,field TEXT NOT NULL,value TEXT NOT NULL,revision INTEGER NOT NULL,mutation_id TEXT NOT NULL,PRIMARY KEY(user_id,unit_id,field))');
const db={prepare(text){return{bind(...values){return{all:async()=>({results:sql.prepare(text).all(...values)}),run:()=>sql.prepare(text).run(...values)}}}},batch:async stmts=>{sql.exec('BEGIN');try{for(const s of stmts)s.run();sql.exec('COMMIT');}catch(e){sql.exec('ROLLBACK');throw e;}}};
const c=(field,value,base=0,op=crypto.randomUUID())=>({id:'2018-1-10-calc',field,value,base,op});
test('two devices, field merge, stale writes, retry and user isolation',async()=>{
 const first=c('rounds',2);await writeFields(db,'A',[first]);await writeFields(db,'A',[first]);assert.equal((await readFields(db,'A'))[0].revision,1);
 await writeFields(db,'A',[c('memo','device two')]);let rows=await readFields(db,'A');assert.equal(rows.length,2);
 await writeFields(db,'A',[c('rounds',4,1)]);await writeFields(db,'A',[c('rounds',1,1)]);rows=await readFields(db,'A');assert.equal(rows.find(r=>r.field==='rounds').value,4);
 await writeFields(db,'B',[c('hidden',true)]);assert.equal((await readFields(db,'B')).length,1);assert.equal((await readFields(db,'A')).length,2);
 await writeFields(db,'A',[c('rounds',5,2)]);assert.equal((await readFields(db,'A')).find(r=>r.field==='rounds').value,5);
});
test('reject malformed and oversized values',async()=>{for(const bad of [c('rounds',6),c('memo','x'.repeat(5001)),c('hidden','true'),c('unknown',true),c('rounds',2,-1)])assert.equal(validChange(bad),false);await assert.rejects(writeFields(db,'A',[c('rounds',6)]));});

test('wrong notes persist as independent boolean fields',async()=>{await writeFields(db,'wrong-user',[c('wrongNote',true)]);assert.equal((await readFields(db,'wrong-user'))[0].value,true);assert.equal(validChange(c('wrongNote','true')),false);});
