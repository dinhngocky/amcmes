import crypto from 'node:crypto';
import fs from 'node:fs';
import {schemaSQL,root} from './catalog.mjs';
import {pool,transact} from './db.mjs';
const user=process.env.ADMIN_USERNAME||'admin',password=process.env.ADMIN_PASSWORD;
if(!password||password.length<12)throw Error('Set ADMIN_PASSWORD with at least 12 characters.');
const sql=schemaSQL();fs.writeFileSync(new URL('../sql/schema.sql',import.meta.url),sql);
try{await transact(async client=>{
 await client.query(sql);const existing=await client.query('SELECT 1 FROM app."Users" LIMIT 1');if(existing.rows.length){console.log('Schema ensured; existing accounts/data preserved.');return;}
 const salt=crypto.randomUUID().replaceAll('-','');const hash=crypto.createHash('sha256').update(salt+'::'+password).digest('hex');
 const settings={BusinessName:'AMCVN',Currency:'VND',DefaultVAT:'10',ProductUnits:'PCS,SET,cái,bộ,kg,m',ProductCategories:'Thành phẩm, Module, Vật tư gia công CNC, Vật tư Kim loại tấm, Vật tư tiêu chuẩn, Vật tư phụ trợ, CCDC, Khác',ReminderEnabled:'false'};
 let row=1;for(const [Key,Value]of Object.entries(settings))await client.query('INSERT INTO app."Settings"(row_id,data) VALUES($1,$2::jsonb) ON CONFLICT(row_id) DO NOTHING',[row++,JSON.stringify({Key,Value})]);
 await client.query('INSERT INTO app."Users"(row_id,data) VALUES(1,$1::jsonb)',[JSON.stringify({UserID:'U001',Username:user,FullName:'Quản trị viên',Role:'Quản trị',Status:'Đang hoạt động',CreatedAt:new Date().toISOString(),PasswordSalt:salt,PasswordHash:hash,Permissions:''})]);
 console.log('Created clean database and admin: '+user+' (password not logged).');
});}finally{await pool.end();}
