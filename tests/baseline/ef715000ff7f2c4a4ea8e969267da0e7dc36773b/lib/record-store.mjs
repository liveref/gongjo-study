export const fields = ['status','bookmark','memo','rounds','hidden'];
export function validChange(c) {
 if(!c || !/^\d{4}-\d+-\d+-(calc|written|diagram)$/.test(c.id)||!fields.includes(c.field)||!Number.isSafeInteger(c.base)||c.base<0||typeof c.op!=='string'||!/^[-a-zA-Z0-9]{8,100}$/.test(c.op))return false;
 if(c.field==='status')return ['new','review','done'].includes(c.value);
 if(c.field==='memo')return typeof c.value==='string'&&c.value.length<=5000;
 if(c.field==='rounds')return Number.isInteger(c.value)&&c.value>=0&&c.value<=5;
 return typeof c.value==='boolean';
}
export async function readFields(db, userId) {
 const {results}=await db.prepare('SELECT unit_id,field,value,revision,mutation_id FROM study_fields WHERE user_id = ?').bind(userId).all();
 return results.map(r=>({id:r.unit_id,field:r.field,value:JSON.parse(r.value),revision:r.revision,op:r.mutation_id}));
}
export async function writeFields(db,userId,changes){
 if(!Array.isArray(changes)||changes.length>100||!changes.every(validChange)||new Set(changes.map(c=>c.id+':'+c.field)).size!==changes.length)throw new Error('invalid_changes');
 if(changes.length)await db.batch(changes.map(c=>db.prepare(`INSERT INTO study_fields (user_id,unit_id,field,value,revision,mutation_id) SELECT ?,?,?,?,?,? WHERE ? = 0 OR EXISTS (SELECT 1 FROM study_fields WHERE user_id=? AND unit_id=? AND field=?) ON CONFLICT(user_id,unit_id,field) DO UPDATE SET value=excluded.value,revision=excluded.revision,mutation_id=excluded.mutation_id WHERE study_fields.revision=? OR study_fields.mutation_id=excluded.mutation_id`).bind(userId,c.id,c.field,JSON.stringify(c.value),c.base+1,c.op,c.base,userId,c.id,c.field,c.base)));
 return readFields(db,userId);
}
