'use client'
import './toolbar.css'
import {useEffect,useState,useRef,useLayoutEffect} from 'react'
import RichTextToolbar from './RichTextToolbar'
import { richExtensions } from './richExtensions'
import TableTools from './TableTools'
import PageOutline from './PageOutline'
import * as Y from 'yjs'
import {useEditor,EditorContent} from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCursor from '@tiptap/extension-collaboration-cursor'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import {supabase} from '../lib/supabase'
import {connect,b64,un,colorOf} from '../lib/provider'

export default function Editor({id,user,projectId}){
 const [ctx,setCtx]=useState(null)
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
 },[id])
 return ctx?<Tiptap key={id} {...ctx} projectId={projectId}/>:<p className="muted">Chargement…</p>
}

function Tiptap({ydoc,provider,projectId}){
 const [sp,setSp]=useState(()=>{try{return localStorage.getItem('sp')==='1'}catch{return false}})
 const toggle=v=>{setSp(v);try{localStorage.setItem('sp',v?'1':'0')}catch{}}
 const [spw,setSpw]=useState(()=>{try{return Math.max(280,Math.min(720,+localStorage.getItem('spw')||380))}catch{return 380}})
 const [tbPos,setTbPos]=useState(()=>{try{return localStorage.getItem('tbpos')||'center'}catch{return 'center'}})
 useEffect(()=>{
  const sync=()=>{try{setTbPos(localStorage.getItem('tbpos')||'center')}catch{}}
  window.addEventListener('storage',sync)
  window.addEventListener('tbpos-change',sync)
  return()=>{window.removeEventListener('storage',sync);window.removeEventListener('tbpos-change',sync)}
 },[])
 const [hasSum,setHasSum]=useState(false)
 const [compact,setCompact]=useState(false)
 useEffect(()=>{
  const media=window.matchMedia('(max-width:900px)')
  const sync=()=>setCompact(media.matches)
  sync();media.addEventListener('change',sync)
  return()=>media.removeEventListener('change',sync)
 },[])
 const vertical=tbPos==='right'&&!compact
 useEffect(()=>{
  const fs=['summary','notes'].map(k=>ydoc.getXmlFragment(k))
  const chk=()=>setHasSum(fs.some(f=>f.toString().replace(/<[^>]*>/g,'').trim().length>0))
  chk();fs.forEach(f=>f.observeDeep(chk));return()=>fs.forEach(f=>f.unobserveDeep(chk))
 },[ydoc])
 const ed=useEditor({immediatelyRender:false,extensions:richExtensions([Collaboration.configure({document:ydoc}),CollaborationCursor.configure({provider,user:provider.awareness.getLocalState().user})])})
 if(!ed)return null
 return <>
  <div className={'ed-wrap'+(sp?' shift':'')+(tbPos==='right'?' tb-right':' tb-center')} style={sp?{'--spw':spw+'px'}:undefined}>
  <RichTextToolbar editor={ed} projectId={projectId} vertical={vertical} extraActions={<button type="button" className={'sum-btn'+(sp?' active':'')} aria-label="Résumé et notes de la page" aria-pressed={sp} title="Résumé et notes de la page" onClick={()=>toggle(!sp)}>
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="2.5" y="3.5" width="15" height="13" rx="3"/><path d="M12.5 3.5v13"/>{sp&&<rect x="12.5" y="3.5" width="5" height="13" rx="2" fill="currentColor" stroke="none" opacity=".35"/>}</svg>
    <span className="toolbar-label">Résumé</span>{hasSum&&<i title="Cette page a un résumé ou des notes"/>}</button>}/>
  <TableTools editor={ed}/>
  <PageOutline editor={ed}/>
  <div className="editor-content">
    <EditorContent editor={ed}/>
    <div className="editor-scroll-space" aria-hidden="true" onMouseDown={e=>{e.preventDefault();if(!ed.isDestroyed)ed.commands.focus('end',{scrollIntoView:false})}}/>
  </div></div>
  <SidePanel ydoc={ydoc} open={sp} onClose={()=>toggle(false)} width={spw} onWidth={w=>{setSpw(w);try{localStorage.setItem('spw',String(w))}catch{}}}/></>
}

