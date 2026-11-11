'use client'
import { useEffect, useRef, useState } from 'react'
import './move-document.css'
export default function MoveDocumentDialog({item,items,onMove,onClose}) {
 const [destination,setDestination]=useState(item.parent_id||''),[query,setQuery]=useState(''),[saving,setSaving]=useState(false),[error,setError]=useState('')
 const form=useRef(null)
 const path=folder=>{const names=[folder.title],seen=new Set([folder.id]);let parent=items.find(i=>i.id===folder.parent_id);while(parent&&!seen.has(parent.id)){seen.add(parent.id);names.unshift(parent.title);parent=items.find(i=>i.id===parent.parent_id)}return ((folder.space||'notes')==='invest'?'Invest':'Notes')+' / '+names.join(' / ')}
 const folders=items.filter(i=>i.type==='folder').map(folder=>({...folder,path:path(folder)})).sort((a,b)=>a.path.localeCompare(b.path,'fr'))
 const visible=folders.filter(folder=>folder.id===destination||folder.path.toLocaleLowerCase('fr').includes(query.trim().toLocaleLowerCase('fr')))
 useEffect(()=>{const previous=document.activeElement;form.current?.querySelector('input')?.focus();return()=>previous?.isConnected&&previous.focus()},[])
 const submit=async e=>{e.preventDefault();setSaving(true);setError('');try{await onMove(item.id,destination||null);onClose()}catch{setError('Impossible de déplacer ce document. Réessaie.');setSaving(false)}}
 return <div className="ov" onClick={()=>!saving&&onClose()} onKeyDown={e=>{
  if(e.key==='Escape'&&!saving){e.stopPropagation();onClose()}
  if(e.key==='Tab'){const controls=[...form.current.querySelectorAll('input,select,button')].filter(el=>!el.disabled);const first=controls[0],last=controls.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}
 }}><form ref={form} className="dlg move-document" role="dialog" aria-modal="true" aria-labelledby="move-document-title" onClick={e=>e.stopPropagation()} onSubmit={submit}>
  <h3 id="move-document-title">Déplacer « {item.title} »</h3>
  <input aria-label="Rechercher un dossier de destination" placeholder="Rechercher un dossier…" value={query} disabled={saving} onChange={e=>setQuery(e.target.value)}/>
  <select size={7} aria-label="Dossier de destination" value={destination} disabled={saving} onChange={e=>setDestination(e.target.value)}><option value="">Sans dossier</option>{visible.map(folder=><option key={folder.id} value={folder.id}>{folder.path}</option>)}</select>
  {error&&<p role="alert">{error}</p>}
  <div className="btns"><button type="button" className="ghost" disabled={saving} onClick={onClose}>Annuler</button><button type="submit" className="on" disabled={saving||destination===(item.parent_id||'')}>{saving?'Déplacement…':'Déplacer'}</button></div>
 </form></div>
}
