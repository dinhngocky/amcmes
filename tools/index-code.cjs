const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const parserModule = { exports: {} };
vm.runInNewContext(process.binding('natives')['internal/deps/acorn/acorn/dist/acorn'], { module: parserModule, exports: parserModule.exports });
const parse = text => parserModule.exports.parse(text, { ecmaVersion: 'latest', locations: true });
const records = [];
for (const file of fs.readdirSync(path.join(root, 'apps-script')).sort()) {
  if (!/\.(gs|html)$/.test(file)) continue;
  const text = fs.readFileSync(path.join(root, 'apps-script', file), 'utf8');
  let js = text, offset = 0;
  if (file === 'index.html') {
    const start = text.indexOf('<script>') + 8;
    js = text.slice(start, text.lastIndexOf('</script>'));
    offset = text.slice(0, start).split('\n').length - 1;
  }
  const ast = parse(js);
  for (const n of ast.body) {
    let name, kind;
    if (n.type === 'FunctionDeclaration') { name = n.id.name; kind = 'declaration'; }
    if (n.type === 'ExpressionStatement' && n.expression.type === 'AssignmentExpression') {
      const a = n.expression;
      if (/FunctionExpression|ArrowFunctionExpression/.test(a.right.type)) {
        name = js.slice(a.left.start, a.left.end); kind = 'override-or-bundle';
      }
    }
    if (n.type === 'VariableDeclaration') for (const d of n.declarations) {
      if (d.id.type === 'Identifier' && d.init && /FunctionExpression|ArrowFunctionExpression/.test(d.init.type))
        records.push({ name: d.id.name, file: 'apps-script/' + file, line: d.loc.start.line + offset, endLine: d.loc.end.line + offset, kind: 'function-variable' });
    }
    if (name) records.push({ name, file: 'apps-script/' + file, line: n.loc.start.line + offset, endLine: n.loc.end.line + offset, kind });
  }
}
fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/function-index.json'), JSON.stringify(records, null, 2) + '\n');
console.log('Indexed ' + records.length + ' function definitions/assignments.');
