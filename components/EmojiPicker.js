'use client'
import { useEffect, useState } from 'react'
import { EMOJI_GROUPS, searchEmojis } from '../lib/emojis'
import './emoji-picker.css'

export default function EmojiPicker({ item, onSave, onClose }) {
  const [query,setQuery]=useState(''), [category,setCategory]=useState('Tous')
  const [saving,setSaving]=useState(false), [error,setError]=useState('')
  const entries=searchEmojis(query,category)
  useEffect(()=>{const close=e=>{if(e.key==='Escape')onClose()};document.addEventListener('keydown',close);return()=>document.removeEventListener('keydown',close)},[onClose])
  const save=async emoji=>{if(saving)return;setSaving(true);setError('');try{await onSave(emoji);onClose()}catch{setError('Impossible d’enregistrer cet emoji. Réessaie.');setSaving(false)}}
  return <div className="ov" onClick={onClose}><section className="emoji-picker" role="dialog" aria-modal="true" aria-label="Choisir un emoji" onClick={e=>e.stopPropagation()}>
    <header><div><h2>Choisir un emoji</h2><p>{item.title}</p></div><button type="button" aria-label="Fermer" onClick={onClose}>×</button></header>
    <input autoFocus type="search" aria-label="Rechercher un emoji" placeholder="Rechercher : livre, finance, idée…" value={query} onChange={e=>{setQuery(e.target.value);setCategory('Tous')}}/>
    <div className="emoji-categories">{['Tous',...EMOJI_GROUPS.map(group=>group.name)].map(name=><button type="button" key={name} aria-pressed={category===name} onClick={()=>setCategory(name)}>{name}</button>)}</div>
    <div className="emoji-grid" aria-label="Emojis disponibles" aria-busy={saving}>{entries.map(entry=><button type="button" key={entry.emoji} disabled={saving} title={entry.label} aria-label={entry.label} aria-pressed={item.icon===entry.emoji} onClick={()=>save(entry.emoji)}>{entry.emoji}</button>)}{!entries.length&&<p>Aucun emoji trouvé.</p>}</div>
    {error&&<p role="alert">{error}</p>}
    <footer><span>{saving?'Enregistrement…':entries.length+' emojis'}</span><button type="button" disabled={saving} onClick={()=>save(null)}>Retirer l’emoji</button></footer>
  </section></div>
}
