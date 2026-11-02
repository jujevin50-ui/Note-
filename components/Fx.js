'use client'
/* Effets inspirés d'Aceternity UI (https://ui.aceternity.com) — React + CSS, sans dépendance.
   - Card Spotlight / Glowing Effect : halo et bordure lumineuse qui suivent la souris
   - 3D Card : légère inclinaison des tuiles
   - Text Generate Effect : titres qui apparaissent mot par mot
   - Number Ticker : compteurs animés
   - Placeholders & Vanish Input : placeholder animé dans la recherche
   - Stagger : apparition en cascade des listes */
import {useEffect,useRef,useState} from 'react'

const SPOT='.hv-card,.hv-rcard,.hcard,.tile,.inv-sec,.watch-card,.result-row,.dash-empty,.dlg,.login-card,.row,.stat-pill'
const TILT='.tile,.watch-card'
const STAGGER='.hv-grid,.hv-recent,.hv-folders,.hgrid,.tile-grid,.inv-grid,.watchlist-grid,.col-body,.hbody,.search-results,.member-list,.inv-body,.dash-stats'

export function FxRoot(){
 useEffect(()=>{
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches
  let raf=0,ev=null,last=null
  const run=()=>{raf=0;const e=ev;if(!e)return
   const el=e.target&&e.target.closest?e.target.closest(SPOT):null
   if(last&&last!==el){last.style.removeProperty('--rx');last.style.removeProperty('--ry')}
   if(el){const r=el.getBoundingClientRect()
    el.style.setProperty('--mx',(e.clientX-r.left)+'px');el.style.setProperty('--my',(e.clientY-r.top)+'px')
    if(!reduce&&el.matches(TILT)){const x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5
     el.style.setProperty('--rx',(-y*7).toFixed(2)+'deg');el.style.setProperty('--ry',(x*9).toFixed(2)+'deg')}}
   last=el}
  const mv=e=>{ev=e;if(!raf)raf=requestAnimationFrame(run)}
  document.addEventListener('pointermove',mv,{passive:true})
  let t=0
  const tag=()=>{t=0;document.querySelectorAll(STAGGER).forEach(g=>{let i=0;for(const c of g.children){if(!c.style.getPropertyValue('--i'))c.style.setProperty('--i',Math.min(i,16));i++}})}
  tag()
  const mo=new MutationObserver(()=>{if(!t)t=requestAnimationFrame(tag)})
  mo.observe(document.body,{childList:true,subtree:true})
  return()=>{document.removeEventListener('pointermove',mv);mo.disconnect();cancelAnimationFrame(raf);cancelAnimationFrame(t)}
 },[])
 return null
}

/** Text Generate Effect — chaque mot passe du flou au net */
export function TextGenerate({text,step=80}){
 const words=String(text||'').split(/\s+/).filter(Boolean)
 return <span className="tg" key={text} aria-label={text}>{words.map((w,i)=><span aria-hidden key={i} style={{'--d':i*step+'ms'}}>{w}{i<words.length-1?'\u00a0':''}</span>)}</span>
}

/** Number Ticker */
export function Ticker({value}){
 const [v,setV]=useState(value),from=useRef(0)
 useEffect(()=>{
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){setV(value);return}
  const a=from.current,b=value,t0=performance.now(),d=700;let r
  const f=t=>{const k=Math.min(1,(t-t0)/d),e=1-Math.pow(1-k,3);setV(Math.round(a+(b-a)*e));if(k<1)r=requestAnimationFrame(f);else from.current=b}
  r=requestAnimationFrame(f);return()=>cancelAnimationFrame(r)
 },[value])
 return <b className="ticker">{v}</b>
}

/** Placeholders & Vanish Input — placeholder qui défile */
export function FxSearch({value,onChange,placeholders}){
 const [k,setK]=useState(0),ref=useRef(null)
 useEffect(()=>{const f=e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();ref.current?.focus()}};addEventListener('keydown',f);return()=>removeEventListener('keydown',f)},[])
 useEffect(()=>{if(value)return;const id=setInterval(()=>setK(x=>(x+1)%placeholders.length),2800);return()=>clearInterval(id)},[value,placeholders.length])
 return <div className="search-wrap fx-search">
  <span className="search-ico" aria-hidden>
   <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
  </span>
  <input ref={ref} aria-label="Rechercher" value={value} onChange={onChange}/>
  {!value&&<span className="fx-ph" key={k} aria-hidden>{placeholders[k]}</span>}
  <kbd className="fx-kbd" aria-hidden>⌘K</kbd>
 </div>
}
