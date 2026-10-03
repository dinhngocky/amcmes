import {schema,quote} from './catalog.mjs';
export function createStore(client){
 const field=(name,key)=>{if(!schema[name]?.includes(key))throw Error('Unknown field');return `(data->>'${key}')`;};
 const rows=async(sql,params=[])=> (await client.query(sql,params)).rows;
 return async function execute(op,args={}){
  const {name}=args;
  if(op==='filePut')return client.query('INSERT INTO app.files(id,name,mime,content) VALUES($1,$2,$3,decode($4,\'base64\'))',[args.id,args.fileName,args.mime,args.base64]).then(()=>null);
  if(op==='fileGet')return (await rows('SELECT id,name,mime,encode(content,\'base64\') AS base64 FROM app.files WHERE id=$1',[args.id]))[0]??null;
  if(op==='query')throw Error('Raw SQL RPC disabled');
  if(op==='list')return rows(`SELECT row_id,data FROM ${quote(name)} ORDER BY row_id`);
  if(op==='scope')return rows(`SELECT row_id,data FROM ${quote(name)} WHERE ${field(name,args.field)}=ANY($1::text[]) ORDER BY row_id`,[args.ids.map(String)]);
  if(op==='find')return rows(`SELECT row_id,data FROM ${quote(name)} WHERE ${field(name,args.field)}=$1 ORDER BY row_id LIMIT 1`,[String(args.id)]);
  if(op==='max')return (await rows(`SELECT coalesce(max(row_id),0)::text AS value FROM ${quote(name)}`))[0].value;
  if(op==='append'){
   if(!args.rows.length)return [];
   return rows(`INSERT INTO ${quote(name)}(row_id,data) SELECT base.n+v.ordinality,v.value FROM (SELECT coalesce(max(row_id),0) AS n FROM ${quote(name)}) base,jsonb_array_elements($1::jsonb) WITH ORDINALITY v(value,ordinality) RETURNING row_id,data`,[JSON.stringify(args.rows)]);
  }
  if(op==='update')return rows(`UPDATE ${quote(name)} SET data=data||$2::jsonb WHERE ${field(name,args.field)}=$1 RETURNING row_id,data`,[String(args.id),JSON.stringify(args.update)]);
  if(op==='remove')return rows(`DELETE FROM ${quote(name)} WHERE ${field(name,args.field)}=ANY($1::text[]) RETURNING row_id`,[args.ids.map(String)]);
  if(op==='range')return rows(`SELECT row_id,data FROM ${quote(name)} WHERE row_id BETWEEN $1 AND $2 ORDER BY row_id`,[args.start,args.end]);
  if(op==='putRows'){
   for(const row of args.rows)await client.query(`INSERT INTO ${quote(name)}(row_id,data) VALUES($1,$2::jsonb) ON CONFLICT(row_id) DO UPDATE SET data=excluded.data`,[row.row_id,JSON.stringify(row.data)]);
   return null;
  }
  if(op==='clear')return client.query(`DELETE FROM ${quote(name)}`).then(()=>null);
  if(op==='deleteRange')return client.query(`DELETE FROM ${quote(name)} WHERE row_id BETWEEN $1 AND $2`,[args.start,args.end]).then(()=>null);
  if(op==='propsGet')return (await rows('SELECT value FROM app.properties WHERE key=$1',[args.key]))[0]?.value??null;
  if(op==='propsAll')return Object.fromEntries((await rows('SELECT key,value FROM app.properties')).map(x=>[x.key,x.value]));
  if(op==='propsSet'){for(const [k,v] of Object.entries(args.values))await client.query('INSERT INTO app.properties(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=excluded.value',[k,String(v)]);return null;}
  if(op==='propsRemove')return client.query('DELETE FROM app.properties WHERE key=ANY($1::text[])',[args.keys]).then(()=>null);
  if(op==='cacheGet')return Object.fromEntries((await rows('SELECT key,value FROM app.cache WHERE key=ANY($1::text[]) AND expires_at>now()',[args.keys])).map(x=>[x.key,x.value]));
  if(op==='cacheSet'){for(const [k,v] of Object.entries(args.values))await client.query("INSERT INTO app.cache(key,value,expires_at) VALUES($1,$2,now()+($3*interval '1 second')) ON CONFLICT(key) DO UPDATE SET value=excluded.value,expires_at=excluded.expires_at",[k,String(v),args.ttl]);return null;}
  if(op==='cacheRemove')return client.query('DELETE FROM app.cache WHERE key=ANY($1::text[])',[args.keys]).then(()=>null);
  if(op==='savepoint')return client.query('SAVEPOINT business_mutation').then(()=>null);
  if(op==='rollbackSavepoint')return client.query('ROLLBACK TO SAVEPOINT business_mutation').then(()=>null);
  if(op==='releaseSavepoint')return client.query('RELEASE SAVEPOINT business_mutation').then(()=>null);
  throw Error('Unsupported store operation '+op);
 };
}
