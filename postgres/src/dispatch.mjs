import {Worker} from 'node:worker_threads';
import {createStore} from './store.mjs';
export async function dispatch(client,method,args){
 const control=new SharedArrayBuffer(8),payload=new SharedArrayBuffer(32*1024*1024),ctl=new Int32Array(control),bytes=new Uint8Array(payload),store=createStore(client);
 return new Promise((resolve,reject)=>{
  let done=false;const worker=new Worker(new URL('./worker.mjs',import.meta.url),{workerData:{control,payload,method,args},resourceLimits:{maxOldGenerationSizeMb:384}});
  const finish=(error,result)=>{if(done)return;done=true;clearTimeout(timer);worker.terminate();error?reject(error):resolve(result);};
  const timer=setTimeout(()=>finish(Error('API timeout')),120000);
  worker.on('error',e=>finish(e));worker.on('exit',code=>{if(!done)finish(Error('Worker ended '+code));});
  worker.on('message',async msg=>{
   if(msg.type==='result')return finish(null,msg.result);if(msg.type==='error')return finish(Error(msg.message));if(msg.type!=='db'||done)return;
   // Domain code intentionally catches a few optional downstream failures. A
   // failed PostgreSQL statement would otherwise poison the whole transaction,
   // replacing the useful error with "current transaction is aborted". Guard
   // each bridge operation with a savepoint so a caught SQL error leaves the
   // outer business transaction usable. Transaction-control operations manage
   // their own savepoint and must not be nested here.
   const controls=new Set(['savepoint','rollbackSavepoint','releaseSavepoint']);
   const guarded=!controls.has(msg.op);let response;
   try{
    if(guarded)await client.query('SAVEPOINT amcvn_store_operation');
    response={value:await store(msg.op,msg.args)};
    if(guarded)await client.query('RELEASE SAVEPOINT amcvn_store_operation');
   }catch(e){
    if(guarded){
     try{await client.query('ROLLBACK TO SAVEPOINT amcvn_store_operation');await client.query('RELEASE SAVEPOINT amcvn_store_operation');}
     catch(rollbackError){return finish(rollbackError);}
    }
    response={error:e.message};
   }
   let encoded=new TextEncoder().encode(JSON.stringify(response));if(encoded.length>bytes.length)encoded=new TextEncoder().encode(JSON.stringify({error:'Database response exceeds 32 MiB; narrow data scope.'}));
   bytes.set(encoded);Atomics.store(ctl,1,encoded.length);Atomics.store(ctl,0,1);Atomics.notify(ctl,0);
  });
 });
}
