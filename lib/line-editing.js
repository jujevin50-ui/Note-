const finite=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)
const midpoint=(a,b)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2})
export function pathSamples(d,steps=24) {
 const tokens=d.match(/[-+]?(?:\d*\.\d+|\d+)(?:e[-+]?\d+)?|[MLCQ]/gi)||[],points=[];let i=0,current={x:0,y:0}
 const read=()=>({x:Number(tokens[i++]),y:Number(tokens[i++])})
 while(i<tokens.length){const command=tokens[i++].toUpperCase();if(command==='M'){current=read();points.push(current);continue}const a=current,b=read(),c=command!=='L'?read():null,e=command==='C'?read():c||b
  for(let n=1;n<=(command==='L'?1:steps);n++){const t=command==='L'?1:n/steps,u=1-t;points.push(command==='L'?b:command==='Q'?{x:u*u*a.x+2*u*t*b.x+t*t*c.x,y:u*u*a.y+2*u*t*b.y+t*t*c.y}:{x:u**3*a.x+3*u*u*t*b.x+3*u*t*t*c.x+t**3*e.x,y:u**3*a.y+3*u*u*t*b.y+3*u*t*t*c.y+t**3*e.y})}current=e
 }
 return points.filter(finite)
}
export function pathMiddle(d) {
 const points=pathSamples(d);if(!points.length)return{x:0,y:0}
 const lengths=points.slice(1).map((p,i)=>Math.hypot(p.x-points[i].x,p.y-points[i].y));let remaining=lengths.reduce((a,b)=>a+b,0)/2
 for(let i=0;i<lengths.length;i++){if(remaining<=lengths[i]){const t=lengths[i]?remaining/lengths[i]:0;return{x:points[i].x+(points[i+1].x-points[i].x)*t,y:points[i].y+(points[i+1].y-points[i].y)*t}}remaining-=lengths[i]}
 return points.at(-1)
}
export function decodeControlPoints(start,end,controls) {
 const center=midpoint(start,end)
 return Array.isArray(controls)?controls.filter(finite).slice(0,32).map(p=>({x:center.x+p.x,y:center.y+p.y})):[]
}
export function encodeControlPoints(geometry,points) {const center=midpoint(geometry.start,geometry.end);return points.filter(finite).slice(0,32).map(p=>({x:p.x-center.x,y:p.y-center.y}))}
export function editableVertices(geometry) {
 if(geometry.lineStyle==='points')return [geometry.start,...geometry.controlPoints,geometry.end]
 if(geometry.routePoints&&geometry.lineStyle==='rounded')return geometry.routePoints
 if(geometry.lineStyle==='step')return pathSamples(geometry.d,1).filter((p,i,points)=>!i||Math.hypot(p.x-points[i-1].x,p.y-points[i-1].y)>.01)
 if(geometry.lineStyle==='curve')return [geometry.start,pathMiddle(geometry.d),geometry.end]
 return [geometry.start,geometry.end]
}
export function lineEditHandles(geometry,scale=1) {
 if(geometry.lineStyle==='rounded'){
  const handles=geometry.segmentHandles.filter(h=>h.segmentLength===undefined||(h.handleSpace??h.segmentLength)*scale>=22)
  if(handles.length)return handles
 }
 if(['points','step'].includes(geometry.lineStyle)){
  const vertices=editableVertices(geometry),handles=vertices.slice(1,-1).map((p,index)=>({...p,id:'vertex-'+index,kind:'vertex',index,axis:'free'}))
  for(let i=0;i<vertices.length-1;i++)if(Math.hypot(vertices[i+1].x-vertices[i].x,vertices[i+1].y-vertices[i].y)*scale>=30)handles.push({...midpoint(vertices[i],vertices[i+1]),id:'insert-'+i,kind:'insert',index:i,axis:'free'})
  if(handles.length)return handles
 }
 return [{...(geometry.curvePoint||pathMiddle(geometry.d)),id:'bow',kind:'bow',axis:'free'}]
}
export function deformLine(geometry,handle,dx,dy) {
 const target={x:handle.x+dx,y:handle.y+dy}
 if(handle.kind==='bow'){
  const center=midpoint(geometry.start,geometry.end),vx=geometry.end.x-geometry.start.x,vy=geometry.end.y-geometry.start.y,length=Math.hypot(vx,vy)||1,ux=vx/length,uy=vy/length
  return {lineStyle:'curve',curveAlong:(target.x-center.x)*ux+(target.y-center.y)*uy,curveOffset:-(target.x-center.x)*uy+(target.y-center.y)*ux}
 }
 const points=editableVertices(geometry).slice(1,-1).map(p=>({...p}))
 if(handle.kind==='vertex')points[handle.index]=target
 else points.splice(handle.index,0,target)
 return {lineStyle:'points',controlPoints:encodeControlPoints(geometry,points)}
}
export function insertLinePoint(geometry,point) {
 const vertices=editableVertices(geometry);let best=Infinity,index=0
 for(let i=0;i<vertices.length-1;i++){const a=vertices[i],b=vertices[i+1],dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((point.x-a.x)*dx+(point.y-a.y)*dy)/(dx*dx+dy*dy||1))),distance=(point.x-a.x-t*dx)**2+(point.y-a.y-t*dy)**2;if(distance<best){best=distance;index=i}}
 const controls=vertices.slice(1,-1);controls.splice(index,0,point)
 return {lineStyle:'points',controlPoints:encodeControlPoints(geometry,controls)}
}
export function removeLinePoint(geometry,index) {return {lineStyle:'points',controlPoints:encodeControlPoints(geometry,editableVertices(geometry).slice(1,-1).filter((_,i)=>i!==index))}}
export function transformLineControls(geometry,next) {
 const center=midpoint(geometry.start,geometry.end),oldLength=Math.hypot(geometry.end.x-geometry.start.x,geometry.end.y-geometry.start.y),newLength=Math.hypot(next.end.x-next.start.x,next.end.y-next.start.y)
 if(oldLength<.001||newLength<.001)return {}
 const ux=(geometry.end.x-geometry.start.x)/oldLength,uy=(geometry.end.y-geometry.start.y)/oldLength,nx=(next.end.x-next.start.x)/newLength,ny=(next.end.y-next.start.y)/newLength,ratio=newLength/oldLength
 const project=p=>({along:((p.x-center.x)*ux+(p.y-center.y)*uy)*ratio,offset:(-(p.x-center.x)*uy+(p.y-center.y)*ux)*ratio})
 if(geometry.lineStyle==='points')return {controlPoints:geometry.controlPoints.map(p=>{const v=project(p);return{x:nx*v.along-ny*v.offset,y:ny*v.along+nx*v.offset}})}
 if(geometry.lineStyle==='curve'&&geometry.curvePoint){const v=project(geometry.curvePoint);return {curveAlong:v.along,curveOffset:v.offset}}
 return {}
}
