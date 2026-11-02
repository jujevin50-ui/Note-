'use client'
import './home.css'
import {useMemo,useState,useEffect} from 'react'
import {TextGenerate,Ticker,FxSearch} from './Fx'

/* ---------- utilitaires ---------- */
const rtf=typeof Intl!=='undefined'?new Intl.RelativeTimeFormat('fr',{numeric:'auto'}):null
const ago=d=>{if(!d||!rtf)return '';const s=(new Date(d).getTime()-Date.now())/1000,a=Math.abs(s)
 if(a<60)return 'à l’instant'
 if(a<3600)return rtf.format(Math.round(s/60),'minute')
 if(a<86400)return rtf.format(Math.round(s/3600),'hour')
 if(a<86400*30)return rtf.format(Math.round(s/86400),'day')
 if(a<86400*365)return rtf.format(Math.round(s/(86400*30)),'month')
 return rtf.format(Math.round(s/(86400*365)),'year')}
const greet=()=>{const h=new Date().getHours();return h<5?'Bonne nuit':h<12?'Bonjour':h<18?'Bon après-midi':'Bonsoir'}
const TYPE={page:{l:'Page',c:'#3b82f6'},pdf:{l:'PDF',c:'#ef4444'},folder:{l:'Dossier',c:'#f59e0b'}}
const colorOf=i=>i.color||TYPE[i.type]?.c||'#3b82f6'
const plural=(n,w)=>n+' '+w+(n>1?'s':'')

