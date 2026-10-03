import crypto from 'node:crypto';
import vm from 'node:vm';
import {code,performance,schema} from './catalog.mjs';
import {services,materialize} from './services.mjs';
export function runtime(db,{logger=console}={}){
 const s=services(db),c=vm.createContext({...s,console:logger,Buffer});
 vm.runInContext(code,c,{filename:'domain/Code.gs'});vm.runInContext(performance,c,{filename:'domain/Performance.gs'});c.SCHEMA.Counters=['Prefix','LastSeq'];
 c.CONFIG.SPREADSHEET_ID='postgres';c.CONFIG.ENABLE_POS=false;c.CONFIG.ENABLE_FINANCE=false;
 c.getSpreadsheet_=()=>s.spreadsheet;c.getSheet_=name=>s.sheet(name);
 c.ensureSchemaColumns_=()=>[];c.setupAuthModule=()=>c.err_('Dùng npm run db:init để khởi tạo.','ERR_SQL_SETUP');
 c.sheetToObjects_=(name,rawOnly)=>{
  if(!schema[name])throw Error('Unknown table '+name);
  let rows=c.REQ_SHEET_CACHE_[name];if(!rows){rows=materialize(db('list',{name}));c.REQ_SHEET_CACHE_[name]=rows;}
  if(rawOnly){const max=rows.reduce((m,r)=>Math.max(m,r.__row),1),byRow=new Map(rows.map(r=>[r.__row,r]));return Array.from({length:max},(_,i)=>i===0?schema[name]:schema[name].map(k=>byRow.get(i+1)?.[k]??''));}
  return c.hydrateMaterialRowsV224_(name,rows);
 };
 c.cachedSheetToObjects_=name=>c.sheetToObjects_(name);
 c.readScopedRowsV224_=(name,field,ids)=>c.hydrateMaterialRowsV224_(name,materialize(db('scope',{name,field,ids})));
 c.hydrateMaterialRowsV224_=(name,rows)=>{
  if(!['MaterialRequirements','MachineBOMLines'].includes(name)||!rows.length)return rows;
  const ids=[...new Set(rows.map(r=>String(r.ProductID||'')).filter(Boolean))],products=new Map(materialize(db('scope',{name:'Products',field:'ProductID',ids})).map(p=>[String(p.ProductID),p]));
  return rows.map(r=>{const x={...r},p=products.get(String(r.ProductID));if(p)for(const k of ['SKU','PartNumber','ProductName','BrandMaterial','Category','Unit'])if(name==='MaterialRequirements'||!x[k])x[k]=p[k]||x[k]||'';return x;});
 };
 c.amcvnFind_=(name,key,id)=>c.hydrateMaterialRowsV224_(name,materialize(db('find',{name,field:key,id})))[0]||null;
 const writeRows=(name,rows)=>rows.map(row=>{const out=c.normalizeMaterialRefV224_(name,c.translateRowForSheet_(row));return Object.fromEntries(schema[name].filter(k=>out[k]!==undefined).map(k=>[k,out[k]]));});
 const dirty=name=>{c.clearDataCache_(name);c.invalidateReqCache_(name);};
 c.appendRows=(name,objects)=>{
  c.trackMutationSheet_(name);if(typeof c.whStampRows_==='function')c.whStampRows_(name,objects);if(typeof c.vatStampRows_==='function')c.vatStampRows_(name,objects);
  db('append',{name,rows:writeRows(name,objects)});dirty(name);return objects;
 };
 c.appendRow=(name,object)=>{c.appendRows(name,[object]);return object;};
 c.updateRowById=(name,key,id,update)=>{
  c.trackMutationSheet_(name);const old=c.amcvnFind_(name,key,id);if(!old)return false;
  db('update',{name,field:key,id,update:writeRows(name,[{...old,...update}])[0]});dirty(name);return true;
 };
 c.updateRowsById_=(name,key,updates)=>{let count=0;for(const [id,update]of Object.entries(updates))if(c.updateRowById(name,key,id,update))count++;return count;};
 c.deleteRowsByIds_=(name,key,ids)=>{c.trackMutationSheet_(name);const rows=db('remove',{name,field:key,ids});dirty(name);return rows.length;};
 c.deleteRowById=(name,key,id)=>c.deleteRowsByIds_(name,key,[String(id)])>0;
 c.trackMutationSheet_=name=>{
  if(!c.MUTATION_CTX_)return;c.MUTATION_CTX_.seen[name]=true;
  if(name==='StockMovements'&&!c.MUTATION_CTX_.stockGuard){c.MUTATION_CTX_.stockGuard=true;c.MUTATION_CTX_.before=c.dedicatedDeficits_();}
 };
 c.trackMutationProperty_=()=>{};
 c.withMutationLock_=(names,work)=>{
  if(c.MUTATION_CTX_){(names||[]).forEach(c.trackMutationSheet_);return work();}
  db('savepoint');c.MUTATION_CTX_={seen:{},snaps:[],props:{},undo:[],stockGuard:false,before:null};
  try{
   (names||[]).forEach(c.trackMutationSheet_);const result=work();
   if(result?.success===false){db('rollbackSavepoint');return result;}
   if(c.MUTATION_CTX_.stockGuard){c.dedicatedAssertDeficits_(c.MUTATION_CTX_.before);c.dedicatedReconcileCommon_();c.dedicatedReconcileAllocations_();}
   c.perfCommitCacheV223_();db('releaseSavepoint');return result;
  }catch(e){db('rollbackSavepoint');return c.err_(e,'ERR_MUTATION');}
  finally{c.MUTATION_CTX_=null;c.REQ_SHEET_CACHE_={};c.DATA_CACHE_DIRTY_=false;c.PERF_V223_STATE_=null;c.DATA_CACHE_VERSION_MEMO_=null;}
 };
 const signingSecret=process.env.FILE_SIGNING_SECRET;
 const fileURL=id=>'/api/files/'+id+'?sig='+crypto.createHmac('sha256',signingSecret).update(id).digest('base64url');
 const upload=(file,kind)=>c.withMutationLock_([],()=>{
  try{if(!signingSecret||signingSecret.length<32)throw Error('Cấu hình FILE_SIGNING_SECRET tối thiểu 32 ký tự để tải ảnh.');const image=c.validateImageUpload_(file),id=crypto.randomUUID();db('filePut',{id,fileName:image.name,mime:image.mime,base64:Buffer.from(image.bytes).toString('base64')});const url=fileURL(id);return c.ok_({url,imageUrl:url,viewUrl:url,fileId:id,id,name:image.name},'Đã tải ảnh.');}catch(e){return c.err_(e.message);}
 });
 c.uploadProductImage=file=>upload(file,'product');c.uploadLogoImage=file=>upload(file,'logo');c.uploadTransferBill=file=>upload(file,'receipt');c.uploadBOMQuickImage=file=>upload(file,'bom');c.uploadChatImage=file=>upload(file,'chat');
 c.getImageDataUrl=url=>{try{const match=String(url||'').match(/^\/api\/files\/([a-f0-9-]{36})\?sig=([A-Za-z0-9_-]+)$/);if(!match||!signingSecret||fileURL(match[1])!==url)return c.err_('Ảnh không thuộc hệ thống.');const file=db('fileGet',{id:match[1]});return file?c.ok_({url,dataUrl:'data:'+file.mime+';base64,'+file.base64}):c.err_('Không tìm thấy ảnh.');}catch(e){return c.err_(e.message);}};
 // Google-only destructive setup/migration actions are not exposed in SQL mode.
 const blocked=['setupAMCVNSheets','setupAMCVNDemo','setupNexUpOneSheets','taoDuLieuDemo','resetAdminPassword','setupBackupSchedule','setupReminderSchedule','setupPosModule','menuSetupReset_'];
 for(const name of blocked)c[name]=()=>c.err_('Chức năng quản trị Google Sheets không áp dụng cho PostgreSQL.','ERR_SQL_SETUP');
 c.fnAllowed_=fn=>Object.hasOwn(c.FN_MODULE_,fn)||c.FN_OPEN_.includes(fn);
 c.installPerformanceV223_();return c;
}
export function invoke(c,method,args){
 const direct=new Set(['login','logout','authWhoami','authStatus','authRefresh']);
 if(method!=='apiCall'&&!direct.has(method))return {success:false,errorCode:'ERR_FN',message:'Lời gọi không hợp lệ.'};
 if(!Array.isArray(args))return {success:false,errorCode:'ERR_ARGS',message:'args phải là mảng.'};
 return c[method](...args);
}
