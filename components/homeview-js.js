'use client'
import './home.css'
import {useMemo,useState,useEffect,useRef,useCallback} from 'react'
import {FxSearch} from './Fx'

/* ═══ Accueil « Calm » — React + CSS pur, effets inspirés React Bits / Aceternity :
   fond aurora animé très lent, gradient text avec reflet, cartes tilt 3D + spotlight
   + border beam au survol, boutons à balayage lumineux (shine), dock magnétique,
   entrées en cascade. Section principale : TOUS les fichiers créés. ═══ */

const rtf=typeof Intl!=='undefined'?new Intl.RelativeTimeFormat('fr',{numeric:'auto'}):null
const ago=d=>{if(!d||!rtf)return '';const s=(new Date(d).getTime()-Date.now())/1000,a=Math.abs(s)
 if(a<60)return 'à l’instant'
 if(a<3600)return rtf.format(Math.round(s/60),'minute')
 if(a<86400)return rtf.format(Math.round(s/3600),'hour')
 if(a<86400*30)return rtf.format(Math.round(s/86400),'day')
 if(a<86400*365)return rtf.format(Math.round(s/(86400*30)),'month')
 return rtf.format(Math.round(s/(86400*365)),'year')}
const TYPE={page:{l:'Page',c:'#5b8cff'},pdf:{l:'PDF',c:'#ff6b81'},folder:{l:'Dossier',c:'#ffb020'}}
const colorOf=i=>i.color||TYPE[i.type]?.c||'#5b8cff'
const plural=(n,w)=>n+' '+w+(n>1?'s':'')

