import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {root,schema,labels} from './catalog.mjs';
const revive=x=>Array.isArray(x)?x.map(revive):x&&typeof x==='object'?Object.fromEntries(Object.entries(x).map(([k,v])=>[k,revive(v)])):typeof x==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(x)?new Date(x):x;
export const materialize=rows=>rows.map(r=>({...revive(r.data),__row:Number(r.row_id)+1}));
export function services(db){
 const props={getProperty:key=>db('propsGet',{key}),getProperties:()=>db('propsAll'),setProperty(key,value){db('propsSet',{values:{[key]:value}});return this;},setProperties(values,remove){if(remove)throw Error('Bulk property reset disabled');db('propsSet',{values});return this;},deleteProperty(key){db('propsRemove',{keys:[key]});return this;}};
 const cache={get:key=>db('cacheGet',{keys:[key]})[key]??null,getAll:keys=>db('cacheGet',{keys}),put(key,value,ttl=600){db('cacheSet',{values:{[key]:value},ttl});},putAll(values,ttl=600){db('cacheSet',{values,ttl});},remove:key=>db('cacheRemove',{keys:[key]}),removeAll:keys=>db('cacheRemove',{keys})};
 const noFormat=new Proxy({}, {get:()=>()=>noFormat});
 const sheet=name=>{
  if(!schema[name])throw Error('Unknown table '+name);
  const keys=schema[name];const sh={getName:()=>labels[name]||name,getLastColumn:()=>keys.length,getMaxColumns:()=>keys.length,getLastRow:()=>Number(db('max',{name}))+1,getMaxRows:()=>Number(db('max',{name}))+1,
   getDataRange(){return this.getRange(1,1,this.getLastRow(),keys.length);},setName(){return this;},setFrozenRows(){return this;},clearContents(){db('clear',{name});return this;},clearFormats(){return this;},deleteRows(start,count){db('deleteRange',{name,start:start-1,end:start+count-2});return this;},insertRowsAfter(){return this;},insertColumnsAfter(){return this;},setColumnWidths(){return this;},setColumnWidth(){return this;},autoResizeColumns(){return this;},setTabColor(){return this;},hideSheet(){return this;},getBandings:()=>[],getConditionalFormatRules:()=>[],setConditionalFormatRules(){return this;},getRange(r,c,n=1,w=1){
    if(![r,c,n,w].every(Number.isInteger)||r<1||c<1||n<0||w<0)throw Error('Invalid range');
    const read=()=>{const mapped=new Map(materialize(db('range',{name,start:Math.max(1,r-1),end:r+n-2})).map(x=>[x.__row,x]));return Array.from({length:n},(_,i)=>Array.from({length:w},(_,j)=>r+i===1?keys[c+j-1]??'':mapped.get(r+i)?.[keys[c+j-1]]??''));};
    const range={getValues:read,getDisplayValues:()=>read().map(row=>row.map(String)),getValue:()=>read()[0]?.[0]??'',setValue(v){return this.setValues([[v]]);},setValues(values){
     if(values.length!==n||values.some(x=>x.length!==w))throw Error('Range dimensions mismatch');
     const old=new Map(db('range',{name,start:Math.max(1,r-1),end:r+n-2}).map(x=>[Number(x.row_id),x.data]));const rows=[];
     for(let i=0;i<n;i++){if(r+i===1)continue;const id=r+i-1,data={...(old.get(id)||{})};for(let j=0;j<w;j++)if(keys[c+j-1])data[keys[c+j-1]]=values[i][j];rows.push({row_id:id,data});}db('putRows',{name,rows});return this;
    },clearContent(){return this.setValues(Array.from({length:n},()=>Array(w).fill('')));}};
    return new Proxy(range,{get:(t,k)=>k in t?t[k]:()=>range});
   }};return sh;
 };
 const ss={getId:()=> 'postgres',getName:()=> 'AMCVN PostgreSQL',getUrl:()=> '',getSheets:()=>Object.keys(schema).map(sheet),getSheetByName:n=>{const key=schema[n]?n:Object.keys(labels).find(k=>labels[k]===n);return key?sheet(key):null;},insertSheet:n=>sheet(n),setActiveSheet:()=>noFormat};
 const unsupported=name=>()=>{throw Error(name+' cần tích hợp dịch vụ riêng trên backend PostgreSQL.');};
 const blob=(bytes,mime,name)=>({getBytes:()=>typeof bytes==='string'?[...Buffer.from(bytes)]:bytes,getContentType:()=>mime,getName:()=>name,getDataAsString:()=>Buffer.from(bytes).toString('utf8')});
 const output=s=>({getContent:()=>s,setTitle(){return this;},setXFrameOptionsMode(){return this;}});
 const Utilities={DigestAlgorithm:{SHA_256:'sha256'},Charset:{UTF_8:'utf8'},getUuid:()=>crypto.randomUUID(),computeDigest:(alg,s)=>[...crypto.createHash(alg).update(String(s)).digest()].map(x=>x>127?x-256:x),base64Decode:s=>[...Buffer.from(s,'base64')],base64Encode:x=>Buffer.from(x).toString('base64'),newBlob:blob,formatDate(d,tz,pattern){const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date(d)).map(x=>[x.type,x.value]));return pattern.replace(/yyyy|MM|dd|HH|mm|ss|SSS/g,k=>({yyyy:parts.year,MM:parts.month,dd:parts.day,HH:parts.hour,mm:parts.minute,ss:parts.second,SSS:String(new Date(d).getMilliseconds()).padStart(3,'0')})[k]);}};
 return {db,sheet,spreadsheet:ss,PropertiesService:{getScriptProperties:()=>props},CacheService:{getScriptCache:()=>cache},LockService:{getDocumentLock:()=>({waitLock(){},releaseLock(){}}),getScriptLock:()=>({waitLock(){},releaseLock(){}})},Session:{getActiveUser:()=>({getEmail:()=>''}),getEffectiveUser:()=>({getEmail:()=>''}),getScriptTimeZone:()=> 'Asia/Ho_Chi_Minh'},Utilities,SpreadsheetApp:{getActiveSpreadsheet:()=>ss,getActive:()=>ss,openById:()=>ss,flush(){},getUi:()=>({alert(){},createMenu:()=>noFormat}),newDataValidation:()=>noFormat,newConditionalFormatRule:()=>noFormat,BandingTheme:{},BorderStyle:{},create:unsupported('Tạo Google Sheet')},HtmlService:{createHtmlOutput:output,createTemplateFromFile(name){if(!/^module_(supply|warehouse|production|quality|extended)$/.test(name))throw Error('Invalid module');return{getRawContent:()=>fs.readFileSync(path.join(root,'apps-script',name+'.html'),'utf8')};}},DriveApp:new Proxy({},{get:(_,k)=>unsupported('Google Drive '+String(k))}),MailApp:{sendEmail:unsupported('Gửi email'),getRemainingDailyQuota:()=>0},ScriptApp:{getProjectTriggers:()=>[],getScriptId:()=> 'postgres',getService:()=>({getUrl:()=>''}),newTrigger:unsupported('Scheduled jobs'),deleteTrigger:unsupported('Scheduled jobs')},UrlFetchApp:{fetch:unsupported('External fetch')}};
}
