const epsilon=.001
export function isOrthogonal(points) {return points.slice(1).every((p,i)=>Math.abs(p.x-points[i].x)<epsilon||Math.abs(p.y-points[i].y)<epsilon)}
export function encodeOrthogonalPoints(start,end,points) {
 const refs=points.map(()=>({}))
 for(const axis of ['x','y']){
  let first=0
  while(first<points.length){let last=first;while(last+1<points.length&&Math.abs(points[last+1][axis]-points[first][axis])<epsilon)last++
   const anchor=first===0?0:last===points.length-1?1:.5,offset=points[first][axis]-((1-anchor)*start[axis]+anchor*end[axis])
   for(let i=first;i<=last;i++){refs[i][axis+'Anchor']=anchor;refs[i][axis]=offset}first=last+1
  }
 }
 return refs.slice(1,-1)
}
export function orthogonalVertices(start,end,controls,references) {
 const valid=Array.isArray(references)&&references.length===controls.length&&references.every(p=>['x','y','xAnchor','yAnchor'].every(k=>Number.isFinite(p[k])))
 const decoded=valid?references.map(p=>({x:start.x*(1-p.xAnchor)+end.x*p.xAnchor+p.x,y:start.y*(1-p.yAnchor)+end.y*p.yAnchor+p.y})):controls
 const input=[start,...decoded,end],points=[{x:start.x,y:start.y}]
 for(let i=1;i<input.length;i++){
  const a=points.at(-1),b=input[i],dx=b.x-a.x,dy=b.y-a.y
  if(Math.abs(dx)>epsilon&&Math.abs(dy)>epsilon){
   const last=i===input.length-1,horizontalStart=['left','right'].includes(start.side),verticalStart=['top','bottom'].includes(start.side),horizontalEnd=['left','right'].includes(end.side),verticalEnd=['top','bottom'].includes(end.side),previous=points.at(-2)
   let horizontalFirst
   if(last&&(horizontalEnd||verticalEnd))horizontalFirst=verticalEnd
   else if(i===1&&(horizontalStart||verticalStart))horizontalFirst=horizontalStart
   else if(previous)horizontalFirst=Math.abs(a.x-previous.x)<epsilon
   else horizontalFirst=Math.abs(dx)>=Math.abs(dy)
   points.push(horizontalFirst?{x:b.x,y:a.y}:{x:a.x,y:b.y})
  }
  if(Math.hypot(b.x-points.at(-1).x,b.y-points.at(-1).y)>epsilon)points.push({x:b.x,y:b.y})
 }
 if(points.length===1)points.push({x:end.x,y:end.y})
 return points
}
