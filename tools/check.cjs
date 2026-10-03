const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'apps-script');
const sha = x => crypto.createHash('sha256').update(x).digest('hex');
const report = JSON.parse(fs.readFileSync(path.join(root, 'build-report.json'), 'utf8'));
const files = ['Code.gs', 'Performance.gs', 'index.html', ...Object.keys(report.bundles).map(g => 'module_' + g + '.html')];
for (const file of files) {
  const text = fs.readFileSync(path.join(dir, file), 'utf8');
  if (file === 'index.html') {
    for (const m of text.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)) if (m[1].trim()) new vm.Script(m[1], { filename: file });
    if (!text.includes(report.build)) throw Error('Entry build does not match report');
  } else {
    new vm.Script(text, { filename: file });
    if (file === 'Performance.gs' && !text.includes(report.build)) throw Error('Server build does not match report');
    if (file.startsWith('module_')) {
      const group = file.slice(7, -5);
      if (sha(text) !== report.bundles[group].sha256) throw Error('Module differs from recorded build: ' + file + '. Review changes and publish a coherent new build.');
    }
  }
}
new vm.Script(['Code.gs', 'Performance.gs'].map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n'), { filename: 'backend-combined' });
console.log('PASS: 8 deploy files, syntax, bundle hashes and build identity');
