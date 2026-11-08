'use client'
import { lineEditHandles } from '../lib/line-editing'
const labels={'from-leg':'Déplacer le segment de départ','first-bend':'Déplacer le premier coude',middle:'Déplacer le segment central','last-bend':'Déplacer le dernier coude','to-leg':'Déplacer le segment d’arrivée'}
export default function ConnectorHandles({geometry,scale,onStart,onNudge}) {
 return lineEditHandles(geometry,scale).map(handle=>{
  const angle=handle.angle??(handle.axis==='x'?90:0),label=labels[handle.id]||(handle.kind==='bow'?'Glisser pour courber le trait':'Glisser le segment '+(handle.index+1))
  return <g key={handle.id} className="connector-segment connector-slider" transform={`translate(${handle.x} ${handle.y}) rotate(${angle})`} role="slider" tabIndex={0} aria-label={label} aria-orientation={handle.axis==='x'||handle.normal&&Math.abs(handle.normal.x)>Math.abs(handle.normal.y)?'horizontal':'vertical'} aria-valuemin={-5000} aria-valuemax={5000} aria-valuenow={Math.round(handle.value??0)} onPointerDown={event=>onStart(event,handle)} onDoubleClick={event=>event.stopPropagation()} onKeyDown={event=>{
   const keys=handle.axis==='normal'?['ArrowLeft','ArrowRight','ArrowUp','ArrowDown']:handle.axis==='x'?['ArrowLeft','ArrowRight']:['ArrowUp','ArrowDown']
   if(keys.includes(event.key)){event.preventDefault();event.stopPropagation();onNudge(handle,(event.key==='ArrowLeft'||event.key==='ArrowUp'?-1:1)*(event.shiftKey?20:5),['ArrowLeft','ArrowRight'].includes(event.key)?'x':'y')}
  }}>
   <rect className="connector-handle-hit" x={-16/scale} y={-13/scale} width={32/scale} height={26/scale} rx={8/scale}/>
   <rect className="connector-handle-pill" x={-9/scale} y={-3.5/scale} width={18/scale} height={7/scale} rx={3.5/scale} strokeWidth={1/scale}/>
   <path className="connector-slider-grip" d={`M ${-2/scale} ${-1.5/scale} V ${1.5/scale} M ${2/scale} ${-1.5/scale} V ${1.5/scale}`} strokeWidth={.7/scale}/>
  </g>
 })
}
