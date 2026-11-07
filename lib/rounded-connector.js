const limit=(value,fallback,min=12,max=2000)=>Number.isFinite(value)?Math.max(min,Math.min(max,value)):fallback
export function roundedConnector(start,end,link={}) {
 const isVertical=side=>['top','bottom'].includes(side),vertical=start.side&&end.side?isVertical(start.side)&&isVertical(end.side):start.side?isVertical(start.side):end.side?isVertical(end.side):Math.abs(end.y-start.y)>Math.abs(end.x-start.x),u=vertical?'y':'x',v=vertical?'x':'y',direction=end[u]>=start[u]?1:-1
 const n1=start.side?start.normal:{[u]:direction,[v]:0},n2=end.side?end.normal:{[u]:-direction,[v]:0}
 const fallback=Math.max(24,Math.min(80,Math.abs(end[u]-start[u])*.28)),leadStart=limit(link.routeStart,fallback),leadEnd=limit(link.routeEnd,fallback),offset=limit(link.routeOffset,-80,-2000,2000),middle=(start[v]+end[v])/2+offset
 const a={x:start.x+n1.x*leadStart,y:start.y+n1.y*leadStart},b={x:end.x+n2.x*leadEnd,y:end.y+n2.y*leadEnd}
 const points=[{x:start.x,y:start.y},a,{...a,[v]:middle},{...b,[v]:middle},b,{x:end.x,y:end.y}]
 const midpoint=(p,q)=>({x:(p.x+q.x)/2,y:(p.y+q.y)/2}),handles=[]
 if(Math.hypot(a.x-start.x,a.y-start.y)>4)handles.push({...midpoint(start,a),id:'from-leg',endpoint:'from',axis:Math.abs(n1.x)>.5?'y':'x'})
 if(Math.hypot(a.x-points[2].x,a.y-points[2].y)>4&&n1[u])handles.push({...midpoint(a,points[2]),id:'first-bend',field:'routeStart',axis:u,sign:n1[u],value:leadStart})
 handles.push({...midpoint(points[2],points[3]),id:'middle',field:'routeOffset',axis:v,value:offset})
 if(Math.hypot(b.x-points[3].x,b.y-points[3].y)>4&&n2[u])handles.push({...midpoint(points[3],b),id:'last-bend',field:'routeEnd',axis:u,sign:n2[u],value:leadEnd})
 if(Math.hypot(b.x-end.x,b.y-end.y)>4)handles.push({...midpoint(b,end),id:'to-leg',endpoint:'to',axis:Math.abs(n2.x)>.5?'y':'x'})
 return {points,handles,leadStart,leadEnd,offset}
}
export function connectorSegmentPatch(geometry,handle,dx,dy) {
 const delta=handle.axis==='x'?dx:dy
 if(handle.field){const value=handle.value+delta*(handle.sign||1);return {lineStyle:'rounded',[handle.field]:Math.max(handle.field==='routeOffset'?-2000:12,Math.min(2000,value))}}
 const endpoint=handle.endpoint,point=geometry[endpoint==='from'?'start':'end'],next={x:point.x+(handle.axis==='x'?delta:0),y:point.y+(handle.axis==='y'?delta:0)}
 return {lineStyle:'rounded',endpoint,point:next}
}