const Svg=({d,s=16})=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{d}</svg>
const I={
 page:<Svg d={<><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></>}/>,
 folder:<Svg d={<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>}/>,
 pdf:<Svg d={<><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M12 11v6M9 14l3 3 3-3"/></>}/>,
 grid:<Svg d={<><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>}/>,
 list:<Svg d={<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>}/>,
 more:<Svg s={16} d={<><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>}/>,
 plus:<Svg s={14} d={<path d="M12 5v14M5 12h14"/>}/>,
 arrow:<Svg s={15} d={<path d="M7 17 17 7M8 7h9v9"/>}/>,
}
const Glyph=({i,size='md'})=><span className={'hm-glyph '+size} style={{'--c':colorOf(i)}}>{i.icon?<span className="hm-emoji">{i.icon}</span>:I[i.type]||I.page}</span>

/* Tilt 3D très léger + coordonnées du curseur (spotlight), délégué sur la grille */
function useTilt(){
 const reduce=useRef(false)
 useEffect(()=>{reduce.current=matchMedia('(prefers-reduced-motion: reduce)').matches},[])
 const onMove=useCallback(e=>{const el=e.target.closest?.('[data-tilt]');if(!el)return
  const r=el.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height
  el.style.setProperty('--gx',x*100+'%');el.style.setProperty('--gy',y*100+'%')
  if(!reduce.current){el.style.setProperty('--tx',((.5-y)*5).toFixed(2)+'deg');el.style.setProperty('--ty',((x-.5)*7).toFixed(2)+'deg')}},[])
 const onLeave=useCallback(e=>{const el=e.target.closest?.('[data-tilt]');if(el){el.style.removeProperty('--tx');el.style.removeProperty('--ty')}},[])
 return {onPointerMove:onMove,onPointerOut:onLeave}
}

export default function HomeView({items,sibs,openItem,show,projName,name,add,pick}){
 const [q,setQ]=useState('')
 const [filter,setFilter]=useState('all')
 const [sort,setSort]=useState('recent')
 const [view,setView]=useState(()=>{try{return localStorage.getItem('hv-view')||'grid'}catch{return 'grid'}})
 useEffect(()=>{try{localStorage.setItem('hv-view',view)}catch{}},[view])
 const tilt=useTilt()

 const byId=useMemo(()=>Object.fromEntries(items.map(i=>[i.id,i])),[items])
 const pathOf=i=>{const a=[];let c=byId[i.parent_id];while(c){a.unshift(c.title);c=byId[c.parent_id]}return a}
 const countIn=id=>sibs(id).reduce((n,c)=>n+(c.type==='folder'?countIn(c.id):1),0)
 const t=i=>new Date(i.created_at||0).getTime()
 const n={folder:0,page:0,pdf:0};items.forEach(i=>{if(n[i.type]!=null)n[i.type]++})
 const recent=items.filter(i=>i.type!=='folder').sort((a,b)=>t(b)-t(a)).slice(0,8)
 const folders=sibs(null).filter(i=>i.type==='folder')

 const needle=q.trim().toLowerCase()
 const all=useMemo(()=>{
  let l=items.filter(i=>filter==='all'||i.type===filter)
  if(needle)l=l.filter(i=>(i.title||'').toLowerCase().includes(needle)||pathOf(i).join(' ').toLowerCase().includes(needle))
  const s=[...l]
  if(sort==='recent')s.sort((a,b)=>t(b)-t(a))
  else if(sort==='az')s.sort((a,b)=>(a.title||'').localeCompare(b.title||'','fr',{sensitivity:'base'}))
  else s.sort((a,b)=>(a.type||'').localeCompare(b.type||'')||(a.title||'').localeCompare(b.title||'','fr'))
  return s
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[items,filter,sort,needle])

 const open=i=>openItem(i.id)
 const Hl=({s})=>{if(!needle)return s;const k=(s||'').toLowerCase().indexOf(needle);if(k<0)return s
  return <>{s.slice(0,k)}<mark>{s.slice(k,k+needle.length)}</mark>{s.slice(k+needle.length)}</>}
 const FILTERS=[['all','Tout',items.length],['page','Pages',n.page],['pdf','PDF',n.pdf],['folder','Dossiers',n.folder]]

 return <div className="home hm">
  {/* ── Fond animé calme : blobs aurora lents + grain + halo bas ── */}
  <div className="hm-bg" aria-hidden>
   <b className="hm-blob b1"/><b className="hm-blob b2"/><b className="hm-blob b3"/><b className="hm-blob b4"/>
   <span className="hm-grain"/><span className="hm-halo"/>
  </div>

  <div className="hm-inner">
   {/* ── En-tête ── */}
   <header className="hm-head">
    <span className="hm-eyebrow">{projName||'Espace'} · {plural(items.filter(i=>i.type!=='folder').length,'fichier')}</span>
    <h1 className="hm-title"><span className="hm-grad">Tous vos fichiers</span><span className="hm-shine" aria-hidden/></h1>
    <div className="hm-search"><FxSearch value={q} onChange={e=>setQ(e.target.value)} placeholders={['Rechercher un fichier…','Un cours, une réunion, un PDF…','Parcourir vos pages et dossiers…']}/></div>
   </header>

   {/* ── Récents ── */}
   {!needle&&recent.length>=3&&<section className="hm-sec">
    <div className="hm-label"><i className="hm-dot"/>Récents</div>
    <div className="hm-rail">{recent.map(i=>
     <button type="button" key={i.id} className="hm-chip" style={{'--c':colorOf(i)}} onClick={()=>open(i)} onContextMenu={e=>show(e,i)}>
      <Glyph i={i} size="sm"/><span className="hm-chip-t"><b>{i.title}</b><small>{ago(i.created_at)}</small></span>
     </button>)}
    </div>
   </section>}

   {/* ── Dossiers ── */}
   {!needle&&folders.length>0&&<section className="hm-sec">
    <div className="hm-label"><i className="hm-dot"/>Dossiers<small>{folders.length}</small></div>
    <div className="hm-folders" {...tilt}>
     {folders.map((f,k)=>{const kids=sibs(f.id),c=countIn(f.id)
      return <button type="button" data-tilt key={f.id} className="hm-folder" style={{'--c':colorOf(f),'--k':Math.min(k,10)}} onClick={()=>open(f)} onContextMenu={e=>show(e,f)}>
       <span className="hm-beam" aria-hidden/><span className="hm-glare" aria-hidden/>
       <span className="hm-folder-hd"><Glyph i={f} size="lg"/><span className="hm-go">{I.arrow}</span></span>
       <b className="hm-folder-t">{f.title}</b>
       <small className="hm-sub">{plural(c,'élément')}</small>
       <span className="hm-stack">{kids.slice(0,3).map((j,x)=><span key={j.id} style={{'--j':x}}><Glyph i={j} size="xs"/>{j.title}</span>)}{!kids.length&&<em>Dossier vide</em>}</span>
      </button>})}
    </div>
   </section>}

   {/* ── Tous les fichiers ── */}
   <section className="hm-sec">
    <div className="hm-all-hd">
     <div className="hm-label"><i className="hm-dot"/>{needle?'Résultats':'Tous les fichiers'}<small>{all.length}</small></div>
     <div className="hm-ctrl">
      <div className="hm-seg">{FILTERS.map(([k,l,c])=><button type="button" key={k} className={filter===k?'on':''} onClick={()=>setFilter(k)}>{l}<small>{c}</small></button>)}</div>
      <select className="hm-sort" value={sort} onChange={e=>setSort(e.target.value)} aria-label="Trier">
       <option value="recent">Plus récents</option><option value="az">Nom A → Z</option><option value="type">Par type</option>
      </select>
      <div className="hm-seg">{[['grid','Grille'],['list','Liste']].map(([k,l])=><button type="button" key={k} title={l} aria-label={l} className={view===k?'on':''} onClick={()=>setView(k)}>{I[k]}</button>)}</div>
     </div>
    </div>

    {!items.length?<div className="hm-empty">
     <div className="hm-orb"/><h3>Tout commence ici</h3>
     <p>Crée votre première page avec le dock en bas de l’écran.</p>
    </div>
    :!all.length?<p className="hm-none">Aucun fichier{needle?` pour « ${q.trim()} »`:''}.</p>
    :view==='list'?<div className="hm-list">
     {all.map((i,k)=><div key={i.id} className="hm-row" style={{'--c':colorOf(i),'--k':Math.min(k,18)}} onClick={()=>open(i)} onContextMenu={e=>show(e,i)}>
      <span className="hm-name"><Glyph i={i} size="sm"/><b><Hl s={i.title}/></b></span>
      <span className="hm-path">{pathOf(i).join(' › ')||'Racine'}</span>
      <em className="hm-badge" style={{'--c':TYPE[i.type]?.c}}>{TYPE[i.type]?.l||i.type}</em>
      <span className="hm-path">{ago(i.created_at)}</span>
      <button type="button" className="hm-icon-btn" title="Options" onClick={e=>{e.stopPropagation();show(e,i)}}>{I.more}</button>
     </div>)}
    </div>
    :<div className="hm-grid" {...tilt}>
     {all.map((i,k)=><button type="button" data-tilt key={i.id} className="hm-card" style={{'--c':colorOf(i),'--k':Math.min(k,18)}} onClick={()=>open(i)} onContextMenu={e=>show(e,i)}>
      <span className="hm-beam" aria-hidden/><span className="hm-glare" aria-hidden/>
      <span className="hm-card-art" aria-hidden><Glyph i={i} size="xl"/></span>
      <span className="hm-card-body">
       <em className="hm-badge" style={{'--c':TYPE[i.type]?.c}}>{TYPE[i.type]?.l||i.type}</em>
       <b className="hm-card-t"><Hl s={i.title}/></b>
       <small className="hm-path">{pathOf(i).join(' › ')||'Racine'} · {i.type==='folder'?plural(countIn(i.id),'élément'):ago(i.created_at)}</small>
      </span>
     </button>)}
    </div>}
   </section>
  </div>

  {/* ── Dock flottant ── */}
  <Dock add={add} pick={pick} newMenu={e=>show(e,null,'new')}/>
 </div>
}

function Dock({add,pick,newMenu}){
 const ref=useRef(null)
 const move=e=>{const el=ref.current;if(!el)return
  for(const b of el.querySelectorAll('.hm-dock-it')){const r=b.getBoundingClientRect(),d=Math.abs(e.clientX-(r.left+r.width/2))
   b.style.setProperty('--m',Math.max(1,1.35-d/150).toFixed(3))}}
 const leave=()=>ref.current?.querySelectorAll('.hm-dock-it').forEach(b=>b.style.setProperty('--m',1))
 const ITEMS=[['Nouvelle page',I.page,'#5b8cff',()=>add('page',null)],['Nouveau dossier',I.folder,'#ffb020',()=>add('folder',null)],['Importer un PDF',I.pdf,'#ff6b81',()=>pick(null)]]
 return <nav className="hm-dock" ref={ref} onMouseMove={move} onMouseLeave={leave} aria-label="Créer">
  {ITEMS.map(([l,ic,c,fn])=><button type="button" key={l} className="hm-dock-it" style={{'--c':c}} onClick={fn} aria-label={l}><span className="hm-dock-ic">{ic}</span><span className="hm-dock-tip">{l}</span></button>)}
  <span className="hm-dock-sep"/>
  <button type="button" className="hm-dock-it plus" onClick={newMenu} aria-label="Plus d’options"><span className="hm-dock-ic">{I.plus}</span><span className="hm-dock-tip">Plus…</span></button>
 </nav>
}