export function SidePanel({ydoc,open,onClose,width=380,onWidth}){
 const [tab,setTab]=useState('summary')
 const panelRef=useRef(null)
 const [bounds,setBounds]=useState(null)
 useLayoutEffect(()=>{
  const panel=panelRef.current
  const main=panel?.closest('main')
  if(!main)return
  const place=()=>{
   const rect=main.getBoundingClientRect()
   const inset=12
   setBounds({top:Math.max(inset,rect.top+inset),right:Math.max(inset,window.innerWidth-rect.right+inset),bottom:Math.max(inset,window.innerHeight-rect.bottom+inset),width:Math.min(width,Math.max(0,rect.width-inset*2))})
  }
  place()
  const observer=new ResizeObserver(place)
  observer.observe(main)
  window.addEventListener('resize',place)
  return()=>{observer.disconnect();window.removeEventListener('resize',place)}
 },[width])
 const ed=useEditor({immediatelyRender:false,extensions:[StarterKit.configure({history:false}),
  Collaboration.configure({document:ydoc,field:tab}),TaskList,TaskItem.configure({nested:true})]},[tab])
 useEffect(()=>{if(open&&ed&&!ed.isDestroyed){const t=setTimeout(()=>{try{ed.commands.focus('end',{scrollIntoView:false})}catch{}},380);return()=>clearTimeout(t)}},[open,tab,ed])
 const startResize=e=>{
  e.preventDefault();e.stopPropagation()
  const x0=e.clientX,w0=width
  const move=ev=>{
   const next=Math.max(280,Math.min(720,Math.round(w0-(ev.clientX-x0))))
   onWidth?.(next)
  }
  const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);document.body.classList.remove('resizing-sp')}
  document.body.classList.add('resizing-sp')
  window.addEventListener('pointermove',move);window.addEventListener('pointerup',up)
 }
 const words=ed&&!ed.isDestroyed?ed.getText().trim().split(/\s+/).filter(Boolean).length:0
 const f=()=>ed.chain().focus()
 const T=(l,fn,a,t)=><button type="button" title={t} className={a?'on':''} onMouseDown={e=>e.preventDefault()} onClick={fn}>{l}</button>
 return <div ref={panelRef} className={'sp'+(open?' open':'')} style={{...bounds,'--spw':width+'px',visibility:bounds?undefined:'hidden'}} role="complementary" aria-label="Résumé et notes" aria-hidden={!open} onKeyDown={e=>{if(e.key==='Escape')onClose()}}>
  <div className="sp-rz" onPointerDown={startResize} title="Redimensionner"/>
  <div className="sp-head"><div><h2>Résumé & notes</h2><p>Synchronisé en temps réel · glisse le bord gauche</p></div>
   <button type="button" className="sp-x" onClick={onClose} aria-label="Fermer">✕</button></div>
  <div className="sp-seg">{[['summary','Résumé'],['notes','Notes']].map(([k,l])=><button type="button" key={k} className={tab===k?'on':''} onClick={()=>setTab(k)}>{l}</button>)}</div>
  {ed&&<div className="sp-tools">
   {T(<b>B</b>,()=>f().toggleBold().run(),ed.isActive('bold'),'Gras')}
   {T(<i>I</i>,()=>f().toggleItalic().run(),ed.isActive('italic'),'Italique')}
   {T('•',()=>f().toggleBulletList().run(),ed.isActive('bulletList'),'Liste à puces')}
   {T('☑',()=>f().toggleTaskList().run(),ed.isActive('taskList'),'Cases à cocher')}
   {T('Aa',()=>f().toggleHeading({level:3}).run(),ed.isActive('heading'),'Titre')}</div>}
  <div className="sp-body">{ed&&<EditorContent editor={ed}/>}
   {ed?.isEmpty&&<span className="sp-ph">{tab==='summary'?'Résume en quelques lignes…':'Idées, remarques, choses à faire…'}</span>}</div>
  <div className="sp-foot"><span>{words} mot{words>1?'s':''}</span><span>Échap pour fermer</span></div>
 </div>
}
