import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../../chatgpt-auth';
import { readFields, writeFields } from '../../../lib/record-store.mjs';
export const dynamic = 'force-dynamic';
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store, private','Vary':'Cookie','X-Content-Type-Options':'nosniff'}});
export async function GET(){
 const user=await getChatGPTUser();if(!user)return json({user:null},401);
 try{return json({user:{id:user.userId,name:user.displayName},fields:await readFields(env.DB,user.userId)});}catch{return json({error:'storage_unavailable'},503);}
}
export async function POST(request:Request){
 const user=await getChatGPTUser();if(!user)return json({error:'sign_in_required'},401);
 if(request.headers.get('Origin')!==new URL(request.url).origin||request.headers.get('X-Study-Sync')!=='1')return json({error:'forbidden'},403);
 if(!request.headers.get('content-type')?.startsWith('application/json'))return json({error:'json_required'},415);
 const raw=await request.text();if(raw.length>600000)return json({error:'too_large'},413);
 let body;try{body=JSON.parse(raw);}catch{return json({error:'invalid_json'},400);}
 if(body.accountId!==user.userId)return json({error:'account_changed'},409);
 try{return json({user:{id:user.userId,name:user.displayName},fields:await writeFields(env.DB,user.userId,body.changes)});}catch(e){return json({error:'save_failed'},e instanceof Error&&e.message==='invalid_changes'?400:503);}
}
