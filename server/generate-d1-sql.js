const fs = require('fs');
const path = require('path');
const db = require('./db/index');

const schemaPath = path.join(__dirname, 'db/schema.sql');
const schemaSql = fs.readFileSync(schemaPath, 'utf8');

const tables = [
  'users',
  'restaurants',
  'tables',
  'table_locks',
  'reservations',
  'menu_items',
  'orders',
  'order_items',
  'payments',
  'reviews',
  'audit_logs'
];

let outSql = `-- Cloudflare D1 Initialization Script\n-- Generated for FeastHub\n\n`;
outSql += schemaSql;
outSql += '\n\n-- Clear existing records\n';
for (const tbl of tables.slice().reverse()) {
  outSql += `DELETE FROM ${tbl};\n`;
}
outSql += `DELETE FROM sqlite_sequence;\n\n`;

function escapeVal(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return v;
  return `'${String(v).replace(/'/g, "''")}'`;
}

for (const tbl of tables) {
  const rows = db.all(`SELECT * FROM ${tbl}`);
  if (rows.length === 0) continue;

  outSql += `-- Table: ${tbl} (${rows.length} rows)\n`;
  const cols = Object.keys(rows[0]);
  
  for (const row of rows) {
    const vals = cols.map(c => escapeVal(row[c])).join(', ');
    outSql += `INSERT INTO ${tbl} (${cols.join(', ')}) VALUES (${vals});\n`;
  }
  outSql += '\n';
}

const outPath = path.join(__dirname, '../d1_init.sql');
fs.writeFileSync(outPath, outSql, 'utf8');
console.log(`✔ Generated d1_init.sql at ${outPath} (${(outSql.length / 1024).toFixed(1)} KB)`);
