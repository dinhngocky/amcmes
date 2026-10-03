const fs = require('node:fs'), path = require('node:path');
const query = process.argv.slice(2).join(' ').toLowerCase();
if (!query) { console.error('Usage: node tools/find-function.cjs <name fragment>'); process.exit(1); }
const rows = JSON.parse(fs.readFileSync(path.join(__dirname, '../docs/function-index.json'), 'utf8'));
const matches = rows.filter(x => x.name.toLowerCase().includes(query));
for (const x of matches.slice(0, 100)) console.log(`${x.file}:${x.line}-${x.endLine} ${x.name} [${x.kind}]`);
if (matches.length > 100) console.log(`${matches.length} matches; narrow the query.`);
