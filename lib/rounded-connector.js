const limit=(value,fallback,min=12,max=2000)=>Number.isFinite(value)?Math.max(min,Math.min(max,value)):fallback

function roundedSegments(points,radius=22) {
 const lengths=points.slice(1).map((p,index)=>Math.hypot(p.x-points[index].x,p.y-points[index].y))
 const radii=points.map((p,index)=>{
  if(!index||index===points.length-1)return 0
  const a=points[index-1],b=points[index+1],turn=(p.x-a.x)*(b.y-p.y)-(p.y-a.y)*(b.x-p.x)
  return Math.abs(turn)>1e-8?Math.min(radius,lengths[index-1],lengths[index]):0
 })
 // Neighbouring corners share the available segment; terminal corners can use the full short leg.
 lengths.forEach((length,index)=>{const sum=radii[index]+radii[index+1];if(sum>length){radii[index]*=length/sum;radii[index+1]*=length/sum}})
 const along=(a,b,distance)=>{const length=Math.hypot(b.x-a.x,b.y-a.y);return length?{x:a.x+(b.x-a.x)*distance/length,y:a.y+(b.y-a.y)*distance/length}:{x:a.x,y:a.y}}
 let d=`M ${points[0].x} ${points[0].y}`
 for(let i=1;i<points.length-1;i++){
  const p=points[i],r=radii[i]
  if(!r){d+=` L ${p.x} ${p.y}`;continue}
  const entry=along(p,points[i-1],r),exit=along(p,points[i+1],r)
  d+=` L ${entry.x} ${entry.y} Q ${p.x} ${p.y}, ${exit.x} ${exit.y}`
 }
 d+=` L ${points.at(-1).x} ${points.at(-1).y}`
 const segments=lengths.map((length,index)=>({x:(points[index].x+points[index+1].x)/2,y:(points[index].y+points[index+1].y)/2,segmentLength:Math.max(0,length-radii[index]-radii[index+1]),handleSpace:Math.max(0,length-2*Math.max(radii[index],radii[index+1]))}))
 return {d,segments}
}

export function roundedConnector(start,end,link={}) {
 const isVertical=side=>['top','bottom'].includes(side),vertical=start.side&&end.side?isVertical(start.side)&&isVertical(end.side):start.side?isVertical(start.side):end.side?isVertical(end.side):Math.abs(end.y-start.y)>Math.abs(end.x-start.x),u=vertical?'y':'x',v=vertical?'x':'y',direction=end[u]>=start[u]?1:-1
 const n1=start.side?start.normal:{[u]:direction,[v]:0},n2=end.side?end.normal:{[u]:-direction,[v]:0}
 const fallback=Math.max(24,Math.min(80,Math.abs(end[u]-start[u])*.28)),leadStart=limit(link.routeStart,fallback),leadEnd=limit(link.routeEnd,fallback),offset=limit(link.routeOffset,-80,-2000,2000),middle=(start[v]+end[v])/2+offset
 const a={x:start.x+n1.x*leadStart,y:start.y+n1.y*leadStart},b={x:end.x+n2.x*leadEnd,y:end.y+n2.y*leadEnd}
 const points=[{x:start.x,y:start.y},a,{...a,[v]:middle},{...b,[v]:middle},b,{x:end.x,y:end.y}]
 const {d,segments}=roundedSegments(points),handles=[]
 if(Math.hypot(a.x-start.x,a.y-start.y)>4)handles.push({...segments[0],id:'from-leg',endpoint:'from',axis:Math.abs(n1.x)>.5?'y':'x'})
 if(Math.hypot(a.x-points[2].x,a.y-points[2].y)>4&&n1[u])handles.push({...segments[1],id:'first-bend',field:'routeStart',axis:u,sign:n1[u],value:leadStart})
 handles.push({...segments[2],id:'middle',field:'routeOffset',axis:v,value:offset})
 if(Math.hypot(b.x-points[3].x,b.y-points[3].y)>4&&n2[u])handles.push({...segments[3],id:'last-bend',field:'routeEnd',axis:u,sign:n2[u],value:leadEnd})
 if(Math.hypot(b.x-end.x,b.y-end.y)>4)handles.push({...segments[4],id:'to-leg',endpoint:'to',axis:Math.abs(n2.x)>.5?'y':'x'})
 return {points,d,handles,leadStart,leadEnd,offset}
}
export function connectorSegmentPatch(geometry,handle,dx,dy) {
 const delta=handle.axis==='x'?dx:dy
 if(handle.field){const value=handle.value+delta*(handle.sign||1);return {lineStyle:'rounded',[handle.field]:Math.max(handle.field==='routeOffset'?-2000:12,Math.min(2000,value))}}
 const endpoint=handle.endpoint,point=geometry[endpoint==='from'?'start':'end'],next={x:point.x+(handle.axis==='x'?delta:0),y:point.y+(handle.axis==='y'?delta:0)}
 return {lineStyle:'rounded',endpoint,point:next}
}
