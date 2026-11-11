'use client'
import ItemPresence from './ItemPresence'
import { useState } from 'react'
import './sidebar-navigation.css'
import useManualSort from './useManualSort'
import { compareItems } from '../lib/manual-order'

function MoreIcon(){return <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/></svg>}

function Symbol({ item, name }) {
  if (item?.icon) return <span className="sn-emoji">{item.icon}</span>
  const type = name || item?.type
  return <svg style={item?.color?{color:item.color}:undefined} width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{type === 'home' ? <><path d="m3 10 9-7 9 7v10H3Z" /><path d="M9 20v-7h6v7" /></> : type === 'invest' ? <><path d="M4 3v17h17M7 14l5-5 4 3 5-7M16 5h5v5" /></> : type === 'board' ? <><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 12h8M12 8v8"/></> : type === 'folder' ? <path d="M3 8V6a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /> : <><path d="M14 3H5v18h14V8Z M14 3v5h5" />{type === 'pdf' ? <path d="M12 12v6m-3-3 3 3 3-3" /> : <path d="M8 12h8M8 16h5" />}</>}</svg>
}

export default function SidebarNavigation({ active, onChange, onCreate, items = [], activeItem, onOpen, onOptions, space = 'notes', onSpaceChange, onReorder, onClose }) {
  const [query,setQuery] = useState('')
  const sortable = useManualSort(items, onReorder)
  const roots = items.filter(i => i.type === 'folder' && !i.parent_id).sort(compareItems)
  const selected = items.find(item=>item.id===activeItem)
  const folder = selected?.type==='folder'?selected:items.find(item=>item.id===selected?.parent_id)
  let root = folder
  const visited = new Set()
  while (root?.parent_id && !visited.has(root.id)) { visited.add(root.id); const next = items.find(i => i.id === root.parent_id); if (!next) break; root = next }
  const enter = item => { setQuery(''); onOpen(item.id) }
  const goHome = () => { setQuery(''); onChange('home') }

  const needle=query.trim().toLocaleLowerCase('fr')
  const results=needle?items.filter(item=>item.title.toLocaleLowerCase('fr').includes(needle)).sort(compareItems):[]
  const row=item=><div className={'sn-content-row'+(activeItem===item.id?' is-active':'')} key={item.id}>
    <button type="button" {...sortable(item)} className={'sn-item'+(activeItem===item.id?' is-active':'')} aria-current={activeItem===item.id?'page':undefined} onClick={()=>enter(item)} onContextMenu={e=>onOptions?.(e,item)}>
      <Symbol item={item}/><span className="sn-row-copy"><span>{item.title}</span>{needle&&item.parent_id&&<small>{items.find(parent=>parent.id===item.parent_id)?.title}</small>}</span><ItemPresence itemId={item.id} compact/>{item.type==='folder'&&<span className="sn-chevron" aria-hidden="true">›</span>}
    </button><button type="button" className="sn-content-options" aria-label={'Options de '+item.title} aria-haspopup="menu" onClick={e=>onOptions?.(e,item)}><MoreIcon/></button>
  </div>
  return <nav className="sn" aria-label="Navigation principale">
    <div className="sn-top"><span>Mon espace</span>{onClose&&<button type="button" className="sn-close" aria-label="Fermer le menu" onClick={onClose}>×</button>}</div>
    <div className="sn-sections">
      <button type="button" className={'sn-item sn-home'+(active==='home'?' is-active':'')} aria-current={active==='home'?'page':undefined} onClick={goHome}><Symbol name="home"/><span>Accueil</span></button>
      {[['notes','Notes','page'],['invest','Invest','invest']].map(([id,label,icon])=><button type="button" key={id} className={'sn-item'+(space===id&&active!=='home'?' is-active':'')} onClick={()=>{setQuery('');onSpaceChange(id)}}><Symbol name={icon}/><span>{label}</span></button>)}
    </div>
    <label className="sn-search"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/></svg><input aria-label="Rechercher dans les dossiers" placeholder="Rechercher…" value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button type="button" aria-label="Effacer la recherche" onClick={()=>setQuery('')}>×</button>}</label>
    {!needle&&<section className="sn-folders" aria-label="Dossiers principaux">
      <div className="sn-section-heading"><span>Dossiers</span><button type="button" aria-label="Nouveau contenu" onClick={onCreate}>＋</button></div>
      <div className="sn-root-list">{roots.map(item=><div className={'sn-content-row'+(root?.id===item.id?' is-active':'')} key={item.id}><button type="button" {...sortable(item)} className={'sn-item sn-bubble'+(root?.id===item.id?' is-active':'')} aria-label={item.title} aria-current={root?.id===item.id?'page':undefined} onClick={()=>enter(item)} onContextMenu={e=>onOptions?.(e,item)}><Symbol item={item}/><span>{item.title}</span><ItemPresence itemId={item.id} compact/></button><button type="button" className="sn-content-options" aria-label={'Options de '+item.title} aria-haspopup="menu" onClick={e=>onOptions?.(e,item)}><MoreIcon/></button></div>)}{!roots.length&&<span className="sn-empty">Aucun dossier</span>}</div>
    </section>}
    {needle&&<section className="sn-panel" aria-label="Résultats de recherche">
      <div className="sn-panel-heading"><span>Recherche</span><span role="status">{results.length}</span></div>
      <div className="sn-contents">{results.map(row)}{!results.length&&<span className="sn-empty">Aucun résultat</span>}</div>
    </section>}
  </nav>
}
