
export function loadConfig(file){
  return {...file, env:process.env.NODE_ENV||file.env||"development"};
}
