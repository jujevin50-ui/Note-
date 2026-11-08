import { connectionGeometry } from './mindmap-connections.js'
import { pathSamples } from './line-editing.js'
const valid=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)
function pathMetrics(d) {
 const points=pathSamples(d,40),lengths=points.slice(1).map((p,i)=>Math.hypot(p.x-points[i].x,p.y-points[i].y))
 return {points,lengths,total:lengths.reduce((sum,n)=>sum+n,0)}
}
export function arrowPointAt(d,position) {
 const {points,lengths,total}=pathMetrics(d);if(!points.length)return null
 let remaining=total*Math.max(0,Math.min(1,Number(position)||0))
 for(let i=0;i<lengths.length;i++){if(remaining<=lengths[i]){const t=lengths[i]?remaining/lengths[i]:0;return {x:points[i].x+(points[i+1].x-points[i].x)*t,y:points[i].y+(points[i+1].y-points[i].y)*t}}remaining-=lengths[i]}
 return points.at(-1)
}
export function canJoinArrows(connections,sourceId,targetId) {
 const byId=new Map(connections.map(link=>[link.id,link])),pending=[targetId],seen=new Set()
 if(!byId.has(targetId)||sourceId===targetId)return false
 while(pending.length){const id=pending.pop();if(id===sourceId)return false;if(seen.has(id))continue;seen.add(id);const link=byId.get(id);for(const endpoint of ['from','to'])if(link?.[endpoint+'Arrow']?.id)pending.push(link[endpoint+'Arrow'].id)}
 return true
}
export function resolveArrowGeometries(connections,nodes,defaults={},preview=null) {
 const byId=new Map(connections.map(link=>[link.id,preview?.id===link.id?{...link,...preview}:link])),nodeById=new Map(nodes.map(node=>[node.id,node])),cache=new Map(),visiting=new Set()
 const resolve=id=>{
  if(cache.has(id))return cache.get(id)
  const original=byId.get(id);if(!original||visiting.has(id))return null
  visiting.add(id);const link={...original}
  for(const endpoint of ['from','to']){
   const attachment=link[endpoint+'Arrow']
   if(!link[endpoint]&&attachment?.id){const target=resolve(attachment.id),point=target&&arrowPointAt(target.geometry.d,attachment.position);if(valid(point))link[endpoint+'Point']=point}
  }
  const geometry=connectionGeometry(nodeById.get(link.from),nodeById.get(link.to),link,defaults),result=geometry?{...link,geometry}:null
  visiting.delete(id);cache.set(id,result);return result
 }
 return connections.map(link=>resolve(link.id)).filter(Boolean)
}
export function nearestArrowJunction(connections,sourceId,point,threshold) {
 let endpointBest=null,best=null
 for(const link of connections){
  if(!link.geometry||!canJoinArrows(connections,sourceId,link.id))continue
  const {points,lengths,total}=pathMetrics(link.geometry.d)
  for(const [position,p]of [[0,points[0]],[1,points.at(-1)]])if(valid(p)){const distance=Math.hypot(point.x-p.x,point.y-p.y);if(distance<=threshold&&(!endpointBest||distance<endpointBest.distance))endpointBest={id:link.id,position,point:p,distance}}
  let travelled=0
  for(let i=0;i<lengths.length;i++){const a=points[i],b=points[i+1],dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((point.x-a.x)*dx+(point.y-a.y)*dy)/(dx*dx+dy*dy||1))),p={x:a.x+t*dx,y:a.y+t*dy},distance=Math.hypot(point.x-p.x,point.y-p.y);if(distance<=threshold&&(!best||distance<best.distance))best={id:link.id,position:total?(travelled+t*lengths[i])/total:0,point:p,distance};travelled+=lengths[i]}
 }
 return endpointBest||best
}
