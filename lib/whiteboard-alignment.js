import { equalSpacingCandidate, spacingGuide } from './equal-spacing.js'
import { pathSamples } from './line-editing.js'
import { nodeSize } from './mindmap.js'
const alignmentSize=node=>node.alignmentOnly?{width:node.width,height:node.height}:nodeSize(node)
export function arrowAlignmentBox(link) {
 const points=pathSamples(link.geometry.d),xs=points.map(p=>p.x),ys=points.map(p=>p.y)
 const x=Math.min(...xs),y=Math.min(...ys)
 return {id:'arrow:'+link.id,x,y,width:Math.max(...xs)-x,height:Math.max(...ys)-y,alignmentOnly:true}
}
// Attached arrows follow the moving object and must not become its own snap targets.
export function alignmentTargets(nodes,links,moving) {
 const byId=new Map(links.map(link=>[link.id,link]))
 const follows=(link,seen=new Set())=>{
  if(!link||seen.has(link.id))return false
  if(moving.arrowId===link.id||moving.nodeId&&(link.from===moving.nodeId||link.to===moving.nodeId))return true
  const visited=new Set(seen);visited.add(link.id)
  return ['from','to'].some(endpoint=>follows(byId.get(link[endpoint+'Arrow']?.id),visited))
 }
 return [...nodes,...links.filter(link=>!follows(link)).map(arrowAlignmentBox)]
}
export function snapMapNode(node,point,nodes,scale=1,disabled=false) {
 if(disabled)return {...point,guides:[],spacing:[]}
 const size=alignmentSize(node),threshold=6/Math.max(.15,scale),matches={x:null,y:null}
 for(const other of nodes){
  if(other.id===node.id)continue
  const target=alignmentSize(other)
  for(const axis of ['x','y']){
   const length=axis==='x'?'width':'height'
   for(const fraction of [0,.5,1])for(const otherFraction of [0,.5,1]){
    const value=other[axis]+target[length]*otherFraction,delta=value-(point[axis]+size[length]*fraction)
    if(Math.abs(delta)<=threshold&&(!matches[axis]||Math.abs(delta)<Math.abs(matches[axis].delta)))matches[axis]={value,delta,other}
   }
  }
 }
 let x=point.x+(matches.x?.delta||0),y=point.y+(matches.y?.delta||0)
 const guides=[],spacing=[],candidates=node.alignmentOnly?[]:['x','y'].map(axis=>equalSpacingCandidate(node,axis==='x'?{x:point.x,y}:{x,y:point.y},nodes.filter(other=>!other.alignmentOnly),axis,scale))
 for(const candidate of candidates)if(candidate){const alignedDelta=matches[candidate.axis]?.delta;if(alignedDelta!==undefined&&Math.abs(alignedDelta)<candidate.distance)continue;if(candidate.axis==='x')x=candidate.value;else y=candidate.value;spacing.push(spacingGuide(candidate,scale))}
 if(matches.x&&Math.abs(x-point.x-matches.x.delta)<.001){const other=matches.x.other;guides.push({x1:matches.x.value,x2:matches.x.value,y1:Math.min(y,other.y)-16,y2:Math.max(y+size.height,other.y+alignmentSize(other).height)+16})}
 if(matches.y&&Math.abs(y-point.y-matches.y.delta)<.001){const other=matches.y.other;guides.push({y1:matches.y.value,y2:matches.y.value,x1:Math.min(x,other.x)-16,x2:Math.max(x+size.width,other.x+alignmentSize(other).width)+16})}
 return {x,y,guides,spacing}
}
