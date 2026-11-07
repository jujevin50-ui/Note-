'use client'
import { useEffect, useState } from 'react'
export default function MindmapDimension({label,value,min,onCommit,disabled}) {
 const [draft,setDraft]=useState(String(Math.round(value)))
 useEffect(()=>setDraft(String(Math.round(value))),[value])
 const commit=()=>{const number=Number(draft);if(draft.trim()&&Number.isFinite(number)){const next=Math.round(Math.max(min,Math.min(2000,number)));onCommit(next);setDraft(String(next))}else setDraft(String(Math.round(value)))}
 return <label>{label}<input type="number" aria-label={label+' du bloc'} min={min} max="2000" disabled={disabled} value={draft} onChange={e=>setDraft(e.target.value)} onBlur={commit} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();e.currentTarget.blur()}else if(e.key==='Escape')setDraft(String(Math.round(value)))}}/></label>
}
