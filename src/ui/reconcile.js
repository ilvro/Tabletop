const identity = node => {
  if (node.nodeType !== 1) return null;
  for (const name of ['id','data-field','data-select','data-panel-section','data-disclosure','data-texture-options','data-camera','data-build-group','data-build-section']) if (node.hasAttribute(name)) return `${node.tagName}:${name}:${node.getAttribute(name)}`;
  return null;
};
/** Keep live fields, selection, focus, scroll and disclosures while patching their view. */
export function reconcileElement(current, desired) {
  const value=desired.value, checked=desired.checked;
  if (current.isEqualNode(desired) && current.value===value && current.checked===checked && !current.querySelector?.('input,select,textarea')) return current;
  if (current.nodeType !== 1) { if(current.nodeValue!==desired.nodeValue)current.nodeValue=desired.nodeValue; return current; }
  for (const attr of [...current.attributes]) if (!desired.hasAttribute(attr.name)) current.removeAttribute(attr.name);
  for (const attr of [...desired.attributes]) if(current.getAttribute(attr.name)!==attr.value)current.setAttribute(attr.name,attr.value);
  const old=[...current.childNodes], keyed=new Map(old.map(n=>[identity(n),n]).filter(([key])=>key)),used=new Set();
  let cursor=current.firstChild;
  for(const next of [...desired.childNodes]) {
    const key=identity(next);
    let node=key?keyed.get(key):old.find(n=>!used.has(n)&&!identity(n)&&n.nodeType===next.nodeType&&n.nodeName===next.nodeName);
    if(node&&node.nodeName!==next.nodeName)node=null;
    if(node){used.add(node);reconcileElement(node,next);}else node=next;
    if(node!==cursor)current.insertBefore(node,cursor);
    cursor=node.nextSibling;
  }
  for(const node of old)if(!used.has(node)&&node.parentNode===current)node.remove();
  if(current instanceof HTMLInputElement){if(current.value!==value)current.value=value;current.checked=checked;}
  if(current instanceof HTMLSelectElement&&current.value!==value)current.value=value;
  if(current instanceof HTMLTextAreaElement&&current.value!==value)current.value=value;
  return current;
}
