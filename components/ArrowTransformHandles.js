'use client'
import { arrowDimensions } from '../lib/arrow-transform'
export default function ArrowTransformHandles({geometry,scale,onStart}) {
 const b=arrowDimensions(geometry),pad=12/scale,x=b.x-pad,y=b.y-pad,w=b.width+pad*2,h=b.height+pad*2,size=8/scale,cx=x+w/2,rotationY=y-26/scale
 return <g className="arrow-transform-handles">
  <rect className="arrow-selection-box" x={x} y={y} width={w} height={h} strokeWidth={1/scale}/>
  <line className="arrow-rotation-stem" x1={cx} x2={cx} y1={y} y2={rotationY} strokeWidth={1/scale}/>
  {['nw','n','ne','e','se','s','sw','w'].map(handle=>{const px=handle.includes('w')?x:handle.includes('e')?x+w:cx,py=handle.includes('n')?y:handle.includes('s')?y+h:y+h/2;return <rect key={handle} className={'arrow-box-handle '+handle} x={px-size/2} y={py-size/2} width={size} height={size} rx={1/scale} strokeWidth={1.5/scale} role="button" aria-label={'Redimensionner la flèche '+handle} onPointerDown={event=>onStart(event,'arrow-resize',handle)}/>})}
  <circle className="arrow-rotate-handle" cx={cx} cy={rotationY} r={6/scale} strokeWidth={1.5/scale} role="button" aria-label="Tourner la flèche" onPointerDown={event=>onStart(event,'arrow-rotate')}/>
 </g>
}
