'use client'
import './home.css'
import {useMemo,useState,useEffect,useRef,useCallback} from 'react'
import {FxSearch} from './Fx'

/* Accueil « spectaculaire » — effets inspirés d'Aceternity UI & React Bits, en React + CSS pur :
   Aurora + spotlight, Gradient Text, Bento Grid, Tilted Card + glare, Border Beam,
   Focus Cards, Infinite Moving Cards, Floating Dock. */

const rtf=typeof Intl!=='undefined'?new Intl.RelativeTimeFormat('fr',{numeric:'auto'}):null
const ago=d=>{if(!d||!rtf)return '';const s=(new Date(d).getTime()-Date.now())/1000,a=Math.abs(s)
 if(a<60)return 'à l’instant'
 if(a<3600)return rtf.format(Math.round(s/60),'minute')
 if(a<86400)return rtf.format(Math.round(s/3600),'hour')
 if(a<86400*30)return rtf.format(Math.round(s/86400),'day')
 if(a<86400*365)return rtf.format(Math.round(s/(86400*30)),'month')
 return rtf.format(Math.round(s/(86400*365)),'year')}
const TYPE={page:{l:'Page',c:'#4f8cff'},pdf:{l:'PDF',c:'#ff4d6d'},folder:{l:'Dossier',c:'#ffb020'}}
const colorOf=i=>i.color||TYPE[i.type]?.c||'#4f8cff'
const plural=(n,w)=>n+' '+w+(n>1?'s':'')

