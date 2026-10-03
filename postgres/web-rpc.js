/* Preserve existing gas()/google.script.run calling contract; same-origin API. */
(function(){
 function runner(success,failure){return new Proxy({}, {get:function(_,name){
  if(name==='withSuccessHandler')return function(fn){return runner(fn,failure);};
  if(name==='withFailureHandler')return function(fn){return runner(success,fn);};
  if(name==='then')return undefined;
  return function(){const args=Array.from(arguments);fetch('/api/rpc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({method:name,args}),credentials:'same-origin'}).then(async function(response){const value=await response.json();if(!response.ok&&response.status>=500)throw Error(value.message||'Server error');return value;}).then(function(value){if(success)success(value);}).catch(function(e){if(failure)failure(e);});};
 }});}
 window.google=window.google||{};window.google.script={run:runner(null,null)};
})();
