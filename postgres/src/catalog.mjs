import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
export const code=fs.readFileSync(path.join(root,'apps-script/Code.gs'),'utf8');
export const performance=fs.readFileSync(path.join(root,'apps-script/Performance.gs'),'utf8');
const c=vm.createContext({console});vm.runInContext(code,c);vm.runInContext(performance,c);c.installPerformanceV223_();
export const schema=JSON.parse(JSON.stringify(c.SCHEMA));schema.Counters=['Prefix','LastSeq'];
export const labels=Object.fromEntries(Object.keys(schema).map(n=>[n,c.resolveSheetName_(n)]));
export const report=JSON.parse(fs.readFileSync(path.join(root,'build-report.json'),'utf8'));
export const actions={...c.FN_ACTION_};
export const modules={...c.FN_MODULE_};
export const quote=n=>{if(!Object.hasOwn(schema,n))throw Error('Unknown table');return 'app."'+n+'"';};
export function schemaSQL(){
 let sql='CREATE SCHEMA IF NOT EXISTS app;\nCREATE TABLE IF NOT EXISTS app.properties (key text PRIMARY KEY,value text NOT NULL);\nCREATE TABLE IF NOT EXISTS app.cache (key text PRIMARY KEY,value text NOT NULL,expires_at timestamptz NOT NULL);\nCREATE INDEX IF NOT EXISTS cache_expiry ON app.cache(expires_at);\nCREATE TABLE IF NOT EXISTS app.files (id text PRIMARY KEY,name text NOT NULL,mime text NOT NULL,content bytea NOT NULL,created_at timestamptz NOT NULL DEFAULT now());\n';
 for(const [name,keys] of Object.entries(schema)){
  const table=quote(name),id=keys[0];sql+=`CREATE TABLE IF NOT EXISTS ${table} (row_id bigint PRIMARY KEY, data jsonb NOT NULL CHECK (jsonb_typeof(data)='object'));\n`;
  // Audit timestamps are not identifiers: one business action can legitimately
  // append several audit rows in the same millisecond. Older V1 schemas created
  // AuditLog_id as UNIQUE on Time, so drop it explicitly during schema ensure.
  if(name==='AuditLog')sql+=`DROP INDEX IF EXISTS app."AuditLog_id";\nCREATE INDEX IF NOT EXISTS "AuditLog_time" ON ${table} ((data->>'${id}'));\n`;
  else sql+=`CREATE UNIQUE INDEX IF NOT EXISTS "${name}_id" ON ${table} ((data->>'${id}')) WHERE coalesce(data->>'${id}','')<>'';\n`;
  for(const key of ['MachineID','ProductID','BOMVersionID','ProjectID','ModuleID','RequirementID','RequestID','PurchaseID','KitID','ReceiptID'])if(keys.includes(key)&&key!==id)sql+=`CREATE INDEX IF NOT EXISTS "${name}_${key}" ON ${table} ((data->>'${key}'));\n`;
  if(keys.includes('MachineID')&&keys.includes('ModuleID'))sql+=`CREATE INDEX IF NOT EXISTS "${name}_machine_module" ON ${table} ((data->>'MachineID'),(data->>'ModuleID'));\n`;
 }
 for(const key of ['SKU','PartNumber','ProductName'])sql+=`CREATE INDEX IF NOT EXISTS "Products_${key}_lower" ON app."Products" (lower(data->>'${key}'));\n`;
 sql+=`CREATE UNIQUE INDEX IF NOT EXISTS users_username ON app."Users" (lower(data->>'Username')) WHERE coalesce(data->>'Username','')<>'';\n`;
 sql+=`CREATE UNIQUE INDEX IF NOT EXISTS products_sku_unique ON app."Products" ((data->>'SKU')) WHERE coalesce(data->>'SKU','')<>'';\n`;
 return sql;
}
