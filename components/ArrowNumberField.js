'use client'
import { useEffect, useRef, useState } from 'react'
const format=value=>String(Math.round(value*10)/10)
export default function ArrowNumberField({label,value,min=0,max=5000,onCommit,unit='px'}) {
 const [draft,setDraft]=useState(()=>format(value)),cancel=useRef(false)
 useEffect(()=>setDraft(format(value)),[value])
 const commit=()=>{if(cancel.current){cancel.current=false;return}const n=Number(draft);if(draft.trim()&&Number.isFinite(n)){const next=Math.round(Math.max(min,Math.min(max,n))*10)/10,result=onCommit(next);setDraft(format(Number.isFinite(result)?result:next))}else setDraft(format(value))}
 return <label><span>{label}<small>{unit}</small></span><input type="number" aria-label={label+' de la flèche'} min={min} max={max} step="0.1" value={draft} onChange={event=>setDraft(event.target.value)} onBlur={commit} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();event.currentTarget.blur()}if(event.key==='Escape'){event.preventDefault();cancel.current=true;setDraft(format(value));event.currentTarget.blur()}}}/></label>
}
