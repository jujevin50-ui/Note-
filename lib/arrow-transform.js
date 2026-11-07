import { LOCAL_MAP_CHANGE } from './mindmap.js'
import { transformLineControls } from './line-editing.js'
import { moveConnectionEndpoint, updateConnection } from './mindmap-connections.js'
const point=p=>({x:p.x,y:p.y})
export function arrowDimensions(geometry) {
 const {start,end}=geometry,dx=end.x-start.x,dy=end.y-start.y
 return {x:Math.min(start.x,end.x),y:Math.min(start.y,end.y),width:Math.abs(dx),height:Math.abs(dy),length:Math.hypot(dx,dy),angle:Math.atan2(dy,dx)*180/Math.PI}
}
export function transformArrow(geometry,key,value) {
 if(!Number.isFinite(value))return {start:point(geometry.start),end:point(geometry.end)}
 const d=arrowDimensions(geometry),cx=(geometry.start.x+geometry.end.x)/2,cy=(geometry.start.y+geometry.end.y)/2
 let dx=geometry.end.x-geometry.start.x,dy=geometry.end.y-geometry.start.y
 if(key==='x'||key==='y'){const delta=value-d[key];return {start:{x:geometry.start.x+(key==='x'?delta:0),y:geometry.start.y+(key==='y'?delta:0)},end:{x:geometry.end.x+(key==='x'?delta:0),y:geometry.end.y+(key==='y'?delta:0)}}}
 if(key==='width')dx=Math.max(0,Math.min(5000,value))*(dx<0?-1:1)
 else if(key==='height')dy=Math.max(0,Math.min(5000,value))*(dy<0?-1:1)
 else if(key==='length'){const length=Math.max(1,Math.min(5000,value)),angle=d.angle*Math.PI/180;dx=Math.cos(angle)*length;dy=Math.sin(angle)*length}
 else if(key==='angle'){const angle=value*Math.PI/180,length=Math.max(1,d.length);dx=Math.cos(angle)*length;dy=Math.sin(angle)*length}
 if(Math.hypot(dx,dy)<1)return {start:point(geometry.start),end:point(geometry.end)}
 return {start:{x:cx-dx/2,y:cy-dy/2},end:{x:cx+dx/2,y:cy+dy/2}}
}
export function resizeArrow(geometry,handle,dx,dy) {
 const bounds=arrowDimensions(geometry),width=handle.includes('e')?Math.max(1,bounds.width+dx):handle.includes('w')?Math.max(1,bounds.width-dx):bounds.width,height=handle.includes('s')?Math.max(0,bounds.height+dy):handle.includes('n')?Math.max(0,bounds.height-dy):bounds.height
 const x=handle.includes('w')?bounds.x+bounds.width-width:bounds.x,y=handle.includes('n')?bounds.y+bounds.height-height:bounds.y
 const right=geometry.start.x>geometry.end.x,bottom=geometry.start.y>geometry.end.y
 return {start:{x:x+(right?width:0),y:y+(bottom?height:0)},end:{x:x+(right?0:width),y:y+(bottom?0:height)}}
}
export function translateArrow(geometry,dx,dy) {return {start:{x:geometry.start.x+dx,y:geometry.start.y+dy},end:{x:geometry.end.x+dx,y:geometry.end.y+dy}}}
export function commitArrowTransform(doc,nodes,links,styles,link,geometry,next) {
 if(!next||![next.start.x,next.start.y,next.end.x,next.end.y].every(Number.isFinite))return
 doc.transact(()=>{let changed=false;for(const [endpoint,key]of [['from','start'],['to','end']]){const a=geometry[key],b=next[key];if(Math.hypot(a.x-b.x,a.y-b.y)>.0001){moveConnectionEndpoint(doc,nodes,links,styles,link,endpoint,{[endpoint]:null,[endpoint+'Point']:point(b)});changed=true}}if(changed)updateConnection(doc,styles,link.id,transformLineControls(geometry,next))},LOCAL_MAP_CHANGE)
}
