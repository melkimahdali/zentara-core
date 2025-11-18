
import config from "../zentara.config.mjs";
import { ZenRuntime } from "./core/runtime";

async function bootstrap(){
  const runtime=new ZenRuntime(config);
  await runtime.init();
  await runtime.start();
}

bootstrap().catch(err=>console.error("Boot error:",err));
