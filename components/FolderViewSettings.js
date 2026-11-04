'use client'
import { useState } from 'react'
import './video-folders.css'
export default function FolderViewSettings({items,selected,onChange,projectId}) {
  const [query,setQuery]=useState(''),[saving,setSaving]=useState(false),[error,setError]=useState('')
  const path=item=>{const names=[item.title],seen=new Set([item.id]);let parent=items.find(i=>i.id===item.parent_id);while(parent&&!seen.has(parent.id)){seen.add(parent.id);names.unshift(parent.title);parent=items.find(i=>i.id===parent.parent_id)}return names.join(' / ')}
  const folders=items.filter(i=>i.type==='folder').map(item=>({...item,path:path(item)})).filter(item=>item.path.toLocaleLowerCase('fr').includes(query.toLocaleLowerCase('fr'))).sort((a,b)=>a.path.localeCompare(b.path,'fr'))
  const toggle=async id=>{setSaving(true);setError('');try{await onChange(selected.includes(id)?selected.filter(value=>value!==id):[...selected,id])}catch{setError('Impossible d’enregistrer la vue. Réessaie.')}finally{setSaving(false)}}
  return <>
    <h2>Vue des dossiers</h2><p className="muted">Active la vue Vidéos YouTube pour les dossiers de ton choix. Chaque page affiche la miniature de sa première vidéo et son titre en dessous.</p>
    <p className="muted">Ce choix est mémorisé sur ton compte, pour ce projet. Il s’applique au contenu direct du dossier choisi.</p>
    {!projectId?<p className="muted">Choisis d’abord un projet.</p>:<><input className="folder-view-search" type="search" aria-label="Rechercher un dossier" placeholder="Rechercher un dossier…" value={query} onChange={e=>setQuery(e.target.value)}/>
    <div className="folder-view-options">{folders.map(folder=><label key={folder.id}><input type="checkbox" checked={selected.includes(folder.id)} disabled={saving} onChange={()=>toggle(folder.id)}/><span><strong>{folder.icon||'📁'} {folder.path}</strong><small>{folder.space==='invest'?'Invest':'Notes'} · Vidéos YouTube</small></span></label>)}{!folders.length&&<p className="muted">Aucun dossier trouvé.</p>}</div></>}
    {error&&<p role="alert">{error}</p>}{saving&&<p role="status" className="muted">Enregistrement…</p>}
  </>
}
