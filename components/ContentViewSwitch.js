'use client'
import { useEffect, useState } from 'react'
import './content-view.css'
export function useContentView() {
  const [view,setView]=useState('grid')
  useEffect(()=>{const read=()=>{try{setView(localStorage.getItem('content-view')==='list'?'list':'grid')}catch{}};read();window.addEventListener('content-view-change',read);window.addEventListener('storage',read);return()=>{window.removeEventListener('content-view-change',read);window.removeEventListener('storage',read)}},[])
  const change=value=>{setView(value);try{localStorage.setItem('content-view',value)}catch{};window.dispatchEvent(new Event('content-view-change'))}
  return [view,change]
}
export default function ContentViewSwitch({value,onChange}) {
  return <div className="content-view-switch" role="group" aria-label="Affichage des contenus">{[['grid','Grille'],['list','Liste']].map(([key,label])=><button type="button" key={key} aria-label={'Vue en '+label.toLowerCase()} aria-pressed={value===key} onClick={()=>onChange(key)}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">{key==='grid'?<><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>:<path d="M8 6h13M8 12h13M8 18h13M3 6h1M3 12h1M3 18h1"/>}</svg><span>{label}</span></button>)}</div>
}
