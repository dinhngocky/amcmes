import {parentPort,workerData} from 'node:worker_threads';
import {runtime,invoke} from './runtime.mjs';
const {control,payload}=workerData,ctl=new Int32Array(control),bytes=new Uint8Array(payload);let seq=0;
const db=(op,args={})=>{
 Atomics.store(ctl,0,0);parentPort.postMessage({type:'db',seq:++seq,op,args});
 if(Atomics.wait(ctl,0,0,120000)==='timed-out')throw Error('Database request timed out');
 const result=JSON.parse(new TextDecoder().decode(bytes.subarray(0,Atomics.load(ctl,1))));if(result.error)throw Error(result.error);return result.value;
};
const logger={log(){},warn(){},error(){}};
try{const c=runtime(db,{logger}),result=invoke(c,workerData.method,workerData.args);parentPort.postMessage({type:'result',result:JSON.parse(JSON.stringify(result??{success:true,data:null}))});}catch(e){parentPort.postMessage({type:'error',message:e.message});}
