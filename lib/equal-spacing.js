import { nodeSize } from './mindmap.js'
const interval=(node,axis)=>{const size=nodeSize(node);return {start:node[axis],end:node[axis]+size[axis==='x'?'width':'height']}}
const overlaps=(a,b,axis)=>{const x=interval(a,axis),y=interval(b,axis);return Math.min(x.end,y.end)-Math.max(x.start,y.start)>Math.min(x.end-x.start,y.end-y.start)*.2}
export function equalSpacingCandidate(node,point,nodes,axis,scale=1) {
 const otherAxis=axis==='x'?'y':'x',moving={...node,...point},size=nodeSize(node)[axis==='x'?'width':'height'],threshold=6/Math.max(.15,scale)
 const row=nodes.filter(other=>other.id!==node.id&&overlaps(moving,other,otherAxis)).sort((a,b)=>a[axis]-b[axis]);let best=null
 for(let i=0;i<row.length-1;i++){
  const a=row[i],b=row[i+1],aa=interval(a,axis),bb=interval(b,axis)
  if(!overlaps(a,b,otherAxis)||bb.start<aa.end)continue
  const existingGap=bb.start-aa.end,betweenGap=(bb.start-aa.end-size)/2,candidates=[{value:(aa.end+bb.start-size)/2,gap:betweenGap,position:'middle'},{value:bb.end+existingGap,gap:existingGap,position:'after'},{value:aa.start-existingGap-size,gap:existingGap,position:'before'}]
  for(const candidate of candidates){
   const distance=Math.abs(candidate.value-point[axis]);if(candidate.gap<0||distance>threshold||best&&distance>=best.distance)continue
   const placed={...moving,[axis]:candidate.value},range=interval(placed,axis)
   if(row.some(other=>{const r=interval(other,axis);return Math.min(r.end,range.end)-Math.max(r.start,range.start)>.01}))continue
   const triple=candidate.position==='middle'?[a,placed,b]:candidate.position==='after'?[a,b,placed]:[placed,a,b]
   best={...candidate,distance,axis,triple}
  }
 }
 return best
}
export function spacingGuide(candidate,scale=1) {
 const {axis,triple,gap}=candidate,secondary=axis==='x'?'y':'x',crossSize=secondary==='x'?'width':'height',baseline=Math.max(...triple.map(n=>n[secondary]+nodeSize(n)[crossSize]))+22/Math.max(.15,scale)
 return {axis,gap,spans:triple.slice(1).map((node,i)=>{const a=interval(triple[i],axis).end,b=node[axis];return axis==='x'?{x1:a,x2:b,y1:baseline,y2:baseline}:{x1:baseline,x2:baseline,y1:a,y2:b}})}
}
