
import { createContext } from "./context";
import fs from "fs";
import path from "path";

export class ZenRouter{
  routes=new Map();
  constructor(logger){ this.logger=logger; }

  async loadRoutes(){
    const base=path.join(process.cwd(),"src","app","routes");
    const scan=(dir,basePath="")=>{
      for(const f of fs.readdirSync(dir)){
        const full=path.join(dir,f);
        const r=path.join(basePath,f);
        if(fs.statSync(full).isDirectory()) scan(full,r);
        else if(f.endsWith(".ts")){
          const route="/"+r.replace(/index\.ts$/,"").replace(".ts","");
          this.routes.set(route,full);
        }
      }
    };
    scan(base);
    this.logger.info(`Loaded ${this.routes.size} routes`);
  }

  async handleRequest(req,res){
    const ctx=createContext(req,res);
    const modPath=this.routes.get(ctx.path)||this.routes.get("/"+ctx.path);
    if(!modPath){ res.statusCode=404; return res.end("404 - Not Found"); }
    const mod=await import(modPath);
    const handler=mod.default ?? mod.GET;
    const result=await handler(ctx);
    if(typeof result==="string"){
      res.setHeader("Content-Type","text/html; charset=utf-8");
      res.end(result);
    } else {
      res.setHeader("Content-Type","application/json; charset=utf-8");
      res.end(JSON.stringify(result));
    }
  }
}
