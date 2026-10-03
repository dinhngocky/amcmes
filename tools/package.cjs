const fs = require('node:fs'), path = require('node:path'), cp = require('node:child_process');
const root = path.resolve(__dirname, '..');
cp.execFileSync(process.execPath, [path.join(__dirname, 'check.cjs')], { stdio: 'inherit' });
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
const output = path.join(root, 'dist/AMCVN-' + require('../build-report.json').build.split('-')[0] + '-deploy.zip');
if (fs.existsSync(output)) fs.unlinkSync(output);
const files = fs.readdirSync(path.join(root, 'apps-script')).filter(f => /\.(gs|html)$/.test(f)).sort();
cp.execFileSync('zip', ['-q', output, ...files], { cwd: path.join(root, 'apps-script') });
console.log(output);
