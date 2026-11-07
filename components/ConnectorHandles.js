'use client'
const labels={'from-leg':'Déplacer le segment de départ','first-bend':'Déplacer le premier coude',middle:'Déplacer le segment central','last-bend':'Déplacer le dernier coude','to-leg':'Déplacer le segment d’arrivée'}
export default function ConnectorHandles({geometry,scale,onStart,onNudge}) {
 return geometry.segmentHandles.map(handle=>{
  const horizontal=handle.axis==='y',width=(horizontal?18:7)/scale,height=(horizontal?7:18)/scale,label=labels[handle.id]
  return <g key={handle.id} className={'connector-segment '+(horizontal?'horizontal':'vertical')} role="slider" tabIndex={0} aria-label={label} aria-valuemin={-2000} aria-valuemax={2000} aria-valuenow={Math.round(handle.value??0)} onPointerDown={event=>onStart(event,handle)} onKeyDown={event=>{const key=handle.axis==='x'?['ArrowLeft','ArrowRight']:['ArrowUp','ArrowDown'];if(key.includes(event.key)){event.preventDefault();event.stopPropagation();onNudge(handle,(event.key===key[0]?-1:1)*(event.shiftKey?20:5))}}}>
   <rect className="connector-handle-hit" x={handle.x-15/scale} y={handle.y-15/scale} width={30/scale} height={30/scale} rx={8/scale}/>
   <rect className="connector-handle-pill" x={handle.x-width/2} y={handle.y-height/2} width={width} height={height} rx={3.5/scale} strokeWidth={1/scale}/>
  </g>
 })
}
