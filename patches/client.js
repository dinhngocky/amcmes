/* V20.23: async implementations are loaded once; sync state/overrides stay in core. */
const V223_BUILD='__BUILD__';
const V223_IMPL=Object.create(null), V223_INSTALLED=Object.create(null), V223_LOADING=Object.create(null);
const V223_CHART_PENDING=new WeakMap();
const V223_MODULES=Object.freeze({supply:1,warehouse:1,production:1,quality:1,extended:1});
const V223_ROUTES=Object.freeze({bom:'supply',material_control:'supply',purchasing:'supply',inventory:'warehouse',projects:'production',production:'production',quality:'quality',sales:'extended',finance:'extended',debt:'extended',hr:'extended',reports:'extended',settings:'extended',pos:'extended'});
const V223_METRICS=[];
function perfRecordV223(kind,name,ms,success){
  V223_METRICS.push({kind,name,ms:Math.round(ms),success:!!success,at:new Date().toISOString()});
  if(V223_METRICS.length>300)V223_METRICS.shift();
}
function performanceReportV223(){
  const groups={};
  V223_METRICS.forEach(function(x){const key=x.kind+':'+x.name;(groups[key]||(groups[key]=[])).push(x.ms);});
  const summary=Object.keys(groups).map(function(key){const values=groups[key].slice().sort((a,b)=>a-b);return{name:key,count:values.length,p50:values[Math.ceil(values.length*.5)-1],p95:values[Math.ceil(values.length*.95)-1]};});
  const nav=performance.getEntriesByType('navigation')[0];
  return {build:V223_BUILD,generatedAt:new Date().toISOString(),navigation:nav?{responseEnd:Math.round(nav.responseEnd),domContentLoaded:Math.round(nav.domContentLoadedEventEnd),transferSize:nav.transferSize,decodedBodySize:nav.decodedBodySize}:null,paint:performance.getEntriesByType('paint').map(x=>({name:x.name,ms:Math.round(x.startTime)})),loadedModules:Object.keys(V223_INSTALLED),summary,events:V223_METRICS.slice()};
}
function downloadPerformanceV223(){
  const url=URL.createObjectURL(new Blob([JSON.stringify(performanceReportV223(),null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download=V223_BUILD+'-performance.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function ensureModuleV223(group){
  if(!Object.prototype.hasOwnProperty.call(V223_MODULES,group))throw new Error('Module không hợp lệ.');
  if(V223_INSTALLED[group]===V223_BUILD)return;
  if(V223_LOADING[group])return V223_LOADING[group];
  const started=performance.now();
  const pending=(async function(){
    const r=await gas('getClientModuleV223',group,V223_BUILD);
    if(!r||!r.success||!r.data)throw new Error(r&&r.message||'Không tải được module. Vui lòng thử lại.');
    if(r.data.build!==V223_BUILD||r.data.group!==group||typeof r.data.source!=='string')throw new Error('Phiên bản giao diện và máy chủ khác nhau. Vui lòng tải lại trang.');
    const script=document.createElement('script');
    script.dataset.amcvnModule=group;
    script.textContent=r.data.source;
    document.head.appendChild(script);script.remove();
    if(V223_INSTALLED[group]!==V223_BUILD)throw new Error('Module chưa sẵn sàng. Kiểm tra bộ file triển khai rồi thử lại.');
    perfRecordV223('module',group,performance.now()-started,true);
  })();
  V223_LOADING[group]=pending;
  try{await pending;}catch(e){perfRecordV223('module',group,performance.now()-started,false);throw e;}
  finally{delete V223_LOADING[group];}
}
async function v223Invoke(group,key,receiver,args){
  if(V223_INSTALLED[group]===V223_BUILD&&typeof V223_IMPL[key]==='function')return V223_IMPL[key].apply(receiver,args);
  const seq=STATE.renderSeq;
  await ensureModuleV223(group);
  // Do not paint a screen requested before the user navigated away.
  if(/^render/i.test(key)&&seq!==STATE.renderSeq)return;
  const fn=V223_IMPL[key];
  if(typeof fn!=='function')throw new Error('Thiếu thành phần giao diện: '+key);
  return fn.apply(receiver,args);
}
function installRenderMetricsV223(){
  const base=render;
  render=async function(){
    const route=STATE.route,seq=STATE.renderSeq,started=performance.now();
    try{
      const group=V223_ROUTES[route];
      if(group&&can(route)){
        if(!V223_INSTALLED[group]){const p=$('#page');if(p)p.innerHTML=loadingBlock();}
        await ensureModuleV223(group);
        if(seq!==STATE.renderSeq||route!==STATE.route)return;
      }
      const result=await base.apply(this,arguments);
      if(seq===STATE.renderSeq&&route===STATE.route)perfRecordV223('screen',route,performance.now()-started,true);
      return result;
    }catch(e){
      perfRecordV223('screen',route,performance.now()-started,false);
      if(seq===STATE.renderSeq&&route===STATE.route){
        const p=$('#page');if(p)p.innerHTML=emptyState(e.message||'Không tải được màn hình.')+'<div class="p-4"><button type="button" class="btn-primary" onclick="render()">Thử lại</button></div>';
      }
    }
  };
}
