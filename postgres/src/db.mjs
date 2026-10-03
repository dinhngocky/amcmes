import pg from 'pg';
export const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,max:Number(process.env.DB_POOL_SIZE||10),connectionTimeoutMillis:10000,statement_timeout:60000,ssl:process.env.DB_SSL==='true'?{rejectUnauthorized:true}:undefined});
export async function transact(work){
 const client=await pool.connect();try{await client.query('BEGIN');await client.query("SELECT pg_advisory_xact_lock(784301024)");const result=await work(client);if(result?.success===false)await client.query('ROLLBACK');else await client.query('COMMIT');return result;}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
}
