
import http from "http";
import { ZenRouter } from "./router";
import { ZenLogger } from "./logger";
import { ZenPluginManager } from "./plugin";
import { loadConfig } from "./config";

export class ZenRuntime {
  config; router; logger; plugins; server=null;
  constructor(cfg){
    this.config=loadConfig(cfg);
    this.logger=new ZenLogger();
    this.plugins=new ZenPluginManager(this);
    this.router=new ZenRouter(this.logger);
  }
  async init(){
    this.logger.info("Booting Zentara Runtime...");
    await this.plugins.load();
    await this.router.loadRoutes();
  }
  async start(){
    const port=this.config.port||3000;
    this.server=http.createServer((req,res)=>this.router.handleRequest(req,res));
    this.server.listen(port,()=>this.logger.info(`🚀 Running at http://localhost:${port}`));
  }
}
