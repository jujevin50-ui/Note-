'use client'
import { lineEditHandles } from '../lib/line-editing'
const labels={'from-leg':'Déplacer le segment de départ','first-bend':'Déplacer le premier coude',middle:'Déplacer le segment central','last-bend':'Déplacer le dernier coude','to-leg':'Déplacer le segment d’arrivée'}
export default function ConnectorHandles({geometry,scale,onStart,onNudge,onRemove}) {
 return lineEditHandles(geometry,scale).map(handle=>{
  const direct=Boolean(handle.kind),horizontal=handle.axis==='y',width=(horizontal?16:6)/scale,height=(horizontal?6:16)/scale
  const label=handle.kind==='bow'?'Déformer la flèche':handle.kind==='vertex'?'Déplacer le point '+(handle.index+1):handle.kind==='insert'?'Créer un coude sur le segment '+(handle.index+1):labels[handle.id]
  return <g key={handle.id} className={'connector-segment '+(direct?'direct-point':horizontal?'horizontal':'vertical')} role="slider" tabIndex={0} aria-label={label} aria-valuemin={-5000} aria-valuemax={5000} aria-valuenow={Math.round(handle.value??0)} onPointerDown={event=>onStart(event,handle)} onDoubleClick={event=>event.stopPropagation()} onKeyDown={event=>{
   if(handle.kind==='vertex'&&['Delete','Backspace'].includes(event.key)){event.preventDefault();event.stopPropagation();onRemove(handle.index);return}
   const key=handle.axis==='free'?['ArrowLeft','ArrowRight','ArrowUp','ArrowDown']:handle.axis==='x'?['ArrowLeft','ArrowRight']:['ArrowUp','ArrowDown']
   if(key.includes(event.key)){event.preventDefault();event.stopPropagation();onNudge(handle,(event.key==='ArrowLeft'||event.key==='ArrowUp'?-1:1)*(event.shiftKey?20:5),['ArrowLeft','ArrowRight'].includes(event.key)?'x':'y')}
  }}>
   <rect className="connector-handle-hit" x={handle.x-15/scale} y={handle.y-15/scale} width={30/scale} height={30/scale} rx={8/scale}/>
   {direct?<circle className={'connector-line-point'+(handle.kind==='insert'?' insert-point':'')} cx={handle.x} cy={handle.y} r={(handle.kind==='insert'?4:5.5)/scale} strokeWidth={1.2/scale}/>:<rect className="connector-handle-pill" x={handle.x-width/2} y={handle.y-height/2} width={width} height={height} rx={3/scale} strokeWidth={1/scale}/>}
  </g>
 })
}
