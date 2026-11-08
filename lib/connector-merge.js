const epsilon=.001
export function collapseConnector(points) {
 const clean=[]
 for(const point of points){
  const p={x:point.x,y:point.y}
  if(clean.length&&Math.hypot(p.x-clean.at(-1).x,p.y-clean.at(-1).y)<epsilon)continue
  while(clean.length>1){const a=clean.at(-2),b=clean.at(-1),cross=(b.x-a.x)*(p.y-b.y)-(b.y-a.y)*(p.x-b.x),length=Math.max(1,Math.hypot(b.x-a.x,b.y-a.y),Math.hypot(p.x-b.x,p.y-b.y));if(Math.abs(cross)>epsilon*length)break;clean.pop()}
  if(!clean.length||Math.hypot(p.x-clean.at(-1).x,p.y-clean.at(-1).y)>=epsilon)clean.push(p)
 }
 if(clean.length===1)clean.push({x:points.at(-1).x,y:points.at(-1).y})
 else if(clean.length)clean[clean.length-1]={x:points.at(-1).x,y:points.at(-1).y}
 return clean
}
export function snapConnectorSegment(points,index,amount,threshold=0) {
 if(threshold<=0)return amount
 const a=points[index],b=points[index+1],dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy)
 if(length<epsilon)return amount
 const nx=-dy/length,ny=dx/length,candidates=[0]
 for(const otherIndex of [index-2,index+2]){
  const p=points[otherIndex],q=points[otherIndex+1]
  if(!p||!q)continue
  const ox=q.x-p.x,oy=q.y-p.y,otherLength=Math.hypot(ox,oy)
  if(otherLength>epsilon&&Math.abs(dx*oy-dy*ox)<=epsilon*length*otherLength)candidates.push((p.x-a.x)*nx+(p.y-a.y)*ny)
 }
 let snapped=amount,distance=Infinity
 for(const candidate of candidates){const delta=Math.abs(amount-candidate);if(delta<=threshold&&delta<distance){distance=delta;snapped=candidate}}
 return snapped
}
