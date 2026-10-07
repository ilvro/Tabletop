/** One running write and one replaceable pending snapshot; never cancel a transaction. */
export function createLatestJob(run, onError = () => {}) {
  let pending, running=false, completion=Promise.resolve();
  return {
    push(value) {
      pending=value;
      if(!running){running=true;completion=(async()=>{while(pending!==undefined){const next=pending;pending=undefined;try{await run(next);}catch(error){onError(error);}}running=false;})();}
      return completion;
    },
    idle: () => completion,
  };
}
