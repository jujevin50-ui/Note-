'use client'
import { useEffect, useState } from 'react'
import './sidebar-navigation.css'
import useManualSort from './useManualSort'
import useFolderNameHint from './useFolderNameHint'
import { compareItems } from '../lib/manual-order'

function Symbol({ item, name }) {
  if (item?.icon) return <span className="sn-emoji">{item.icon}</span>
  const type = name || item?.type
  return <svg style={item?.color?{color:item.color}:undefined} width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{type === 'home' ? <><path d="m3 10 9-7 9 7v10H3Z" /><path d="M9 20v-7h6v7" /></> : type === 'invest' ? <><path d="M4 3v17h17M7 14l5-5 4 3 5-7M16 5h5v5" /></> : type === 'folder' ? <path d="M3 8V6a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /> : <><path d="M14 3H5v18h14V8Z M14 3v5h5" />{type === 'pdf' ? <path d="M12 12v6m-3-3 3 3 3-3" /> : <path d="M8 12h8M8 16h5" />}</>}</svg>
}

export default function SidebarNavigation({ active, onChange, onCreate, items = [], activeItem, onOpen, onOptions, space = 'notes', onSpaceChange, onReorder }) {
  const folderHint = useFolderNameHint()
  const sortable = useManualSort(items, onReorder)
  const [folderId, setFolderId] = useState(null)
  const roots = items.filter(i => i.type === 'folder' && !i.parent_id).sort(compareItems)
  const folder = items.find(i => i.id === folderId && i.type === 'folder')
  const parent = folder && items.find(i => i.id === folder.parent_id)
  const children = items.filter(i => (i.parent_id || null) === (folder?.id || null)).sort(compareItems)
  let root = folder
  const visited = new Set()
  while (root?.parent_id && !visited.has(root.id)) { visited.add(root.id); const next = items.find(i => i.id === root.parent_id); if (!next) break; root = next }
  useEffect(() => {
    if (!activeItem) return
    const item = items.find(i => i.id === activeItem)
    if (item) setFolderId(item.type === 'folder' ? item.id : item.parent_id || null)
  }, [activeItem, items])
  useEffect(() => { if (folderId && !items.some(i => i.id === folderId)) setFolderId(null) }, [items, folderId])
  const enter = item => { if (item.type === 'folder') setFolderId(item.id); onOpen(item.id) }
  const goHome = () => { setFolderId(null); onChange('home') }

  return <><nav {...folderHint.events} className="sn" aria-label="Navigation principale">
    <div className="sn-rail" aria-label="Dossiers principaux">
      <button type="button" {...sortable({id:null,type:'folder'}, {destinationOnly:true})} className={'sn-bubble sn-home' + (!folder && active === 'home' ? ' is-active' : '')} aria-label="Accueil" aria-current={!folder && active === 'home' ? 'page' : undefined} onClick={goHome}><span className="sn-bubble-symbol"><Symbol name="home" /></span><span className="sn-bubble-label">Accueil</span></button>
      <span className="sn-rail-divider" />
      {roots.map((item, index) => <button type="button" key={item.id} {...sortable(item)} data-folder-name={item.title} aria-describedby={folderHint.descriptionId} className={'sn-bubble' + (root?.id === item.id ? ' is-active' : '')} style={{ '--bubble-color': item.color || ['#a596e8','#78b8a3','#dd9cae','#8aaedf'][index % 4] }} aria-label={item.title} aria-current={root?.id === item.id ? 'page' : undefined} onClick={() => enter(item)} onContextMenu={e => onOptions?.(e,item)}><span className="sn-bubble-symbol"><Symbol item={item} /></span><span className="sn-bubble-label">{item.title}</span></button>)}
      <button type="button" className="sn-bubble sn-add" aria-label="Nouveau contenu" onClick={onCreate}><span className="sn-bubble-symbol">＋</span><span className="sn-bubble-label">Nouveau</span></button>
    </div>
    <div className="sn-panel">
      <div className="sn-panel-heading" {...sortable(folder || {id:null,type:'folder'}, {destinationOnly:true})}>{folder && <button type="button" className="sn-back" {...sortable(parent || {id:null,type:'folder'}, {destinationOnly:true})} aria-label="Dossier parent" onClick={() => { if (parent) enter(parent); else goHome() }}>‹</button>}<span>{folder?.title || 'Mon espace'}</span>{folder && <button type="button" className="sn-options" aria-label="Options du dossier" onClick={e => onOptions?.(e,folder)}>•••</button>}</div>
      {!folder && <div className="sn-sections">
        <button type="button" className={'sn-item' + (active === 'home' ? ' is-active' : '')} aria-current={active === 'home' ? 'page' : undefined} onClick={goHome}><Symbol name="home" /><span>Accueil</span></button>
        {[['notes','Notes','page'],['invest','Invest','invest']].map(([id,label,icon]) => <button type="button" key={id} className={'sn-item' + (active && active !== 'home' && space === id ? ' is-active' : '')} aria-current={active && active !== 'home' && space === id ? 'page' : undefined} onClick={() => { setFolderId(null); onSpaceChange(id) }}><Symbol name={icon} /><span>{label}</span></button>)}
      </div>}
      <div className="sn-contents">{children.filter(i => folder || i.type !== 'folder').map(item => <div className="sn-content-row" key={item.id}><button type="button" {...sortable(item)} className={'sn-item' + (activeItem === item.id ? ' is-active' : '')} aria-current={activeItem === item.id ? 'page' : undefined} onClick={() => enter(item)} onContextMenu={e => onOptions?.(e,item)}><Symbol item={item} /><span>{item.title}</span>{item.type === 'folder' && <span className="sn-chevron" aria-hidden="true">›</span>}</button><button type="button" className="sn-content-options" aria-label={`Options de ${item.title}`} onClick={e => onOptions?.(e,item)}>•••</button></div>)}{folder && !children.length && <span className="sn-empty">Vide</span>}</div>
    </div>
  </nav>{folderHint.tooltip}</>
}
