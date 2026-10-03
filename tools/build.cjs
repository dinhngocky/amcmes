/* Reproducible V20.22 -> V20.23 build. Node 22+; no npm install needed. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const source = process.argv[2];
if (!source) throw new Error('Usage: node tools/build.cjs <V20.22 source directory>');
const parserModule = {exports:{}};
vm.runInNewContext(process.binding('natives')['internal/deps/acorn/acorn/dist/acorn'], {module:parserModule,exports:parserModule.exports});
const parse = s => parserModule.exports.parse(s,{ecmaVersion:'latest',locations:true});
const html0 = fs.readFileSync(path.join(source,'index v20.22.html'),'utf8');
const server0 = fs.readFileSync(path.join(source,'code v20.22.txt'),'utf8');
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const patch = name => fs.readFileSync(path.join(root,'patches',name),'utf8');
const build = 'v20.23-' + sha(html0 + server0 + patch('client.js') + patch('server.js') + fs.readFileSync(__filename,'utf8')).slice(0,12);
let server = server0;
function replaceOnce(text, from, to) {
  if (text.split(from).length !== 2) throw new Error('Ambiguous patch: '+from.slice(0,100));
  return text.replace(from,to);
}
// Register before dispatch at runtime: independent of .gs file execution ordering.
server = replaceOnce(server,'function apiCall(token, fn, args, userAgent) {','function apiCall(token, fn, args, userAgent) {\n  installPerformanceV223_();');
// Instrument physical reads only. No row values or request arguments are recorded.
server = replaceOnce(server,'sh.getRange(1,1,lastRow,lastCol).getValues()', 'perfReadSheetV223_(sh, name, lastRow, lastCol)');
server = replaceOnce(server,"key = 'sheet:' + dataCacheVersion_() + ':' + name;", "key = perfSheetCacheKeyV223_(name);");
server = replaceOnce(server,'var cached = cache.get(key);','var cached = perfCacheGetV223_(cache, key);');
server = replaceOnce(server,"if (utf8Length_(json) < 90000) cache.put(key, json, 180);", "perfCachePutV223_(cache, key, json, 180);");
server = replaceOnce(server,'var hit = cache.get(key);','var hit = perfCacheGetV223_(cache, key);');
server = replaceOnce(server,"if (utf8Length_(json) < 90000) cache.put(key, json, 300);", "perfCachePutV223_(cache, key, json, 300);");
server = replaceOnce(server,'function clearDataCache_() {','function clearDataCache_(sheetNames) {\n  perfMarkCacheV223_(sheetNames);');
// Precisely scoped CRUD; unspecified maintenance writes retain full invalidation.
let ast = parse(server), edits = [];
for (const n of ast.body) {
  if (n.type !== 'FunctionDeclaration') continue;
  const name = n.id.name;
  const scoped = ['appendRow','appendRows','updateRowById','deleteRowById','updateRowsByIds_','deleteRowsByIds_','bulkWrite_'];
  if (scoped.includes(name) || name === 'updateSetting') {
    const part = server.slice(n.start,n.end);
    if (!part.includes('clearDataCache_()')) throw new Error('Missing invalidation in '+name);
    edits.push([n.start,n.end,part.replaceAll('clearDataCache_()',name==='updateSetting'?"clearDataCache_('Settings')":'clearDataCache_(sheetName)')]);
  }
}
for (const [a,b,s] of edits.reverse()) server=server.slice(0,a)+s+server.slice(b);
server = replaceOnce(server,'if (ctx.snaps.length) { clearDataCache_(); SpreadsheetApp.flush(); }','if (ctx.snaps.length) { clearDataCache_(Object.keys(ctx.seen)); SpreadsheetApp.flush(); }\n    perfCommitCacheV223_();');
server = replaceOnce(server,'MUTATION_CTX_ = null;\n    if (acquired) lock.releaseLock();','try { if (acquired) perfCommitCacheV223_(); } finally {\n      MUTATION_CTX_ = null;\n      if (acquired) lock.releaseLock();\n    }');
// Instrument API result, including logical failures, without changing its business data.
server = replaceOnce(server,'var out = need.action === \'v\' ? invoke() : withMutationLock_([], invoke);','var perfStartedV223 = Date.now();\n    var out = need.action === \'v\' ? invoke() : withMutationLock_([], invoke);\n    perfLogRequestV223_(fn, perfStartedV223, out);');
// Unified issue lists also use the bounded cross-request cache when read-only.
ast=parse(server);
const issues=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='getUnifiedIssues');
let issueSource=server.slice(issues.start,issues.end).replace(/sheetToObjects_\('(MachineIssues|QualityIssues|MaterialExceptions|FATPunchList)'\)/g,"cachedSheetToObjects_('$1')");
server=server.slice(0,issues.start)+issueSource+server.slice(issues.end);
// Default dashboard navigation may reuse the existing 60-second client cache.
let html = html0.replace('<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js" crossorigin="anonymous"></script>','');
html = replaceOnce(html,"const LIB_URL = {", "const LIB_URL = {\n  chart: 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js',");
html = replaceOnce(html,'const LIB_SAN = { xlsx:', 'const LIB_SAN = { chart: () => !!window.Chart, xlsx:');
html = replaceOnce(html,"if (!el || !window.Chart) return null;",`if (!el) return null;
  if (!window.Chart) {
    const target=el;
    // Multiple updates while the library loads must paint only the latest config.
    V223_CHART_PENDING.set(target,cfg);
    napThuVien('chart').then(function(){
      if (target.isConnected && document.getElementById(id)===target && V223_CHART_PENDING.get(target)===cfg) {
        V223_CHART_PENDING.delete(target); mkChart(id,cfg);
      }
    }).catch(function(){
      if (target.isConnected && V223_CHART_PENDING.get(target)===cfg) {
        V223_CHART_PENDING.delete(target); toast('Không tải được biểu đồ. Mở lại màn hình để thử lại.','error');
      }
    });
    return null;
  }`);
html = replaceOnce(html,"if(window.Chart){ const ctx=document.getElementById('cfChart');", "{ const ctx=document.getElementById('cfChart');");
html = replaceOnce(html,"const ms=Date.now()-t0;", "const ms=Date.now()-t0;\n        perfRecordV223('rpc',fn,ms,!!(res&&res.success));");
html = replaceOnce(html,"i18nApply(p);await refreshActionDashboardV210(true);};", "i18nApply(p);await refreshActionDashboardV210(false);};");
// Load failed data must not become a successful empty-list cache.
html = replaceOnce(html,"const data=res&&res.success?res.data:(res&&res.data?res.data:[]);", "if(!res || !res.success) throw new Error(res&&res.message||'Không tải được dữ liệu.');\n    const data=res.data;");
// Extract only top-level async functions/assignments: global constants, sync helpers,
// IIFEs, and historical override ordering remain exactly in the entry script.
const start=html.indexOf('<script>')+8, end=html.lastIndexOf('</script>');
let js=html.slice(start,end);
const core = /^(boot|bootApp|doLogin|doLogout|auth|ensureAuth|refreshAuth|gas|napThuVien|render$|renderModule$|load$|prefetch|checkDataSync|applyPendingSync|reprime$|refreshActionDashboard|renderDashboard|openDashboard)/i;
const sharedAsync=new Set(['copyValue','saveInlineNote','quickStatus','doDelete','dropKanban','doAmcvnDelete','deleteExecutionRecord','detailGet','procWrite','phase1Options','openPhase1Context','toggleBell','toggleAlerts','financeConfirmYes','loadReturnMap']);
const groups={supply:[],warehouse:[],production:[],quality:[],extended:[]};
function groupFor(name,line){
  if(/^(openModuleForm|saveModule|savePRReview|pret)|Payment.*V209|PaymentsV209/i.test(name))return 'supply';
  if(/project|machine|assembly|stage|production|capacity|resource|skill|training|chat|mil4m|dailyReport|engineeringDoc/i.test(name))return 'production';
  if(/^wh|TransferTab|LabelTab/i.test(name))return 'warehouse';
  if(/Gate.*V207/i.test(name))return 'quality';
  if(/Capability|OutsourceV207|Documents?V207|Costs?V207/i.test(name))return 'production';
  if(/bom|proc|purchas|supplier|material|requisition|rfq|subcontract|shortage|reservation/i.test(name)) {
    if(/kit|receipt|iqc/i.test(name))return 'warehouse';
    if(/production|progress|process/i.test(name)&&!/bom/i.test(name))return 'production';
    return 'supply';
  }
  if(/quality|fat|punch|delivery|commission|serviceTicket|fieldService|unifiedIssue|qualityGate/i.test(name))return 'quality';
  if(/warehouse|inventory|stock|receipt|kit|location|^cn|^label|^qr|^trace|movement|product(?!ion)|lot|bin/i.test(name))return 'warehouse';
  if(line>=15900&&line<=17200)return 'warehouse';
  return 'extended';
}
const nodes=parse(js).body, manifest=[]; edits=[];
function extract(n,name,isDeclaration){
  if(!n.async || n.generator || core.test(name)||sharedAsync.has(name))return;
  // Preserve browser user activation for functions that open windows, copy, or
  // request hardware directly; a network round trip could expire that activation.
  if(/navigator\.clipboard|window\.open\(|getUserMedia\(|requestFullscreen\(|showOpenFilePicker\(/.test(js.slice(n.start,n.end)))return;
  // Arrow lexical this/arguments would change on relocation; retain these in core.
  if(n.type==='ArrowFunctionExpression')return;
  const line=n.loc.start.line+html.slice(0,start).split('\n').length-1;
  const group=groupFor(name,line), key=name+'__'+line;
  // A declaration resolves self-references through the global binding (which old
  // patches may override). Do not introduce a named-expression self binding.
  const code=isDeclaration?js.slice(n.start,n.end).replace(/^async\s+function\s+[A-Za-z_$][\w$]*/, 'async function'):js.slice(n.start,n.end);
  groups[group].push('V223_IMPL['+JSON.stringify(key)+'] = '+code+';');
  const stub=(isDeclaration?'async function '+name:'async function')+'(...v223Args){return v223Invoke('+JSON.stringify(group)+','+JSON.stringify(key)+',this,v223Args);}';
  edits.push([n.start,n.end,stub]);
  manifest.push({name,key,group,line,bytes:Buffer.byteLength(code)});
}
for(const n of nodes){
  if(n.type==='FunctionDeclaration')extract(n,n.id.name,true);
  if(n.type==='ExpressionStatement'&&n.expression.type==='AssignmentExpression'){
    const a=n.expression;
    if(a.left.type==='Identifier'&&a.right.type==='FunctionExpression')extract(a.right,a.left.name,false);
  }
}
for(const [a,b,s] of edits.sort((a,b)=>b[0]-a[0]))js=js.slice(0,a)+s+js.slice(b);
const runtime=patch('client.js').replaceAll('__BUILD__',build);
js=runtime+'\n'+js;
// Wrap the final renderer only after all legacy overrides have installed.
js=replaceOnce(js,'\nboot();','\ninstallRenderMetricsV223();\nboot();');
html=html.slice(0,start)+js+html.slice(end);
const output=path.join(root,'apps-script');fs.mkdirSync(output,{recursive:true});
fs.writeFileSync(path.join(output,'Code.gs'),server);
fs.writeFileSync(path.join(output,'Performance.gs'),patch('server.js').replaceAll('__BUILD__',build));
fs.writeFileSync(path.join(output,'index.html'),html);
// Baseline keeps the original server byte-for-byte and only adds timing observers.
const baselineDir=path.join(root,'baseline-v20.22');fs.mkdirSync(baselineDir,{recursive:true});
const baselineRuntime=runtime.slice(0,runtime.indexOf('async function ensureModuleV223')).replaceAll(build,'v20.22-baseline');
let baseline=replaceOnce(html0,'<script>\n','<script>\n'+baselineRuntime+'\n');
baseline=replaceOnce(baseline,'const ms=Date.now()-t0;','const ms=Date.now()-t0;\n        perfRecordV223(\'rpc\',fn,ms,!!(res&&res.success));');
baseline=replaceOnce(baseline,'\nboot();',`\n(function(){const base=render;render=async function(){const route=STATE.route,seq=STATE.renderSeq,t=performance.now();try{const r=await base.apply(this,arguments);if(seq===STATE.renderSeq)perfRecordV223('screen',route,performance.now()-t,true);return r;}catch(e){perfRecordV223('screen',route,performance.now()-t,false);throw e;}};})();\nboot();`);
fs.writeFileSync(path.join(baselineDir,'Code.gs'),server0);fs.writeFileSync(path.join(baselineDir,'index.html'),baseline);
parse(baseline.slice(baseline.indexOf('<script>')+8,baseline.lastIndexOf('</script>')));
const bundles={};
for(const [group,parts] of Object.entries(groups)){
  const text='/* AMCVN '+build+' / '+group+' */\n'+parts.join('\n')+'\nV223_INSTALLED['+JSON.stringify(group)+'] = '+JSON.stringify(build)+';\n';
  parse(text);
  fs.writeFileSync(path.join(output,'module_'+group+'.html'),text);
  bundles[group]={functions:parts.length,bytes:Buffer.byteLength(text),sha256:sha(text)};
}
// Parse both .gs files together, catching duplicate lexical declarations too.
parse(server+'\n'+patch('server.js').replaceAll('__BUILD__',build));parse(js);
const report={build,source:{htmlBytes:Buffer.byteLength(html0),serverBytes:Buffer.byteLength(server0),htmlSha256:sha(html0),serverSha256:sha(server0)},entryBytes:Buffer.byteLength(html),entryReductionPercent:+((1-Buffer.byteLength(html)/Buffer.byteLength(html0))*100).toFixed(2),bundles,functions:manifest};
fs.writeFileSync(path.join(root,'build-report.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({build,entryBytes:report.entryBytes,entryReductionPercent:report.entryReductionPercent,bundles},null,2));
