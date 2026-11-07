import * as Y from 'yjs'
import { decodeControlPoints } from './line-editing.js'
import { roundedConnector } from './rounded-connector.js'
import { LOCAL_MAP_CHANGE, nodeSize } from './mindmap.js'
const clamp=(value,min,max,fallback)=>Number.isFinite(Number(value))&&value!==null?Math.max(min,Math.min(max,Number(value))):fallback
const normals={top:{x:0,y:-1},right:{x:1,y:0},bottom:{x:0,y:1},left:{x:-1,y:0}}
export const CONNECTION_SIDES=[['auto','Automatique'],['top','Haut'],['right','Droite'],['bottom','Bas'],['left','Gauche']]
const LINK_FIELDS=['fromSide','toSide','fromOffset','toOffset','lineStyle','bend','arrowStart','arrowEnd','stroke','width','dash','headLength','headWidth','routeStart','routeEnd','routeOffset','curveAlong','curveOffset','controlPoints']
const fieldKey=(id,key)=>JSON.stringify([id,key])
export function updateConnection(doc,styles,id,patch) {
 // Independent keys also merge when two members customise a legacy link for the first time.
 doc.transact(()=>{for(const[key,value]of Object.entries(patch)){if(!LINK_FIELDS.includes(key))continue;value===null?styles.delete(fieldKey(id,key)):styles.set(fieldKey(id,key),value)}},LOCAL_MAP_CHANGE)
}
export function clearConnectionStyle(doc,styles,id) {
 doc.transact(()=>{styles.delete(id);for(const key of LINK_FIELDS)styles.delete(fieldKey(id,key))},LOCAL_MAP_CHANGE)
}
export function connectionStyle(styles,id) {
 const fields=styles?.get(id),result=fields instanceof Y.Map?fields.toJSON():{}
 for(const key of LINK_FIELDS)if(styles?.has(fieldKey(id,key)))result[key]=styles.get(fieldKey(id,key))
 return result
}
export function automaticSide(node,other) {
 const size=nodeSize(node),target=other.point?{width:0,height:0}:nodeSize(other),dx=other.x+target.width/2-node.x-size.width/2,dy=other.y+target.height/2-node.y-size.height/2
 return Math.abs(dx)/size.width>=Math.abs(dy)/size.height?(dx>=0?'right':'left'):(dy>=0?'bottom':'top')
}
export function connectionAnchor(node,side='auto',offset=.5,other=node) {
 if(!normals[side])side=automaticSide(node,other)
 const {width:w,height:h}=nodeSize(node),t=clamp(offset,0,1,.5),normal=normals[side]
 let x=side==='left'?0:side==='right'?w:w*t,y=side==='top'?0:side==='bottom'?h:h*t
 if(node.shape==='ellipse'){
  if(side==='top'||side==='bottom')y=h/2+(side==='top'?-1:1)*h/2*Math.sqrt(Math.max(0,1-((x-w/2)/(w/2))**2))
  else x=w/2+(side==='left'?-1:1)*w/2*Math.sqrt(Math.max(0,1-((y-h/2)/(h/2))**2))
 }else{
  const r=Math.min(node.shape==='pill'?45:node.shape==='note'?0:15,w/2,h/2)
  if(r){if(side==='top'||side==='bottom'){const corner=x<r?r:x>w-r?w-r:null;if(corner!==null)y=side==='top'?r-Math.sqrt(Math.max(0,r*r-(x-corner)**2)):h-r+Math.sqrt(Math.max(0,r*r-(x-corner)**2))}else{const corner=y<r?r:y>h-r?h-r:null;if(corner!==null)x=side==='left'?r-Math.sqrt(Math.max(0,r*r-(y-corner)**2)):w-r+Math.sqrt(Math.max(0,r*r-(y-corner)**2))}}
 }
 return {x:node.x+x,y:node.y+y,side,normal}
}
export function nearestConnectionAnchor(node,point) {
 // Sample the actual outline so ellipse and rounded corners stay attached.
 let best={distance:Infinity,side:'right',offset:.5}
 for(const[side]of CONNECTION_SIDES.slice(1))for(let i=0;i<=100;i++){const offset=i/100,p=connectionAnchor(node,side,offset),distance=(p.x-point.x)**2+(p.y-point.y)**2;if(distance<best.distance)best={distance,side,offset}}
 return {side:best.side,offset:best.offset}
}
// Orthogonal visibility grid routes around the two endpoint blocks.
function orthogonalRoute(from,to,start,end,clearance) {
 const boxes=[from,to].map(node=>{const {width,height}=nodeSize(node);return {left:node.x-clearance,right:node.x+width+clearance,top:node.y-clearance,bottom:node.y+height+clearance}})
 const outside=(node,p)=>{const size=nodeSize(node),lead=clearance+12;return {x:p.side==='left'?node.x-lead:p.side==='right'?node.x+size.width+lead:p.x,y:p.side==='top'?node.y-lead:p.side==='bottom'?node.y+size.height+lead:p.y}}
 const a=outside(from,start),b=outside(to,end)
 const xs=[...new Set([a.x,b.x,...boxes.flatMap(box=>[box.left,box.right])])].sort((x,y)=>x-y),ys=[...new Set([a.y,b.y,...boxes.flatMap(box=>[box.top,box.bottom])])].sort((x,y)=>x-y)
 const inside=p=>boxes.some(r=>p.x>r.left&&p.x<r.right&&p.y>r.top&&p.y<r.bottom)
 const clear=(p,q)=>!boxes.some(r=>p.x===q.x?p.x>r.left&&p.x<r.right&&Math.max(p.y,q.y)>r.top&&Math.min(p.y,q.y)<r.bottom:p.y>r.top&&p.y<r.bottom&&Math.max(p.x,q.x)>r.left&&Math.min(p.x,q.x)<r.right)
 const points=xs.flatMap((x,xi)=>ys.map((y,yi)=>({x,y,xi,yi}))),begin=points.findIndex(p=>p.x===a.x&&p.y===a.y),goal=points.findIndex(p=>p.x===b.x&&p.y===b.y)
 const queue=[{id:begin,dir:start.normal.x?'h':'v',cost:0,path:[a]}],best=new Map()
 while(queue.length){
  queue.sort((p,q)=>p.cost-q.cost);const current=queue.shift(),key=current.id+current.dir
  if((best.get(key)??Infinity)<=current.cost)continue
  best.set(key,current.cost)
  if(current.id===goal)return [start,...current.path,end]
  const p=points[current.id]
  for(const [dx,dy]of [[-1,0],[1,0],[0,-1],[0,1]]){
   const xi=p.xi+dx,yi=p.yi+dy;if(xi<0||xi>=xs.length||yi<0||yi>=ys.length)continue
   const id=xi*ys.length+yi,q=points[id];if(inside(q)||!clear(p,q))continue
   const dir=dx?'h':'v',cost=current.cost+Math.abs(q.x-p.x)+Math.abs(q.y-p.y)+(dir!==current.dir?24:0)
   if(cost<(best.get(id+dir)??Infinity))queue.push({id,dir,cost,path:[...current.path,q]})
  }
 }
 // Overlapping blocks may have no exterior corridor.
 return [start,a,b,end]
}
function routePath(points,radius=0) {
 const clean=[]
 for(const p of points){if(clean.length&&p.x===clean.at(-1).x&&p.y===clean.at(-1).y)continue;while(clean.length>1){const a=clean.at(-2),b=clean.at(-1);if((b.x-a.x)*(p.y-b.y)!==(b.y-a.y)*(p.x-b.x)||(b.x-a.x)*(p.x-b.x)+(b.y-a.y)*(p.y-b.y)<0)break;clean.pop()}clean.push(p)}
 let d=`M ${clean[0].x} ${clean[0].y}`
 for(let i=1;i<clean.length;i++){
  const p=clean[i],a=clean[i-1],b=clean[i+1]
  if(!radius||!b){d+=` L ${p.x} ${p.y}`;continue}
  const before=Math.hypot(p.x-a.x,p.y-a.y),after=Math.hypot(b.x-p.x,b.y-p.y),r=Math.min(radius,before/2,after/2),entry={x:p.x+(a.x-p.x)*r/before,y:p.y+(a.y-p.y)*r/before},exit={x:p.x+(b.x-p.x)*r/after,y:p.y+(b.y-p.y)*r/after}
  d+=` L ${entry.x} ${entry.y} Q ${p.x} ${p.y}, ${exit.x} ${exit.y}`
 }
 return d
}
export function connectionGeometry(from,to,link={},defaults={}) {
 const fromPoint=from?connectionAnchor(from,link.fromSide,link.fromOffset,to||{...link.toPoint,point:true}):link.fromPoint
 const toPoint=to?connectionAnchor(to,link.toSide,link.toOffset,from||{...link.fromPoint,point:true}):link.toPoint
 if(!fromPoint||!toPoint)return null
 const freeAnchor=(point,other)=>{const dx=other.x-point.x,dy=other.y-point.y,length=Math.hypot(dx,dy)||1;return {...point,normal:{x:dx/length,y:dy/length}}}
 const start=from?fromPoint:freeAnchor(fromPoint,toPoint),end=to?toPoint:freeAnchor(toPoint,fromPoint)
 const lineStyle=link.lineStyle||defaults.lineStyle||'curve',distance=Math.hypot(end.x-start.x,end.y-start.y),bend=clamp(link.bend,20,240,Math.max(50,Math.min(160,distance*.4)))
 const route=roundedConnector(start,end,link),controlPoints=decodeControlPoints(start,end,link.controlPoints)
 const segmentHandles=lineStyle==='rounded'?route.handles:lineStyle==='straight'?[{x:(start.x+end.x)/2,y:(start.y+end.y)/2,id:'middle',field:'routeOffset',axis:Math.abs(end.x-start.x)>=Math.abs(end.y-start.y)?'y':'x',value:0}]:[]
 let d,curvePoint
 if(lineStyle==='points')d=`M ${start.x} ${start.y}`+[...controlPoints,end].map(p=>` L ${p.x} ${p.y}`).join('')
 else if(lineStyle==='curve'&&(Number.isFinite(link.curveAlong)||Number.isFinite(link.curveOffset))){
  const ux=(end.x-start.x)/(distance||1),uy=(end.y-start.y)/(distance||1),along=clamp(link.curveAlong,-5000,5000,0),offset=clamp(link.curveOffset,-5000,5000,0)
  curvePoint={x:(start.x+end.x)/2+ux*along-uy*offset,y:(start.y+end.y)/2+uy*along+ux*offset}
  d=`M ${start.x} ${start.y} Q ${(start.x+end.x)/2+2*(ux*along-uy*offset)} ${(start.y+end.y)/2+2*(uy*along+ux*offset)}, ${end.x} ${end.y}`
 }
 else if(lineStyle==='rounded')d=route.d
 else if(lineStyle==='straight')d=`M ${start.x} ${start.y} L ${end.x} ${end.y}`
 else if(!from||!to){
  if(lineStyle==='step')d=`M ${start.x} ${start.y} L ${(start.x+end.x)/2} ${start.y} L ${(start.x+end.x)/2} ${end.y} L ${end.x} ${end.y}`
  else if(!from&&!to){const dx=end.x-start.x,dy=end.y-start.y,length=distance||1,nx=-dy/length,ny=dx/length;d=`M ${start.x} ${start.y} C ${start.x+dx/3+nx*bend} ${start.y+dy/3+ny*bend}, ${end.x-dx/3+nx*bend} ${end.y-dy/3+ny*bend}, ${end.x} ${end.y}`}
  else d=`M ${start.x} ${start.y} C ${start.x+start.normal.x*bend} ${start.y+start.normal.y*bend}, ${end.x+end.normal.x*bend} ${end.y+end.normal.y*bend}, ${end.x} ${end.y}`
 }else {
  const horizontal=start.normal.x&&end.normal.x&&start.normal.x===-end.normal.x&&(end.x-start.x)*start.normal.x>0
  const vertical=start.normal.y&&end.normal.y&&start.normal.y===-end.normal.y&&(end.y-start.y)*start.normal.y>0
  if(lineStyle==='curve'&&(horizontal||vertical)){
   const control=Math.min(bend,Math.abs(horizontal?end.x-start.x:end.y-start.y)*.5)
   d=`M ${start.x} ${start.y} C ${start.x+start.normal.x*control} ${start.y+start.normal.y*control}, ${end.x+end.normal.x*control} ${end.y+end.normal.y*control}, ${end.x} ${end.y}`
  }else{
   const clearance=lineStyle==='curve'?Math.max(16,Math.min(60,bend*.25)):16
   d=routePath(orthogonalRoute(from,to,start,end,clearance),lineStyle==='curve'?clearance:0)
  }
 }
 const coordinates=(d.match(/[-+]?(?:\d*\.\d+|\d+)(?:e[-+]?\d+)?/gi)||[]).map(Number),xs=coordinates.filter((_,index)=>index%2===0),ys=coordinates.filter((_,index)=>index%2===1)
 const margin=clamp(link.width,1,8,2.5)*4*Math.max(clamp(link.headLength,.5,2.5,1),clamp(link.headWidth,.5,2.5,1))+4
 const bounds={x:Math.min(...xs)-margin,y:Math.min(...ys)-margin,width:Math.max(...xs)-Math.min(...xs)+margin*2,height:Math.max(...ys)-Math.min(...ys)+margin*2}
 return {start,end,d,bounds,lineStyle,segmentHandles,curvePoint,controlPoints,routePoints:route.points,color:/^#[0-9a-f]{6}$/i.test(link.stroke||'')?link.stroke:link.color||'#aaa3b9',width:clamp(link.width,1,8,2.5),headLength:clamp(link.headLength,.5,2.5,1),headWidth:clamp(link.headWidth,.5,2.5,1),dash:link.dash|| (link.extra?'dashed':'solid'),arrowStart:link.arrowStart??false,arrowEnd:link.arrowEnd??Boolean(defaults.arrows)}
}

export function moveConnectionEndpoint(doc,nodes,links,styles,link,endpoint,patch) {
 if(!link||!['from','to'].includes(endpoint))return false
 const target=patch[endpoint],point=patch[endpoint+'Point']
 if(target?(!nodes.has(target)||target===link[endpoint==='from'?'to':'from']):!point||!Number.isFinite(point.x)||!Number.isFinite(point.y))return false
 doc.transact(()=>{
  const raw=links.get(link.id)||{from:link.from,to:link.to,color:link.color}
  if(!link.extra){const child=nodes.get(link.to);if(child instanceof Y.Map&&child.get('parentId')===link.from)child.set('parentId',null)}
  links.set(link.id,{...raw,[endpoint]:target||null,[endpoint+'Point']:target?null:point})
  updateConnection(doc,styles,link.id,patch)
 },LOCAL_MAP_CHANGE)
 return true
}
