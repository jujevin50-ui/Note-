import * as Y from 'yjs'
export const LOCAL_MAP_CHANGE = 'mindmap-edit'
export const NODE_WIDTH = 220
export const MAP_COLORS = [['#b18aef','Lavande'],['#f0b568','Ambre'],['#7fcab1','Menthe'],['#80b6ef','Bleu'],['#e99bb7','Rose']]
export const nodeHeight = (text,width=NODE_WIDTH) => Math.max(76, Math.min(340, String(text || '').split('\n').reduce((sum,line) => sum + Math.max(1,Math.ceil(line.length / Math.max(10,Math.floor((width-32)/7.5)))),0)*21+32))
export function nodeSize(node) {
 return {width:Math.max(140,Math.min(2000,Number(node.width)||NODE_WIDTH)),height:Math.max(70,Math.min(2000,Number(node.height)||nodeHeight(node.text,Number(node.width)||NODE_WIDTH)))}
}
export function resizeMapNode(node,handle,dx,dy) {
 const {width,height}=nodeSize(node)
 let w=width,h=height,x=node.x,y=node.y
 if(handle.includes('e'))w=Math.max(140,Math.min(2000,width+dx))
 if(handle.includes('s'))h=Math.max(70,Math.min(2000,height+dy))
 if(handle.includes('w')){w=Math.max(140,Math.min(2000,width-dx));x=node.x+width-w}
 if(handle.includes('n')){h=Math.max(70,Math.min(2000,height-dy));y=node.y+height-h}
 return {x,y,width:Math.round(w),height:Math.round(h)}
}
const plainXml = value => value instanceof Y.XmlText ? value.toDelta().map(part=>typeof part.insert==='string'?part.insert:'').join('') : value?.toArray ? value.toArray().map(plainXml).join(value instanceof Y.XmlFragment&&!(value instanceof Y.XmlElement)?'\n':'') : ''
export function ensureRichText(doc,store,id) {
 const fields=store.get(id)
 if(!(fields instanceof Y.Map))return null
 if(fields.get('richText') instanceof Y.XmlFragment)return fields.get('richText')
 const fragment=new Y.XmlFragment()
 doc.transact(()=>{
  fields.set('richText',fragment)
  for(const line of String(fields.get('text')||'').split('\n')){const p=new Y.XmlElement('paragraph'),text=new Y.XmlText();if(line)text.insert(0,line);p.insert(0,[text]);fragment.push([p])}
 },LOCAL_MAP_CHANGE)
 return fragment
}
export function mapNodes(store) {
 return [...store.entries()].filter(([,node])=>node instanceof Y.Map).map(([id,node])=>{
  const fields=Object.fromEntries([...node.entries()].filter(([key])=>key!=='richText'))
  const fragment=node.get('richText'),rich=fragment instanceof Y.XmlFragment
  return {id,...fields,rich,text:rich?plainXml(fragment):typeof fields.text==='string'?fields.text:'Idée',color:/^#[0-9a-f]{6}$/i.test(fields.color||'')?fields.color:MAP_COLORS[0][0]}
 }).filter(node=>Number.isFinite(node.x)&&Number.isFinite(node.y))
}
export function duplicateMapNode(doc,store,id) {
 const original=store.get(id)
 if(!(original instanceof Y.Map))return null
 const nextId=crypto.randomUUID(),copy=new Y.Map()
 doc.transact(()=>{
  for(const [key,value]of original.entries())copy.set(key,value instanceof Y.XmlFragment?value.clone():value)
  copy.set('x',(original.get('x')||0)+40);copy.set('y',(original.get('y')||0)+40)
  store.set(nextId,copy)
 },LOCAL_MAP_CHANGE)
 return nextId
}
export function insertMapNode(doc,store,node) {
  doc.transact(()=>{const fields=new Y.Map();Object.entries(node).filter(([key])=>key!=='id').forEach(([key,value])=>fields.set(key,value));store.set(node.id,fields)},LOCAL_MAP_CHANGE)
}
export function updateMapNode(doc,store,id,patch) {
  const node=store.get(id)
  if(!(node instanceof Y.Map))return
  doc.transact(()=>Object.entries(patch).forEach(([key,value])=>node.set(key,value)),LOCAL_MAP_CHANGE)
}
export function branchIds(nodes,id) {
  const result=new Set([id]),pending=[id]
  while(pending.length){const parent=pending.shift();for(const node of nodes)if(node.parentId===parent&&!result.has(node.id)){result.add(node.id);pending.push(node.id)}}
  return result
}
export function removeMapBranch(doc,store,links,id) {
  const ids=branchIds(mapNodes(store),id)
  doc.transact(()=>{ids.forEach(key=>store.delete(key));for(const [key,link]of links.entries())if(ids.has(link.from)||ids.has(link.to))links.delete(key)},LOCAL_MAP_CHANGE)
}
export function mapConnections(nodes,links) {
  const ids=new Set(nodes.map(node=>node.id))
  const primary=nodes.filter(node=>ids.has(node.parentId)&&node.parentId!==node.id).map(node=>({id:'parent:'+node.id,from:node.parentId,to:node.id,color:node.color}))
  const pairs=new Set(primary.map(link=>[link.from,link.to].sort().join(':')))
  const extra=[]
  for(const [id,link]of links.entries()){const key=[link?.from,link?.to].sort().join(':');if(ids.has(link?.from)&&ids.has(link?.to)&&link.from!==link.to&&!pairs.has(key)){pairs.add(key);extra.push({id,...link,color:'#aaa3b9',extra:true})}}
  return [...primary,...extra]
}
export function layoutMap(nodes) {
 const ids=new Set(nodes.map(node=>node.id)),placed=new Set(),positions=[],columns=[]
 let cursor=0
 const place=(node,depth)=>{
  if(placed.has(node.id))return null
  placed.add(node.id)
  columns[depth]=Math.max(columns[depth]||0,nodeSize(node).width)
  const start=cursor,children=nodes.filter(child=>child.parentId===node.id&&!placed.has(child.id))
  const ys=children.map(child=>place(child,depth+1)).filter(y=>y!==null)
  const height=nodeSize(node).height
  let y=ys.length?(ys[0]+ys[ys.length-1])/2:start
  if(y<start)y=start
  cursor=Math.max(cursor,y+height+50)
  positions.push({id:node.id,depth,y})
  return y
 }
 nodes.filter(node=>!ids.has(node.parentId)).forEach(node=>{place(node,0);cursor+=60})
 nodes.filter(node=>!placed.has(node.id)).forEach(node=>{place(node,0);cursor+=60})
 const offsets=[0];for(let i=1;i<columns.length;i++)offsets[i]=offsets[i-1]+columns[i-1]+100
 return positions.map(({id,depth,y})=>({id,x:offsets[depth],y}))
}
export function fitMap(nodes,width,height) {
 if(!nodes.length)return{x:width/2-NODE_WIDTH/2,y:height/2-40,k:1}
 const minX=Math.min(...nodes.map(n=>n.x)),minY=Math.min(...nodes.map(n=>n.y))
 const maxX=Math.max(...nodes.map(n=>n.x+nodeSize(n).width)),maxY=Math.max(...nodes.map(n=>n.y+nodeSize(n).height))
 const k=Math.max(.15,Math.min(1.2,Math.max(40,width-100)/(maxX-minX),Math.max(40,height-100)/(maxY-minY)))
 return{k,x:width/2-(minX+maxX)/2*k,y:height/2-(minY+maxY)/2*k}
}
