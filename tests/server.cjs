const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),report=JSON.parse(fs.readFileSync(path.join(root,'build-report.json'),'utf8'));
const code=fs.readFileSync(path.join(root,'apps-script/Code.gs'),'utf8'),patch=fs.readFileSync(path.join(root,'apps-script/Performance.gs'),'utf8');
const parserModule={exports:{}};vm.runInNewContext(process.binding('natives')['internal/deps/acorn/acorn/dist/acorn'],{module:parserModule,exports:parserModule.exports});
const ast=parserModule.exports.parse(code,{ecmaVersion:'latest'});
function fn(name){const n=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name===name);assert(n,name);return code.slice(n.start,n.end);}
function harness(){
  const memory=new Map(),props=new Map(),logs=[];let sheetReads=0;const sourceRows=[{id:'A',text:'Kiểm tra tiếng Việt 😀'.repeat(6000)}];
  const cache={get:k=>memory.get(k)||null,put:(k,v)=>{assert(Buffer.byteLength(v,'utf8')<=102400);assert(k.length<=250);memory.set(k,v);},getAll:keys=>Object.fromEntries(keys.filter(k=>memory.has(k)).map(k=>[k,memory.get(k)])),putAll:parts=>{for(const [k,v]of Object.entries(parts))cache.put(k,v);}};
  const property={getProperty:k=>props.get(k)||null,setProperty:(k,v)=>props.set(k,String(v)),setProperties:o=>Object.entries(o).forEach(([k,v])=>props.set(k,String(v)))};
  const context=vm.createContext({console:{log:x=>logs.push(x),warn:()=>{}},Date,JSON,Array,Object,String,Math,Error,Utilities:{getUuid:()=>crypto.randomUUID()},PropertiesService:{getScriptProperties:()=>property},CacheService:{getScriptCache:()=>cache},REQ_SHEET_CACHE_:{},DATA_CACHE_DIRTY_:false,DATA_CACHE_VERSION_MEMO_:null,MUTATION_CTX_:null,AUTH_CTX_:null,FN_MODULE_:{},FN_ACTION_:{},sanitizeForClient_:x=>x,hydrateMaterialRowsV224_:(name,rows)=>rows,sheetToObjects_:()=>{sheetReads++;return sourceRows;},ok_:data=>({success:true,data}),err_:(message,errorCode)=>({success:false,message,errorCode}),HtmlService:{createHtmlOutputFromFile:()=>{throw new Error('Malformed HTML: plain JavaScript must not be parsed as HTML');},createTemplateFromFile:name=>({getRawContent:()=>fs.readFileSync(path.join(root,'apps-script',name+'.html'),'utf8')})}});
  vm.runInContext(patch+'\n'+['utf8Length_','dataCacheVersion_','clearDataCache_','cachedSheetToObjects_','cachedPayload_'].map(fn).join('\n'),context);
  function request(){context.PERF_V223_STATE_=undefined;context.REQ_SHEET_CACHE_={};context.DATA_CACHE_DIRTY_=false;context.DATA_CACHE_VERSION_MEMO_=null;context.MUTATION_CTX_=null;}
  return {context,cache,memory,props,logs,request,get reads(){return sheetReads;}};
}
const outcomes=[];function test(name,work){work();outcomes.push(name);console.log('PASS '+name);}
test('large Vietnamese/emoji payload survives cache round trip and respects entry byte limit',()=>{
  const h=harness(),s=JSON.stringify({text:'Dữ liệu 😀 vật tư '.repeat(12000)});assert(Buffer.byteLength(s)>90000);
  h.context.perfCachePutV223_(h.cache,'test',s,180);assert.equal(h.context.perfCacheGetV223_(h.cache,'test'),s);assert(h.memory.size>2);
});
test('eviction of any chunk is a cache miss, never partial business data',()=>{
  const h=harness(),s=JSON.stringify({text:'x'.repeat(100000)});h.context.perfCachePutV223_(h.cache,'x',s,180);const meta=JSON.parse(h.memory.get('x').slice(10));h.memory.delete(meta.keys[1]);assert.equal(h.context.perfCacheGetV223_(h.cache,'x'),null);
});
test('simultaneous publications use different generation keys',()=>{
  const h=harness();h.context.perfCachePutV223_(h.cache,'x','a'.repeat(100000),180);const old=JSON.parse(h.memory.get('x').slice(10));h.context.perfCachePutV223_(h.cache,'x','b'.repeat(100000),180);const next=JSON.parse(h.memory.get('x').slice(10));assert(!old.keys.some(k=>next.keys.includes(k)));assert.equal(h.context.perfCacheGetV223_(h.cache,'x'),'b'.repeat(100000));
});
test('oversize values are skipped without breaking data reads',()=>{
  const h=harness();assert.equal(h.context.perfCachePutV223_(h.cache,'huge','x'.repeat(640000),180),false);assert.equal(h.memory.size,0);
});
test('existing sheet reader uses large cache across requests; mutation bypasses cache',()=>{
  const h=harness();h.context.cachedSheetToObjects_('Products');assert.equal(h.reads,1);h.request();h.context.cachedSheetToObjects_('Products');assert.equal(h.reads,1);h.request();h.context.DATA_CACHE_DIRTY_=true;h.context.cachedSheetToObjects_('Products');assert.equal(h.reads,2);
});
test('cache service failure falls back to sheet read',()=>{
  const h=harness();h.cache.get=()=>{throw Error('unavailable');};assert(h.context.cachedSheetToObjects_('Products').length);assert.equal(h.reads,1);
});
test('default global cache remains compatible with old deployments',()=>{
  const h=harness();assert.equal(h.context.perfScopedEnabledV223_(),false);const a=h.context.perfSheetCacheKeyV223_('Products');h.props.set('DATA_CACHE_VERSION','updated-by-v20.22');h.request();assert.notEqual(h.context.perfSheetCacheKeyV223_('Products'),a);
});
test('opt-in scoped cache invalidates written sheets, preserves unrelated tables at commit',()=>{
  const h=harness();h.props.set('PERF_V223_SCOPED_CACHE','1');const a=h.context.perfSheetCacheKeyV223_('Products'),b=h.context.perfSheetCacheKeyV223_('Suppliers');h.context.MUTATION_CTX_={};h.context.clearDataCache_('Products');h.context.clearDataCache_('StockMovements');h.context.perfCommitCacheV223_();h.request();assert.notEqual(h.context.perfSheetCacheKeyV223_('Products'),a);assert.equal(h.context.perfSheetCacheKeyV223_('Suppliers'),b);
});
test('unknown writes/rollback invalidate every scoped table even after a prior scoped write',()=>{
  const h=harness();h.props.set('PERF_V223_SCOPED_CACHE','1');const b=h.context.perfSheetCacheKeyV223_('Suppliers');h.context.MUTATION_CTX_={};h.context.clearDataCache_('Products');h.context.clearDataCache_();h.context.perfCommitCacheV223_();h.request();assert.notEqual(h.context.perfSheetCacheKeyV223_('Suppliers'),b);
});
test('module endpoint blocks unauthenticated, invalid name and mismatched build',()=>{
  const h=harness();assert.equal(h.context.getClientModuleV223('supply',report.build).errorCode,'ERR_AUTH');h.context.AUTH_CTX_={UserID:'TEST'};assert.equal(h.context.getClientModuleV223('../Code',report.build).errorCode,'ERR_FN');assert.equal(h.context.getClientModuleV223('constructor',report.build).errorCode,'ERR_FN');assert.equal(h.context.getClientModuleV223('supply','old').errorCode,'ERR_VERSION');assert(h.context.getClientModuleV223('supply',report.build).data.source.includes('V223_IMPL'));
});
test('all five JavaScript modules are returned byte-for-byte without HTML parsing',()=>{
  const h=harness();h.context.AUTH_CTX_={UserID:'TEST'};
  for(const group of Object.keys(report.bundles)){
    const result=h.context.getClientModuleV223(group,report.build);
    assert.equal(result.success,true);assert.equal(result.data.group,group);assert.equal(result.data.build,report.build);
    assert.equal(result.data.source,fs.readFileSync(path.join(root,'apps-script','module_'+group+'.html'),'utf8'));
  }
});
test('module read failures do not falsely claim the file is missing or expose source',()=>{
  const h=harness();h.context.AUTH_CTX_={UserID:'TEST'};
  h.context.HtmlService.createTemplateFromFile=()=>{throw new Error('INTERNAL_SECRET_SOURCE');};
  const result=h.context.getClientModuleV223('production',report.build);
  assert.equal(result.errorCode,'ERR_MODULE');assert(!result.message.includes('Thiếu file'));assert(!result.message.includes('INTERNAL_SECRET_SOURCE'));
});
test('large aggregate payload builds once and invalidates with global version',()=>{
  const h=harness();let calls=0;const build=()=>{calls++;return {success:true,data:{text:'a'.repeat(100000)}};};h.context.cachedPayload_('dashboard',build);h.request();h.context.cachedPayload_('dashboard',build);assert.equal(calls,1);h.props.set('DATA_CACHE_VERSION','new');h.request();h.context.cachedPayload_('dashboard',build);assert.equal(calls,2);
});
test('physical read metrics contain only counts and timing',()=>{
  const h=harness(),secret='DO NOT LOG';const data=h.context.perfReadSheetV223_({getRange:()=>({getValues:()=>[[secret]]})},'Products',1,1);h.context.perfLogRequestV223_('getProducts',Date.now(),{success:true,data});assert(!h.logs.join('').includes(secret));assert.equal(JSON.parse(h.logs[0]).reads[0].rows,1);
});
fs.writeFileSync(path.join(root,'server-test-results.json'),JSON.stringify({build:report.build,passed:outcomes.length,tests:outcomes},null,2));