/* ---------- icônes SVG ---------- */
const Svg=({d,s=16})=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{d}</svg>
const I={
 page:<Svg d={<><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></>}/>,
 folder:<Svg d={<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>}/>,
 pdf:<Svg d={<><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M12 11v6M9 14l3 3 3-3"/></>}/>,
 grid:<Svg d={<><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>}/>,
 list:<Svg d={<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>}/>,
 tree:<Svg d={<><path d="M4 4v13a3 3 0 0 0 3 3h3M4 9h6"/><rect x="12" y="6" width="8" height="6" rx="1.5"/><rect x="12" y="15" width="8" height="6" rx="1.5"/></>}/>,
 chev:<Svg s={14} d={<path d="m9 6 6 6-6 6"/>}/>,
 clock:<Svg s={14} d={<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>}/>,
 more:<Svg s={16} d={<><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>}/>,
 plus:<Svg s={14} d={<path d="M12 5v14M5 12h14"/>}/>,
}
const Glyph=({i,big})=><span className={'hv-glyph'+(big?' big':'')} style={{'--c':colorOf(i)}}>{i.icon?<span className="hv-emoji">{i.icon}</span>:I[i.type]||I.page}</span>

/* ---------- vue ---------- */
export default function HomeView({items,sibs,openItem,show,projName,name,add,pick}){
 const [q,setQ]=useState('')
 const [filter,setFilter]=useState('all')
 const [sort,setSort]=useState('recent')
 const [view,setView]=useState(()=>{try{return localStorage.getItem('hv-view')||'grid'}catch{return 'grid'}})
 const [closed,setClosed]=useState({})
 useEffect(()=>{try{localStorage.setItem('hv-view',view)}catch{}},[view])

 const byId=useMemo(()=>Object.fromEntries(items.map(i=>[i.id,i])),[items])
 const pathOf=i=>{const a=[];let c=byId[i.parent_id];while(c){a.unshift(c.title);c=byId[c.parent_id]}return a}
 const countIn=id=>sibs(id).reduce((n,c)=>n+(c.type==='folder'?countIn(c.id):1),0)
 const t=i=>new Date(i.created_at||0).getTime()

 const n={folder:0,page:0,pdf:0};items.forEach(i=>{if(n[i.type]!=null)n[i.type]++})
 const files=items.filter(i=>i.type!=='folder')
 const recent=[...files].sort((a,b)=>t(b)-t(a)).slice(0,8)
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

 /* arbre complet */
 const Tree=({p,d=0})=>sibs(p).filter(i=>filter==='all'||i.type==='folder'||i.type===filter).map(i=>{
  const f=i.type==='folder',isClosed=closed[i.id]
  return <div key={i.id} className="hv-tnode">
   <div className={'hv-trow'+(f?' is-folder':'')} style={{'--d':d}} onClick={()=>f?setClosed(c=>({...c,[i.id]:!c[i.id]})):open(i)} onContextMenu={e=>show(e,i)}>
    <span className={'hv-tchev'+(f?'':' none')+(isClosed?'':' open')}>{I.chev}</span>
    <Glyph i={i}/>
    <span className="hv-tname">{i.title}</span>
    {f&&<small className="hv-count">{countIn(i.id)}</small>}
    <span className="hv-tact">
     {f&&<button type="button" title="Ajouter" onClick={e=>{e.stopPropagation();show(e,i,'new')}}>{I.plus}</button>}
     {f&&<button type="button" title="Ouvrir le dossier" onClick={e=>{e.stopPropagation();open(i)}}>{I.chev}</button>}
     <button type="button" title="Options" onClick={e=>{e.stopPropagation();show(e,i)}}>{I.more}</button>
    </span>
   </div>
   {f&&!isClosed&&<div className="hv-tkids"><Tree p={i.id} d={d+1}/></div>}
  </div>})

 const FILTERS=[['all','Tout',items.length],['page','Pages',n.page],['pdf','PDF',n.pdf],['folder','Dossiers',n.folder]]

 return <div className="home home-in hv">
  {/* HERO */}
  <header className="hv-hero">
   <div className="hv-orbs" aria-hidden><i/><i/><i/></div>
   <div className="hv-hero-in">
    <p className="dash-kicker">{projName||'Espace'} · {new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})}</p>
    <h1 className="hv-title"><TextGenerate text={greet()+(name?', '+name:'')}/></h1>
    <p className="hv-lead muted">{items.length?`Tu as ${plural(n.page,'page')}, ${plural(n.pdf,'PDF')} et ${plural(n.folder,'dossier')} dans cet espace.`:'Ton espace est vide — crée ta première note.'}</p>
    <div className="hv-search"><FxSearch value={q} onChange={e=>setQ(e.target.value)} placeholders={['Rechercher dans tous les fichiers…','Un cours, une réunion…','Un PDF, un dossier…','Une idée à retrouver…']}/></div>
   </div>
   <div className="hv-stats">
    {[['page','Pages'],['pdf','PDF'],['folder','Dossiers']].map(([k,l])=><button type="button" key={k} className={'hv-stat'+(filter===k?' on':'')} style={{'--c':TYPE[k].c}} onClick={()=>setFilter(f=>f===k?'all':k)}>
     <span className="hv-stat-ico">{I[k]}</span><Ticker value={n[k]}/><small>{l}</small>
    </button>)}
   </div>
  </header>

  {/* ACTIONS RAPIDES */}
  {!needle&&<section className="hv-quick">
   <button type="button" className="hv-act" style={{'--c':'#3b82f6'}} onClick={()=>add('page',null)}><span className="hv-act-ico">{I.page}</span><b>Nouvelle page</b><small>Écrire, lister, structurer</small></button>
   <button type="button" className="hv-act" style={{'--c':'#f59e0b'}} onClick={()=>add('folder',null)}><span className="hv-act-ico">{I.folder}</span><b>Nouveau dossier</b><small>Ranger par thème</small></button>
   <button type="button" className="hv-act" style={{'--c':'#ef4444'}} onClick={()=>pick(null)}><span className="hv-act-ico">{I.pdf}</span><b>Importer un PDF</b><small>Ou glisse-le n’importe où</small></button>
  </section>}

  {/* RÉCENTS */}
  {!needle&&recent.length>0&&<section className="hsec">
   <div className="sec-label"><h4>Récents</h4><span className="muted">{recent.length}</span></div>
   <div className="hv-recent">
    {recent.map(i=><button type="button" key={i.id} className="hv-rcard" style={{'--c':colorOf(i)}} onClick={()=>open(i)} onContextMenu={e=>show(e,i)}>
     <span className="hv-rcard-top"><Glyph i={i} big/></span>
     <b>{i.title}</b>
     <small className="muted">{pathOf(i).join(' › ')||'Racine'}</small>
     <small className="hv-when">{I.clock}{ago(i.created_at)}</small>
    </button>)}
   </div>
  </section>}

  {/* DOSSIERS */}
  {!needle&&folders.length>0&&<section className="hsec">
   <div className="sec-label"><h4>Dossiers</h4><span className="muted">{folders.length}</span></div>
   <div className="hv-folders">
    {folders.map(f=>{const kids=sibs(f.id)
     return <button type="button" key={f.id} className="hv-folder" style={{'--c':colorOf(f)}} onClick={()=>open(f)} onContextMenu={e=>show(e,f)}>
      <span className="hv-folder-tab" aria-hidden/>
      <span className="hv-folder-hd"><Glyph i={f}/><b>{f.title}</b><small className="hv-count">{countIn(f.id)}</small></span>
      <span className="hv-folder-peek">{kids.slice(0,3).map(k=><span key={k.id}><Glyph i={k}/>{k.title}</span>)}{!kids.length&&<em className="muted">Vide</em>}{kids.length>3&&<em className="muted">+{kids.length-3} autres</em>}</span>
     </button>})}
   </div>
  </section>}

  {/* TOUS LES FICHIERS */}
  <section className="hsec hv-all">
   <div className="hv-all-hd">
    <div className="sec-label"><h4>{needle?'Résultats':'Tous les fichiers'}</h4><span className="muted">{view==='tree'&&!needle?items.length:all.length}</span></div>
    <div className="hv-ctrl">
     <div className="hv-seg">{FILTERS.map(([k,l,c])=><button type="button" key={k} className={filter===k?'on':''} onClick={()=>setFilter(k)}>{l}<small>{c}</small></button>)}</div>
     <select className="hv-sort" value={sort} onChange={e=>setSort(e.target.value)} aria-label="Trier">
      <option value="recent">Plus récents</option><option value="az">Nom A → Z</option><option value="type">Par type</option>
     </select>
     <div className="hv-seg hv-views">{[['grid','Grille'],['list','Liste'],['tree','Arborescence']].map(([k,l])=><button type="button" key={k} title={l} aria-label={l} className={view===k?'on':''} onClick={()=>setView(k)}>{I[k]}</button>)}</div>
    </div>
   </div>

   {!items.length?<div className="dash-empty">
    <div className="dash-empty-ico">📝</div><h3>Commence à écrire</h3>
    <p className="muted">Crée une page ou un dossier pour organiser tes idées.</p>
    <button type="button" className="btn-primary btn-glow" onClick={()=>add('page',null)}>＋ Créer une page</button>
   </div>
   :view==='tree'&&!needle?<div className="hv-tree"><Tree p={null}/></div>
   :!all.length?<p className="muted dash-none">Aucun fichier{needle?` pour « ${q.trim()} »`:''}.</p>
   :view==='list'?<div className="hv-table" role="table">
    <div className="hv-tr hv-th" role="row"><span>Nom</span><span>Emplacement</span><span>Type</span><span>Créé</span><span/></div>
    {all.map(i=><div key={i.id} role="row" className="hv-tr" onClick={()=>open(i)} onContextMenu={e=>show(e,i)}>
     <span className="hv-name"><Glyph i={i}/><b><Hl s={i.title}/></b></span>
     <span className="muted hv-path">{pathOf(i).join(' › ')||'Racine'}</span>
     <span><em className="hv-badge" style={{'--c':TYPE[i.type]?.c}}>{TYPE[i.type]?.l||i.type}</em></span>
     <span className="muted">{ago(i.created_at)}</span>
     <span><button type="button" className="hv-icon-btn" title="Options" onClick={e=>{e.stopPropagation();show(e,i)}}>{I.more}</button></span>
    </div>)}
   </div>
   :<div className="hv-grid">
    {all.map(i=><button type="button" key={i.id} className="hv-card" style={{'--c':colorOf(i)}} onClick={()=>open(i)} onContextMenu={e=>show(e,i)}>
     <span className="hv-card-glow" aria-hidden/>
     <span className="hv-card-hd"><Glyph i={i} big/><em className="hv-badge" style={{'--c':TYPE[i.type]?.c}}>{TYPE[i.type]?.l||i.type}</em></span>
     <b className="hv-card-t"><Hl s={i.title}/></b>
     <small className="muted hv-path">{pathOf(i).join(' › ')||'Racine'}</small>
     <small className="hv-when">{I.clock}{i.type==='folder'?plural(countIn(i.id),'élément'):ago(i.created_at)}</small>
    </button>)}
   </div>}
  </section>
 </div>
}