const Svg=({d,s=16})=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{d}</svg>
const I={
 page:<Svg d={<><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></>}/>,
 folder:<Svg d={<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>}/>,
 pdf:<Svg d={<><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M12 11v6M9 14l3 3 3-3"/></>}/>,
 grid:<Svg d={<><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>}/>,
 list:<Svg d={<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>}/>,
 tree:<Svg d={<><path d="M4 4v13a3 3 0 0 0 3 3h3M4 9h6"/><rect x="12" y="6" width="8" height="6" rx="1.5"/><rect x="12" y="15" width="8" height="6" rx="1.5"/></>}/>,
 chev:<Svg s={14} d={<path d="m9 6 6 6-6 6"/>}/>,
 more:<Svg s={16} d={<><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>}/>,
 plus:<Svg s={14} d={<path d="M12 5v14M5 12h14"/>}/>,
 arrow:<Svg s={15} d={<path d="M7 17 17 7M8 7h9v9"/>}/>,
}
const Glyph=({i,size='md'})=><span className={'sx-glyph '+size} style={{'--c':colorOf(i)}}>{i.icon?<span className="sx-emoji">{i.icon}</span>:I[i.type]||I.page}</span>

/* Tilt 3D + glare, délégué sur un conteneur */
function useTilt(){
 const reduce=useRef(false)
 useEffect(()=>{reduce.current=matchMedia('(prefers-reduced-motion: reduce)').matches},[])
 const onMove=useCallback(e=>{const el=e.target.closest?.('[data-tilt]');if(!el)return
  const r=el.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height
  el.style.setProperty('--gx',x*100+'%');el.style.setProperty('--gy',y*100+'%')
  if(!reduce.current){el.style.setProperty('--tx',((.5-y)*10).toFixed(2)+'deg');el.style.setProperty('--ty',((x-.5)*12).toFixed(2)+'deg')}},[])
 const onLeave=useCallback(e=>{const el=e.target.closest?.('[data-tilt]');if(el){el.style.removeProperty('--tx');el.style.removeProperty('--ty')}},[])
 return {onPointerMove:onMove,onPointerOut:onLeave}
}

export default function HomeView({items,sibs,openItem,show,projName,name,add,pick}){
 const [q,setQ]=useState('')
 const [filter,setFilter]=useState('all')
 const [sort,setSort]=useState('recent')
 const [view,setView]=useState(()=>{try{return localStorage.getItem('hv-view')||'grid'}catch{return 'grid'}})
 const [closed,setClosed]=useState({})
 const [focus,setFocus]=useState(null)
 const stage=useRef(null)
 useEffect(()=>{try{localStorage.setItem('hv-view',view)}catch{}},[view])
 const tilt=useTilt()

 /* spotlight global qui suit la souris */
 const spot=e=>{const el=stage.current;if(!el)return;const r=el.getBoundingClientRect()
  el.style.setProperty('--sx',e.clientX-r.left+'px');el.style.setProperty('--sy',e.clientY-r.top+'px')}

 const byId=useMemo(()=>Object.fromEntries(items.map(i=>[i.id,i])),[items])
 const pathOf=i=>{const a=[];let c=byId[i.parent_id];while(c){a.unshift(c.title);c=byId[c.parent_id]}return a}
 const countIn=id=>sibs(id).reduce((n,c)=>n+(c.type==='folder'?countIn(c.id):1),0)
 const t=i=>new Date(i.created_at||0).getTime()
 const n={folder:0,page:0,pdf:0};items.forEach(i=>{if(n[i.type]!=null)n[i.type]++})
 const recent=items.filter(i=>i.type!=='folder').sort((a,b)=>t(b)-t(a)).slice(0,10)
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

 const Tree=({p,d=0})=>sibs(p).filter(i=>filter==='all'||i.type==='folder'||i.type===filter).map(i=>{
  const f=i.type==='folder',isClosed=closed[i.id]
  return <div key={i.id} className="sx-tnode" style={{'--d':d}}>
   <div className={'sx-trow'+(f?' is-folder':'')} style={{'--c':colorOf(i)}} onClick={()=>f?setClosed(c=>({...c,[i.id]:!c[i.id]})):open(i)} onContextMenu={e=>show(e,i)}>
    <span className={'sx-tchev'+(f?'':' none')+(isClosed?'':' open')}>{I.chev}</span>
    <Glyph i={i} size="sm"/>
    <span className="sx-tname">{i.title}</span>
    {f&&<small className="sx-count">{countIn(i.id)}</small>}
    <span className="sx-tact">
     {f&&<button type="button" title="Ajouter" onClick={e=>{e.stopPropagation();show(e,i,'new')}}>{I.plus}</button>}
     {f&&<button type="button" title="Ouvrir le dossier" onClick={e=>{e.stopPropagation();open(i)}}>{I.arrow}</button>}
     <button type="button" title="Options" onClick={e=>{e.stopPropagation();show(e,i)}}>{I.more}</button>
    </span>
   </div>
   {f&&!isClosed&&<div className="sx-tkids"><Tree p={i.id} d={d+1}/></div>}
  </div>})

 const FILTERS=[['all','Tout',items.length],['page','Pages',n.page],['pdf','PDF',n.pdf],['folder','Dossiers',n.folder]]
 /* bento : le dossier le plus rempli prend 2 colonnes */
 const bigId=folders.length>2?[...folders].sort((a,b)=>countIn(b.id)-countIn(a.id))[0].id:null

 return <div className="home sx" ref={stage} onPointerMove={spot}>
  <div className="sx-bg" aria-hidden><div className="sx-aurora"/><div className="sx-gridbg"/><div className="sx-spot"/></div>

  {/* Barre supérieure compacte */}
  <header className="sx-top">
   <div className="sx-brand">
    <h1 className="sx-title"><span className="sx-shine">Notes</span></h1>
    <span className="sx-meta">{projName||'Espace'} · {plural(items.filter(i=>i.type!=='folder').length,'fichier')}</span>
   </div>
   <div className="sx-search"><FxSearch value={q} onChange={e=>setQ(e.target.value)} placeholders={['Rechercher dans tous les fichiers…','Un cours, une réunion…','Un PDF, un dossier…']}/></div>
  </header>

  {/* Récents — défilement infini */}
  {!needle&&recent.length>=3&&<section className="sx-sec">
   <div className="sx-label"><span className="sx-dot"/>Récents</div>
   <div className="sx-marquee" style={{'--n':recent.length}}>
    <div className="sx-track">
     {[...recent,...recent].map((i,k)=><button type="button" key={i.id+'-'+k} aria-hidden={k>=recent.length} tabIndex={k>=recent.length?-1:0} className="sx-chip" style={{'--c':colorOf(i)}} onClick={()=>open(i)} onContextMenu={e=>show(e,i)}>
      <Glyph i={i} size="sm"/><span className="sx-chip-t"><b>{i.title}</b><small>{ago(i.created_at)}</small></span>
     </button>)}
    </div>
   </div>
  </section>}

  {/* Dossiers — bento */}
  {!needle&&folders.length>0&&<section className="sx-sec">
   <div className="sx-label"><span className="sx-dot"/>Dossiers<small>{folders.length}</small></div>
   <div className="sx-bento" {...tilt}>
    {folders.map(f=>{const kids=sibs(f.id),c=countIn(f.id)
     return <button type="button" data-tilt key={f.id} className={'sx-folder'+(f.id===bigId?' big':'')} style={{'--c':colorOf(f)}} onClick={()=>open(f)} onContextMenu={e=>show(e,f)}>
      <span className="sx-beam" aria-hidden/><span className="sx-glare" aria-hidden/>
      <span className="sx-folder-hd"><Glyph i={f} size="lg"/><span className="sx-go">{I.arrow}</span></span>
      <span className="sx-folder-t"><b>{f.title}</b><small>{plural(c,'élément')}</small></span>
      <span className="sx-stack">{kids.slice(0,f.id===bigId?5:3).map((k,j)=><span key={k.id} style={{'--j':j}}><Glyph i={k} size="xs"/>{k.title}</span>)}
       {!kids.length&&<em>Dossier vide</em>}</span>
     </button>})}
   </div>
  </section>}

  {/* Tous les fichiers */}
  <section className="sx-sec">
   <div className="sx-all-hd">
    <div className="sx-label"><span className="sx-dot"/>{needle?'Résultats':'Tous les fichiers'}<small>{view==='tree'&&!needle?items.length:all.length}</small></div>
    <div className="sx-ctrl">
     <div className="sx-seg">{FILTERS.map(([k,l,c])=><button type="button" key={k} className={filter===k?'on':''} onClick={()=>setFilter(k)}>{l}<small>{c}</small></button>)}</div>
     <select className="sx-sort" value={sort} onChange={e=>setSort(e.target.value)} aria-label="Trier">
      <option value="recent">Plus récents</option><option value="az">Nom A → Z</option><option value="type">Par type</option>
     </select>
     <div className="sx-seg">{[['grid','Grille'],['list','Liste'],['tree','Arborescence']].map(([k,l])=><button type="button" key={k} title={l} aria-label={l} className={view===k?'on':''} onClick={()=>setView(k)}>{I[k]}</button>)}</div>
    </div>
   </div>

   {!items.length?<div className="sx-empty">
    <div className="sx-empty-orb"/><h3>Tout commence ici</h3>
    <p>Crée ta première page avec le dock en bas de l’écran.</p>
   </div>
   :view==='tree'&&!needle?<div className="sx-panel sx-tree"><Tree p={null}/></div>
   :!all.length?<p className="sx-none">Aucun fichier{needle?` pour « ${q.trim()} »`:''}.</p>
   :view==='list'?<div className="sx-panel sx-table">
    {all.map(i=><div key={i.id} className="sx-tr" style={{'--c':colorOf(i)}} onClick={()=>open(i)} onContextMenu={e=>show(e,i)}>
     <span className="sx-name"><Glyph i={i} size="sm"/><b><Hl s={i.title}/></b></span>
     <span className="sx-path">{pathOf(i).join(' › ')||'Racine'}</span>
     <em className="sx-badge" style={{'--c':TYPE[i.type]?.c}}>{TYPE[i.type]?.l||i.type}</em>
     <span className="sx-path">{ago(i.created_at)}</span>
     <button type="button" className="sx-icon-btn" title="Options" onClick={e=>{e.stopPropagation();show(e,i)}}>{I.more}</button>
    </div>)}
   </div>
   :<div className={'sx-grid'+(focus?' has-focus':'')} {...tilt} onMouseLeave={()=>setFocus(null)}>
    {all.map((i,k)=><button type="button" data-tilt key={i.id} className={'sx-card'+(focus===i.id?' is-focus':'')} style={{'--c':colorOf(i),'--k':Math.min(k,18)}}
     onMouseEnter={()=>setFocus(i.id)} onClick={()=>open(i)} onContextMenu={e=>show(e,i)}>
     <span className="sx-beam" aria-hidden/><span className="sx-glare" aria-hidden/>
     <span className="sx-card-art" aria-hidden><Glyph i={i} size="xl"/></span>
     <span className="sx-card-body">
      <em className="sx-badge" style={{'--c':TYPE[i.type]?.c}}>{TYPE[i.type]?.l||i.type}</em>
      <b className="sx-card-t"><Hl s={i.title}/></b>
      <small className="sx-path">{pathOf(i).join(' › ')||'Racine'} · {i.type==='folder'?plural(countIn(i.id),'élément'):ago(i.created_at)}</small>
     </span>
    </button>)}
   </div>}
  </section>

  {/* Dock flottant */}
  <Dock add={add} pick={pick} newMenu={e=>show(e,null,'new')}/>
 </div>
}

function Dock({add,pick,newMenu}){
 const ref=useRef(null)
 const move=e=>{const el=ref.current;if(!el)return
  for(const b of el.querySelectorAll('.sx-dock-it')){const r=b.getBoundingClientRect(),d=Math.abs(e.clientX-(r.left+r.width/2))
   b.style.setProperty('--m',Math.max(1,1.55-d/140).toFixed(3))}}
 const leave=()=>ref.current?.querySelectorAll('.sx-dock-it').forEach(b=>b.style.setProperty('--m',1))
 const ITEMS=[['Nouvelle page',I.page,'#4f8cff',()=>add('page',null)],['Nouveau dossier',I.folder,'#ffb020',()=>add('folder',null)],['Importer un PDF',I.pdf,'#ff4d6d',()=>pick(null)]]
 return <nav className="sx-dock" ref={ref} onMouseMove={move} onMouseLeave={leave} aria-label="Créer">
  {ITEMS.map(([l,ic,c,fn])=><button type="button" key={l} className="sx-dock-it" style={{'--c':c}} onClick={fn} aria-label={l}><span className="sx-dock-ic">{ic}</span><span className="sx-dock-tip">{l}</span></button>)}
  <span className="sx-dock-sep"/>
  <button type="button" className="sx-dock-it plus" onClick={newMenu} aria-label="Plus d’options"><span className="sx-dock-ic">{I.plus}</span><span className="sx-dock-tip">Plus…</span></button>
 </nav>
}
