const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/Users/frankos/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),report=JSON.parse(fs.readFileSync(path.join(root,'build-report.json'),'utf8'));
const permissions='dashboard engineering projects material_control purchasing inventory production quality settings users reports cost import export audit finance hr sales debt'.split(' ').map(x=>x+':vced').join('|');
const user={UserID:'TEST-ONLY',Username:'test',FullName:'Kiểm thử',Permissions:permissions};
const passed=[];
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  try{
    const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],calls=[];
    page.setDefaultTimeout(10000);
    let moduleDelay=0,failNextModule=false,chartRequests=0;
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/*',async route=>{
      const url=route.request().url();
      if(url==='http://amcvn.test/')return route.fulfill({contentType:'text/html',body:fs.readFileSync(path.join(root,'apps-script/index.html'),'utf8')});
      if(url.includes('chart.umd')){chartRequests++;return route.fulfill({contentType:'text/javascript',body:'window.Chart=class {constructor(el,cfg){this.canvas=el;this.config=cfg;this.data=cfg.data;this.options=cfg.options;} resize(){} update(){} destroy(){} static getChart(){return null;}};'});}
      return route.abort();
    });
    await page.exposeFunction('__testRpc',async(fn,args)=>{
      calls.push({fn,args:fn==='getClientModuleV223'?args:[]});
      if(fn==='authStatus')return {success:true,data:{ready:true,businessName:'TEST'}};
      if(fn==='authWhoami'||fn==='login')return {success:true,data:{token:'test-token',user,expiresAt:Date.now()+86400000}};
      if(fn==='authRefresh')return {success:true,data:{expiresAt:Date.now()+86400000}};
      if(fn==='getClientModuleV223'){
        if(moduleDelay)await new Promise(r=>setTimeout(r,moduleDelay));
        if(failNextModule){failNextModule=false;return {success:false,message:'Simulated module failure'};}
        return {success:true,data:{group:args[0],build:report.build,source:fs.readFileSync(path.join(root,'apps-script','module_'+args[0]+'.html'),'utf8')}};
      }
      if(fn==='getBootCoreV210')return {success:true,data:{init:{settings:{}},dataVersion:'test-version'}};
      if(fn==='getActionDashboard')return {success:true,data:{summary:{total:0},approvalCounts:{},approvals:[],shortages:[],production:[],quality:[],engineering:[]}};
      if(fn==='getDataVersion')return {success:true,data:'test-version'};
      if(fn==='getPhase1ContextOptions')return {success:true,data:{projects:[],machines:[],modules:[]}};
      if(fn==='getProductionWorkspace')return {success:true,data:{machines:[],projects:[],employees:[],stages:[],assignments:[],skills:[],training:[],kpi:{}}};
      if(fn==='getMaterialControlDashboard')return {success:true,data:{kpi:{},machines:[],shortages:[],exceptions:[]}};
      if(fn==='getQualityFATDashboard')return {success:true,data:{kpi:{},machines:[],issues:[],fat:[],punch:[]}};
      return {success:true,data:[]};
    });
    await page.addInitScript(()=>{
      localStorage.clear();sessionStorage.clear();
      localStorage.setItem('nexupone:auth:token','test-token');
      window.google={script:{run:new Proxy({}, {get(_,name){
        if(name!=='withSuccessHandler')throw Error('Unexpected runner property '+name);
        return success=>({withFailureHandler:failure=>new Proxy({}, {get(_,fn){return (...args)=>{
          const actual=fn==='apiCall'?args[1]:fn,params=fn==='apiCall'?args[2]:args;
          window.__testRpc(actual,params).then(success,failure);
        };}})});
      }})}};
    });
    await page.goto('http://amcvn.test/',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>typeof V223_BUILD==='string'&&document.querySelector('#actionDashboardV210')?.textContent.includes('Không'));
    assert.equal(await page.evaluate(()=>Object.keys(V223_INSTALLED).length),0);assert.equal(chartRequests,0);passed.push('dashboard/login boot does not fetch any business module or Chart.js');
    await page.evaluate(()=>Promise.all([ensureModuleV223('supply'),ensureModuleV223('supply'),ensureModuleV223('supply')]));
    assert.equal(calls.filter(x=>x.fn==='getClientModuleV223'&&x.args[0]==='supply').length,1);passed.push('concurrent module calls are deduplicated');
    await page.evaluate(()=>ensureModuleV223('supply'));assert.equal(calls.filter(x=>x.fn==='getClientModuleV223').length,1);passed.push('loaded module is reused');
    failNextModule=true;assert.equal(await page.evaluate(()=>ensureModuleV223('quality').then(()=>false,()=>true)),true);await page.evaluate(()=>ensureModuleV223('quality'));passed.push('failed module load can be retried');
    // Switching away before download completion must leave the new screen intact.
    moduleDelay=120;await page.evaluate(()=>{go('inventory');go('dashboard');});await page.waitForFunction(()=>V223_INSTALLED.warehouse);assert.equal(await page.evaluate(()=>STATE.route),'dashboard');assert(await page.locator('#actionDashboardV210').count());moduleDelay=0;passed.push('navigation during lazy loading does not paint the old route');
    // All generated implementations must bind successfully in the real global lexical scope.
    await page.evaluate(()=>Promise.all(['production','extended'].map(ensureModuleV223)));
    assert.equal(await page.evaluate(()=>Object.keys(V223_IMPL).length),report.functions.length);passed.push('all generated async implementations bind in browser');
    for(const [route,tab] of [['bom',''],['projects','overview'],['material_control','overview'],['inventory','receiving'],['production','overview'],['quality','issues_all']]){
      await page.evaluate(()=>{localStorage.clear();sessionStorage.clear();});
      await page.reload({waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>document.querySelector('#actionDashboardV210')?.textContent.includes('Không'));
      const beforeCalls=calls.length;
      await page.evaluate(async({route,tab})=>{STATE.route=route;if(tab)STATE.tab[route]=tab;STATE.renderSeq++;await render();},{route,tab});
      const text=await page.locator('#page').innerText();assert(!/is not defined|is not a function|Thiếu thành phần|Simulated module failure/.test(text),route+': '+text.slice(-500));
      const expected=({bom:'supply',projects:'production',material_control:'supply',inventory:'warehouse',production:'production',quality:'quality'})[route];
      assert.deepEqual(calls.slice(beforeCalls).filter(x=>x.fn==='getClientModuleV223').map(x=>x.args[0]),[expected],route+' must load only its own bundle for initial view');
      passed.push('empty-data route smoke: '+route);
    }
    await page.evaluate(()=>{const p=document.querySelector('#page');p.innerHTML='<canvas id="perf-chart"></canvas>';mkChart('perf-chart',{type:'bar',data:{labels:[],datasets:[]},options:{}});});
    await page.waitForFunction(()=>!!CHARTS['perf-chart']);assert.equal(chartRequests,1);passed.push('Chart.js loads on demand and creates the requested chart');
    const metrics=await page.evaluate(()=>performanceReportV223());assert(metrics.events.some(x=>x.kind==='screen'));assert(metrics.events.some(x=>x.kind==='rpc'));assert(!JSON.stringify(metrics).includes('test-token'));passed.push('metrics include screen/RPC timing without credentials');
    assert.deepEqual(errors,[]);
    await page.evaluate(async()=>{STATE.route='dashboard';STATE.renderSeq++;await render();});
    await page.screenshot({path:path.join(root,'test-dashboard.png'),fullPage:true});
    fs.writeFileSync(path.join(root,'browser-test-results.json'),JSON.stringify({build:report.build,backend:'synthetic fixtures; no live Apps Script timings',passed:passed.length,tests:passed,pageErrors:errors},null,2));
    console.log(JSON.stringify({passed:passed.length,tests:passed},null,2));
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
