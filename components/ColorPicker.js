'use client'
import { useEffect, useState } from 'react'
import './emoji-picker.css'
import './color-picker.css'
const COLORS=[['#a596e8','Lavande'],['#8b5cf6','Violet'],['#ec4899','Rose'],['#ef4444','Rouge'],['#f97316','Orange'],['#f59e0b','Ambre'],['#eab308','Jaune'],['#22c55e','Vert'],['#14b8a6','Turquoise'],['#06b6d4','Cyan'],['#3b82f6','Bleu'],['#64748b','Ardoise']]
export default function ColorPicker({item,onSave,onClose}) {
  const [color,setColor]=useState(item.color||null),[saving,setSaving]=useState(false),[error,setError]=useState('')
  useEffect(()=>{const close=e=>{if(e.key==='Escape')onClose()};document.addEventListener('keydown',close);return()=>document.removeEventListener('keydown',close)},[onClose])
  const preview=color||(item.type==='folder'?'#f59e0b':item.type==='pdf'?'#ef4444':'#8b5cf6')
  const save=async()=>{setSaving(true);setError('');try{await onSave(color);onClose()}catch{setError('Impossible d’enregistrer la couleur. Réessaie.');setSaving(false)}}
  return <div className="ov" onClick={onClose}><section className="emoji-picker color-picker" role="dialog" aria-modal="true" aria-label="Choisir une couleur" onClick={e=>e.stopPropagation()}>
    <header><div><h2>Couleur du {item.type==='folder'?'dossier':'fichier'}</h2><p>{item.title}</p></div><button type="button" aria-label="Fermer" onClick={onClose}>×</button></header>
    <div className="color-preview" style={{'--file-color':preview}}><span>{item.icon||<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" aria-hidden="true">{item.type==='folder'?<path d="M3 7V5h6l3 3h9v12H3Z"/>:<path d="M14 3H5v18h14V8h-5V3Zm0 0 5 5M8 13h8M8 17h5"/>}</svg>}</span><strong>{item.title}</strong></div>
    <div className="color-options" aria-label="Couleurs disponibles">{COLORS.map(([value,label])=><button type="button" key={value} style={{'--file-color':value}} title={label} aria-label={label} aria-pressed={color===value} onClick={()=>setColor(value)}><span aria-hidden="true">{color===value?'✓':''}</span></button>)}</div>
    <label className="color-custom">Couleur personnalisée<input type="color" aria-label="Couleur personnalisée" value={preview} onChange={e=>setColor(e.target.value)}/></label>
    {error&&<p role="alert">{error}</p>}
    <footer><button type="button" disabled={saving} onClick={()=>setColor(null)}>Par défaut</button><button type="button" className="color-save" disabled={saving} onClick={save}>{saving?'Enregistrement…':'Appliquer'}</button></footer>
  </section></div>
}
