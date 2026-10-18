'use client'
import {useEffect,useState} from 'react'
import * as Y from 'yjs'
import {supabase} from '../lib/supabase'
import {connect,b64,un,colorOf} from '../lib/provider'
import {SidePanel} from './Editor'

export default function PdfView({id,user,path,title}){
 const [u,setU]=useState('')
 const [ctx,setCtx]=useState(null)
 const [sp,setSp]=useState(()=>{try{return localStorage.getItem('pdf-sp')==='1'}catch{return false}})
 const [hasSum,setHasSum]=useState(false)
 const toggle=v=>{setSp(v);try{localStorage.setItem('pdf-sp',v?'1':'0')}catch{}}

 useEffect(()=>{
  let x
  supabase.storage.from('pdfs').download(path).then(({data})=>{if(data){x=URL.createObjectURL(data);setU(x)}})
  return()=>x&&URL.revokeObjectURL(x)
 },[path])

 useEffect(()=>{
  let c,off=false,t,dirty=false
  const ydoc=new Y.Doc()
  const save=()=>{if(!dirty)return;dirty=false;supabase.from('items').update({ydoc:b64(Y.encodeStateAsUpdate(ydoc))}).eq('id',id).then(()=>{})}
  ;(async()=>{
   const {data}=await supabase.from('items').select('ydoc').eq('id',id).single()
   if(data?.ydoc)Y.applyUpdate(ydoc,un(data.ydoc),'remote')
   if(off)return
   c=connect(id,ydoc,{name:user.user_metadata?.name||user.email.split('@')[0],color:colorOf(user.email)})
   ydoc.on('update',()=>{dirty=true;clearTimeout(t);t=setTimeout(save,800)})
   setCtx({ydoc,provider:c})
  })()
  return()=>{off=true;clearTimeout(t);save();c?.destroy();setCtx(null)}
 },[id,user])

 useEffect(()=>{
  if(!ctx?.ydoc)return
  const fs=['summary','notes'].map(k=>ctx.ydoc.getXmlFragment(k))
  const chk=()=>setHasSum(fs.some(f=>f.toString().replace(/<[^>]*>/g,'').trim().length>0))
  chk();fs.forEach(f=>f.observeDeep(chk))
  return()=>fs.forEach(f=>f.unobserveDeep(chk))
 },[ctx])

 return <div className={'ed-wrap'+(sp?' shift':'')}>
  <div className="pdf-bar">
   {u&&<a href={u} download={(title||'document')+'.pdf'} className="pdf-dl">⬇ Télécharger</a>}
   <button type="button" className={'sum-btn'+(sp?' active':'')} title="Résumé et notes du PDF" onClick={()=>toggle(!sp)}>
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="2.5" y="3.5" width="15" height="13" rx="3"/><path d="M12.5 3.5v13"/>{sp&&<rect x="12.5" y="3.5" width="5" height="13" rx="2" fill="currentColor" stroke="none" opacity=".35"/>}</svg>
    Résumé{hasSum&&<i title="Ce PDF a un résumé ou des notes"/>}
   </button>
  </div>
  {u?<iframe src={u} className="pdf" title={title||'PDF'}/>:<p className="muted">Chargement du PDF…</p>}
  {ctx&&<SidePanel ydoc={ctx.ydoc} open={sp} onClose={()=>toggle(false)}/>}
 </div>
}
