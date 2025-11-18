
import url from "url";

export function createContext(req,res){
  const parsed=url.parse(req.url||"/",true);
  return {
    req,res,
    method:(req.method||"GET").toUpperCase(),
    path:parsed.pathname||"/",
    query:parsed.query,
    params:{}, state:{},
    async json(){
      return new Promise(resolve=>{
        let b=""; req.on("data",c=>b+=c);
        req.on("end",()=>{ try{resolve(JSON.parse(b))} catch{resolve(null)} });
      });
    }
  };
}
