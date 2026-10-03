/* AMCVN V20.23 performance layer. No business writes or schema migration here. */
var PERF_V223_STATE_;
function perfStateV223_(){
  if(!PERF_V223_STATE_)PERF_V223_STATE_={hits:0,misses:0,skips:0,reads:[],pending:{},all:false,dirty:false,versions:null,epoch:null,scoped:null};
  return PERF_V223_STATE_;
}
function installPerformanceV223_(){
  FN_MODULE_.getClientModuleV223='common';FN_ACTION_.getClientModuleV223='v';
}
function getClientModuleV223(group,build){
  // Direct google.script.run must not bypass apiCall authentication.
  if(!AUTH_CTX_)return err_('Vui lòng đăng nhập.','ERR_AUTH');
  var allowed={supply:1,warehouse:1,production:1,quality:1,extended:1};
  if(!Object.prototype.hasOwnProperty.call(allowed,String(group)))return err_('Module không hợp lệ.','ERR_FN');
  if(build!=='__BUILD__')return err_('Phiên bản đã thay đổi. Vui lòng tải lại trang.','ERR_VERSION');
  try{return ok_({group:group,build:'__BUILD__',source:HtmlService.createHtmlOutputFromFile('module_'+group).getContent()});}
  catch(e){return err_('Thiếu file module_'+group+'.html trong Apps Script.','ERR_MODULE');}
}
function perfReadSheetV223_(sheet,name,rows,cols){
  var start=Date.now(),data=sheet.getRange(1,1,rows,cols).getValues();
  perfStateV223_().reads.push({table:name,rows:rows,columns:cols,ms:Date.now()-start});
  return data;
}
function perfLogRequestV223_(fn,start,result){
  var s=perfStateV223_();
  // Only counts/timing/table names; never credentials, session IDs, arguments or records.
  console.log(JSON.stringify({type:'AMCVN_PERF',build:'__BUILD__',fn:fn,ms:Date.now()-start,success:!!(result&&result.success),cacheHits:s.hits,cacheMisses:s.misses,cacheSkips:s.skips,reads:s.reads}));
}
function perfCacheGetV223_(cache,key){
  var s=perfStateV223_(),raw=cache.get(key);
  if(!raw){s.misses++;return null;}
  // Small values remain backward compatible plain JSON.
  if(raw.indexOf('V223CHUNK:')!==0){s.hits++;return raw;}
  try{
    var meta=JSON.parse(raw.slice(10));
    if(!meta||!Array.isArray(meta.keys)||!meta.keys.length||meta.keys.length>32)throw new Error('manifest');
    var blocks=cache.getAll(meta.keys),parts=[];
    for(var i=0;i<meta.keys.length;i++){
      if(typeof blocks[meta.keys[i]]!=='string')throw new Error('evicted');
      parts.push(blocks[meta.keys[i]]);
    }
    var json=parts.join('');
    if(json.length!==meta.length)throw new Error('length');
    s.hits++;return json;
  }catch(e){s.misses++;return null;}
}
function perfCachePutV223_(cache,key,json,ttl){
  if(utf8Length_(json)<90000){cache.put(key,json,ttl);return true;}
  // <=20k UTF-16 code units per entry means <=80k UTF-8 bytes, including emoji.
  // Bound entries per value to avoid flooding the shared CacheService.
  if(json.length>639968){perfStateV223_().skips++;return false;}
  var id=Utilities.getUuid().replace(/-/g,''),parts={},keys=[];
  for(var at=0;at<json.length;){
    var end=Math.min(at+20000,json.length);
    if(end<json.length){var last=json.charCodeAt(end-1);if(last>=0xD800&&last<=0xDBFF)end--;}
    var partKey='v223:'+id+':'+keys.length;
    keys.push(partKey);parts[partKey]=json.slice(at,end);at=end;
  }
  cache.putAll(parts,ttl);
  // Publish metadata last. Each write has a unique generation; mixed chunks cannot occur.
  cache.put(key,'V223CHUNK:'+JSON.stringify({keys:keys,length:json.length}),ttl);
  return true;
}
function perfScopedEnabledV223_(){
  var s=perfStateV223_();
  if(s.scoped===null)s.scoped=PropertiesService.getScriptProperties().getProperty('PERF_V223_SCOPED_CACHE')==='1';
  return s.scoped;
}
function perfVersionsV223_(){
  var s=perfStateV223_();
  if(s.versions===null){
    try{s.versions=JSON.parse(PropertiesService.getScriptProperties().getProperty('PERF_V223_VERSIONS')||'{}');}
    catch(e){s.versions={};}
  }
  return s.versions;
}
function perfSheetCacheKeyV223_(name){
  // Safe default for coexistence with older deployed versions using the same database.
  if(!perfScopedEnabledV223_())return 'sheet:'+dataCacheVersion_()+':'+name;
  var s=perfStateV223_();
  if(s.epoch===null)s.epoch=PropertiesService.getScriptProperties().getProperty('PERF_V223_EPOCH')||'initial';
  return 'sheet:v223:'+s.epoch+':'+(perfVersionsV223_()[name]||'0')+':'+name;
}
function perfMarkCacheV223_(names){
  if(!perfScopedEnabledV223_())return;
  var s=perfStateV223_();s.dirty=true;
  if(typeof names==='string')names=[names];
  if(!Array.isArray(names)||!names.length)s.all=true;
  else names.forEach(function(name){s.pending[name]=true;});
  // A manual maintenance execution has no transaction commit boundary: invalidate all.
  if(!MUTATION_CTX_){s.all=true;perfCommitCacheV223_();}
}
function perfCommitCacheV223_(){
  var s=perfStateV223_();if(!s.dirty)return;
  var props=PropertiesService.getScriptProperties(),token=Date.now().toString(36)+Utilities.getUuid().slice(0,8),versions={};
  if(!s.all){
    try{versions=JSON.parse(props.getProperty('PERF_V223_VERSIONS')||'{}');}catch(e){s.all=true;}
    Object.keys(s.pending).forEach(function(name){versions[name]=token;});
    if(utf8Length_(JSON.stringify(versions))>8000)s.all=true;
  }
  var changes={};
  if(s.all){changes.PERF_V223_EPOCH=token;versions={};s.epoch=token;}
  changes.PERF_V223_VERSIONS=JSON.stringify(versions);
  // Also invalidate aggregate payloads built by a concurrent reader during the write.
  changes.DATA_CACHE_VERSION=token;
  props.setProperties(changes,false);
  DATA_CACHE_VERSION_MEMO_=token+'_v5';s.versions=versions;s.pending={};s.all=false;s.dirty=false;
}
