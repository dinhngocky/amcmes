/* Compare exported browser metrics. Usage: node tools/compare.cjs before.json after.json */
const fs=require('node:fs');
const [a,b]=process.argv.slice(2);if(!a||!b)throw Error('Usage: node tools/compare.cjs before.json after.json');
function read(file){const x=JSON.parse(fs.readFileSync(file,'utf8'));if(!Array.isArray(x.events))throw Error('Missing events in '+file);return x;}
const before=read(a),after=read(b);
function group(report){const groups={};for(const event of report.events){if(!['screen','rpc','module'].includes(event.kind))continue;const key=event.kind+':'+event.name;const g=groups[key]||(groups[key]={all:0,failed:0,ms:[]});g.all++;if(!event.success){g.failed++;continue;}g.ms.push(event.ms);}for(const g of Object.values(groups))g.ms.sort((a,b)=>a-b);return groups;}
const left=group(before),right=group(after),result=[];
function quantile(a,p){return a.length?a[Math.ceil(a.length*p)-1]:null;}
for(const key of Object.keys(left).filter(key=>right[key])){
  const l=left[key],r=right[key],lp=quantile(l.ms,.5),rp=quantile(r.ms,.5);
  result.push({name:key,beforeN:l.ms.length,afterN:r.ms.length,beforeP50:lp,afterP50:rp,beforeP95:quantile(l.ms,.95),afterP95:quantile(r.ms,.95),p50ReductionPercent:lp>0&&rp!==null?+((1-rp/lp)*100).toFixed(1):null,beforeFailed:l.failed,afterFailed:r.failed,enoughSamples:l.ms.length>=20&&r.ms.length>=20});
}
console.log(JSON.stringify({before:before.build,after:after.build,note:'Chỉ so sánh cùng dữ liệu, thiết bị, mạng và trạng thái cache. Mục tiêu 30% là tiêu chí thử nghiệm, không phải cam kết.',comparisons:result},null,2));
