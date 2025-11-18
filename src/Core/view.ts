
export function h(type,props={},...children){ return {type,props,children}; }
export function renderToString(node){
  if(!node) return "";
  if(typeof node==="string"||typeof node==="number") return String(node);
  if(Array.isArray(node)) return node.map(renderToString).join("");
  if(typeof node.type==="function") return renderToString(node.type({...node.props,children:node.children}));
  const attrs=Object.keys(node.props).map(k=>`${k}="${node.props[k]}"`).join(" ");
  const kids=node.children.map(renderToString).join("");
  return `<${node.type} ${attrs}>${kids}</${node.type}>`;
}
