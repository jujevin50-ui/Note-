'use client'
import {useEffect,useState} from 'react'
import {supabase} from '../lib/supabase'
const COLS=[['todo','À faire'],['doing','En cours'],['done','Terminé']]
export default function Board({id,pid,ask}){
 const [cards,setCards]=useState([])
 const load=async()=>{const {data}=await supabase.from('cards').select('*').eq('item_id',id).order('created_at');setCards(data||[])}
 useEffect(()=>{load();const ch=supabase.channel('cards:'+id).on('postgres_changes',{event:'*',schema:'public',table:'cards',filter:'item_id=eq.'+id},load).subscribe();return()=>supabase.removeChannel(ch)},[id])
 const add=col=>ask('Titre de la carte','',title=>supabase.from('cards').insert({item_id:id,project_id:pid,title,col}))
 return <div className="board">{COLS.map(([k,l])=>
  <div key={k} className="col" onDragOver={e=>e.preventDefault()} onDrop={e=>supabase.from('cards').update({col:k}).eq('id',e.dataTransfer.getData('t'))}>
   <h3>{l}</h3>
   {cards.filter(c=>c.col===k).map(c=><div key={c.id} className="card" draggable onDragStart={e=>e.dataTransfer.setData('t',c.id)}>
    {c.title}<b onClick={()=>supabase.from('cards').delete().eq('id',c.id)}>✕</b></div>)}
   <button className="ghost" onClick={()=>add(k)}>+ Carte</button></div>)}</div>
}
