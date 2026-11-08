import { connectionGeometry } from './mindmap-connections.js'
const clamp=(n,min,max)=>Math.max(min,Math.min(Math.max(min,max),n))
export function arrowInsertion(canvas,button,view) {
 const k=view.k,margin=18,length=Math.max(16,Math.min(200,(canvas.width-24)/k-margin*2)),rise=Math.max(0,Math.min(80,(canvas.height-24)/k-margin*2))
 const styles={lineStyle:'rounded',arrowEnd:true,dash:'solid',stroke:'#aab7c0',width:3.5,routeStart:Math.max(12,length*.28),routeEnd:Math.max(12,length*.28),routeOffset:-rise}
 const geometry=connectionGeometry(null,null,{...styles,fromPoint:{x:0,y:0},toPoint:{x:length,y:0}}),bounds=geometry.bounds
 const left=clamp(button.left+button.width/2-bounds.width*k/2,canvas.left+12,canvas.left+canvas.width-12-bounds.width*k)
 const top=clamp(Math.max(button.bottom+12,canvas.top+12),canvas.top+12,canvas.top+canvas.height-12-bounds.height*k)
 const fromPoint={x:(left-canvas.left-view.x)/k-bounds.x,y:(top-canvas.top-view.y)/k-bounds.y}
 return {fromPoint,toPoint:{x:fromPoint.x+length,y:fromPoint.y},styles}
}
