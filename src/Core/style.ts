
import fs from "fs"; import path from "path";
let css=null;
export function loadZenStyles(){
  if(css) return css;
  const f=path.join(process.cwd(),"zenstyles","app.zs.css");
  css=fs.existsSync(f)?fs.readFileSync(f,"utf8"):"";
  return css;
}
