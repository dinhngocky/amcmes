import http from 'node:http';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {root,report} from './catalog.mjs';
import {pool,transact} from './db.mjs';
import {dispatch} from './dispatch.mjs';
const host=process.env.HOST||'127.0.0.1',port=Number(process.env.PORT||3000),limit=16*1024*1024;
const shim=fs.readFileSync(new URL('../web-rpc.js',import.meta.url),'utf8');
const html=fs.readFileSync(root+'/apps-script/index.html','utf8').replace('<head>','<head><script src="/web-rpc.js"></script>');
const rates=new Map();
function throttle(ip,login){const key=ip+':'+login,now=Date.now();let s=rates.get(key);if(!s||now-s.at>60000){s={at:now,n:0};rates.set(key,s);}if(rates.size>10000)for(const [k,v]of rates)if(now-v.at>60000)rates.delete(k);return ++s.n<=(login?12:300);}
const json=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
export function createServer({transaction=transact,health=()=>pool.query('SELECT 1'),files=id=>pool.query('SELECT content,mime,name FROM app.files WHERE id=$1',[id])}={}){return http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('X-Frame-Options','SAMEORIGIN');
 const url=new URL(req.url,'http://localhost');
 if(req.method==='GET'&&url.pathname==='/'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});return res.end(html);}
 if(req.method==='GET'&&url.pathname==='/web-rpc.js'){res.writeHead(200,{'Content-Type':'text/javascript; charset=utf-8','Cache-Control':'no-store'});return res.end(shim);}
 if(req.method==='GET'&&url.pathname==='/health'){try{await health();return json(res,200,{status:'ok',backend:'postgresql',uiBuild:report.build});}catch{return json(res,503,{status:'database unavailable'});}}
 if(req.method==='GET'&&/^\/api\/files\/[a-f0-9-]{36}$/.test(url.pathname)){
  const id=url.pathname.split('/').at(-1),key=process.env.FILE_SIGNING_SECRET,sig=url.searchParams.get('sig')||'';
  if(!key)return json(res,503,{message:'File storage not configured'});const expected=crypto.createHmac('sha256',key).update(id).digest('base64url');
  if(sig.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return json(res,403,{message:'Invalid file signature'});
  try{const row=(await files(id)).rows[0];if(!row)return json(res,404,{message:'File not found'});res.writeHead(200,{'Content-Type':row.mime,'Content-Disposition':'inline','Cache-Control':'private, max-age=86400'});return res.end(row.content);}catch{return json(res,500,{message:'File unavailable'});}
 }
 if(req.method!=='POST'||url.pathname!=='/api/rpc')return json(res,404,{success:false,message:'Not found'});
 if(req.headers.origin){try{if(new URL(req.headers.origin).host!==req.headers.host)return json(res,403,{success:false,message:'Cross-origin request rejected'});}catch{return json(res,403,{success:false,message:'Invalid origin'});}}
 let chunks=[],size=0;
 try{
  for await(const chunk of req){size+=chunk.length;if(size>limit){json(res,413,{success:false,message:'File/request quá lớn (giới hạn 16 MiB).'});req.destroy();return;}chunks.push(chunk);}
  const {method,args}=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!['apiCall','login','logout','authWhoami','authStatus','authRefresh'].includes(method)||!Array.isArray(args))return json(res,400,{success:false,errorCode:'ERR_FN',message:'Invalid RPC'});
  if(!throttle(req.socket.remoteAddress,method==='login'))return json(res,429,{success:false,message:'Quá nhiều yêu cầu; hãy thử lại sau.'});
  const result=await transaction(client=>dispatch(client,method,args));return json(res,200,result);
 }catch(e){const incident=crypto.randomUUID();console.error(JSON.stringify({incident,message:e.message}));return json(res,500,{success:false,errorCode:'ERR_SERVER',message:'Lỗi máy chủ. Mã tra cứu: '+incident});}
});}
export const server=createServer();
if(process.argv[1]===fileURLToPath(import.meta.url)){
if(!process.env.DATABASE_URL)throw Error('Set DATABASE_URL before starting server.');
server.listen(port,host,()=>console.log(`AMCVN PostgreSQL: http://${host}:${port}`));
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>server.close(async()=>{await pool.end();process.exit(0);}));

}
