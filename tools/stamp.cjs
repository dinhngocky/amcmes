// Stamp reviewed canonical sources only; never regenerate module implementations.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'apps-script'),reportPath=path.join(root,'build-report.json'),r=JSON.parse(fs.readFileSync(reportPath));
const release=process.argv[2];if(!/^v\d+\.\d+$/.test(release||''))throw Error('Usage: node tools/stamp.cjs v20.24');
const files=['Code.gs','Performance.gs','index.html',...Object.keys(r.bundles).map(g=>'module_'+g+'.html')];
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const source=files.map(f=>fs.readFileSync(path.join(dir,f),'utf8'));
const build=release+'-'+sha(source.map(s=>s.split(r.build).join('__BUILD__')).join('\n')).slice(0,12);
source.forEach((s,i)=>fs.writeFileSync(path.join(dir,files[i]),s.split(r.build).join(build)));
if(!r.previousBuild)r.previousBuild=r.build;r.build=build;r.entryBytes=fs.statSync(path.join(dir,'index.html')).size;r.entryReductionPercent=null;
for(const g of Object.keys(r.bundles)){const bytes=fs.readFileSync(path.join(dir,'module_'+g+'.html'));r.bundles[g].bytes=bytes.length;r.bundles[g].sha256=sha(bytes);}
fs.writeFileSync(reportPath,JSON.stringify(r,null,2)+'\n');console.log(build);
