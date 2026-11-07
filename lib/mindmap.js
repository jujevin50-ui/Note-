import * as Y from 'yjs'
export const LOCAL_MAP_CHANGE = 'mindmap-edit'
export const NODE_WIDTH = 220
export const MAP_COLORS = [['#b18aef','Lavande'],['#f0b568','Ambre'],['#7fcab1','Menthe'],['#80b6ef','Bleu'],['#e99bb7','Rose']]
export const nodeHeight = text => Math.max(76, Math.min(340, String(text || '').split('\n').reduce((sum,line) => sum + Math.max(1,Math.ceil(line.length / 25)),0)*21+32))
export function mapNodes(store) {
  return [...store.entries()].filter(([,node])=>node instanceof Y.Map).map(([id,node])=>({id,...node.toJSON()})).filter(node=>Number.isFinite(node.x)&&Number.isFinite(node.y)).map(node=>({...node,text:typeof node.text==='string'?node.text:'Idée',color:/^#[0-9a-f]{6}$/i.test(node.color||'')?node.color:MAP_COLORS[0][0]}))
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
  const ids=new Set(nodes.map(node=>node.id)),placed=new Set(),positions=[]
  let cursor=0
  const place=(node,depth)=>{
    if(placed.has(node.id))return null
    placed.add(node.id)
    const children=nodes.filter(child=>child.parentId===node.id&&!placed.has(child.id))
    const ys=children.map(child=>place(child,depth+1)).filter(y=>y!==null)
    const y=ys.length?(ys[0]+ys[ys.length-1])/2:cursor
    if(!ys.length)cursor+=Math.max(125,nodeHeight(node.text)+42)
    positions.push({id:node.id,x:depth*320,y})
    return y
  }
  nodes.filter(node=>!ids.has(node.parentId)).forEach(node=>{place(node,0);cursor+=60})
  nodes.filter(node=>!placed.has(node.id)).forEach(node=>{place(node,0);cursor+=60})
  return positions
}
export function fitMap(nodes,width,height) {
  if(!nodes.length)return{x:width/2-NODE_WIDTH/2,y:height/2-40,k:1}
  const minX=Math.min(...nodes.map(n=>n.x)),minY=Math.min(...nodes.map(n=>n.y))
  const maxX=Math.max(...nodes.map(n=>n.x+NODE_WIDTH)),maxY=Math.max(...nodes.map(n=>n.y+nodeHeight(n.text)))
  const k=Math.max(.15,Math.min(1.2,(width-100)/(maxX-minX),(height-100)/(maxY-minY)))
  return{k,x:width/2-(minX+maxX)/2*k,y:height/2-(minY+maxY)/2*k}
}
