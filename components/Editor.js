'use client'
import {useEffect,useState} from 'react'
import * as Y from 'yjs'
import {useEditor,EditorContent,BubbleMenu} from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCursor from '@tiptap/extension-collaboration-cursor'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TextStyle from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import Youtube from '@tiptap/extension-youtube'
import {supabase} from '../lib/supabase'
import {connect,b64,un,colorOf} from '../lib/provider'
import {Cell,HeadCell,LinkCard,Chart,PasteLink,NoteImage,UnderlineMark,ImagePaste} from './extensions'

export default function Editor({id,user}){
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
 return ctx?<Tiptap key={id} {...ctx}/>:<p className="muted">Chargement…</p>
}

function Tiptap({ydoc,provider}){
 const [sp,setSp]=useState(()=>{try{return localStorage.getItem('sp')==='1'}catch{return false}})
 const toggle=v=>{setSp(v);try{localStorage.setItem('sp',v?'1':'0')}catch{}}
 const [hasSum,setHasSum]=useState(false)
 useEffect(()=>{
  const fs=['summary','notes'].map(k=>ydoc.getXmlFragment(k))
  const chk=()=>setHasSum(fs.some(f=>f.toString().replace(/<[^>]*>/g,'').trim().length>0))
  chk();fs.forEach(f=>f.observeDeep(chk));return()=>fs.forEach(f=>f.unobserveDeep(chk))
 },[ydoc])
 const ed=useEditor({immediatelyRender:false,extensions:[StarterKit.configure({history:false}),
  Collaboration.configure({document:ydoc}),
  CollaborationCursor.configure({provider,user:provider.awareness.getLocalState().user}),
  NoteImage,UnderlineMark,ImagePaste,
  TaskList,TaskItem.configure({nested:true}),Table.configure({resizable:true}),TableRow,HeadCell,Cell,
  TextStyle,Color,Highlight.configure({multicolor:true}),Youtube.configure({nocookie:true,width:640,height:360}),LinkCard,Chart,PasteLink]})
 if(!ed)return null
 const f=()=>ed.chain().focus()
 const B=(l,fn,a,t)=><button title={t} className={a?'on':''} onMouseDown={e=>e.preventDefault()} onClick={fn}>{l}</button>
 const tbl=v=>{const c=f();({ins:()=>c.insertTable({rows:3,cols:3,withHeaderRow:true}),'row+':()=>c.addRowAfter(),'col+':()=>c.addColumnAfter(),'row-':()=>c.deleteRow(),'col-':()=>c.deleteColumn(),del:()=>c.deleteTable()})[v]().run()}
 const block=v=>v==='p'?f().setParagraph().run():f().setHeading({level:+v}).run()
 return <>
  <div className={'ed-wrap'+(sp?' shift':'')}>
  <div className="bar">
   <select defaultValue="p" onChange={e=>block(e.target.value)}>
    <option value="p">Texte</option><option value="1">Titre 1</option><option value="2">Titre 2</option><option value="3">Titre 3</option></select>
   {B('•',()=>f().toggleBulletList().run(),ed.isActive('bulletList'),'Liste à puces')}
   {B('1.',()=>f().toggleOrderedList().run(),ed.isActive('orderedList'),'Liste numérotée')}
   {B('☑',()=>f().toggleTaskList().run(),ed.isActive('taskList'),'Cases à cocher')}
   {B('B',()=>f().toggleBold().run(),ed.isActive('bold'),'Gras')}
   {B('I',()=>f().toggleItalic().run(),ed.isActive('italic'),'Italique')}
   {B('U̲',()=>f().toggleMark('underline').run(),ed.isActive('underline'),'Souligner')}
   <label className="cl" title="Couleur du texte"><b style={{color:'#e11d48'}}>A</b><input type="color" defaultValue="#e11d48" onChange={e=>f().setColor(e.target.value).run()}/></label>
   <label className="cl" title="Surligner">🖍<input type="color" defaultValue="#fde047" onChange={e=>f().setHighlight({color:e.target.value}).run()}/></label>
   {B('⌫',()=>f().unsetColor().unsetHighlight().run(),false,'Effacer couleur et surlignage')}
   {B('</>',()=>f().toggleCodeBlock().run(),ed.isActive('codeBlock'),'Bloc de code')}
   {B('❝',()=>f().toggleBlockquote().run(),ed.isActive('blockquote'),'Citation')}
   {B('―',()=>f().setHorizontalRule().run(),false,'Séparateur')}
   <label className="image-upload" title="Insérer une image depuis votre ordinateur">🖼 Image<input type="file" accept="image/*" onChange={e=>{const file=e.target.files?.[0];if(!file)return;const reader=new FileReader();reader.onload=()=>f().insertContent({type:'noteImage',attrs:{src:reader.result,width:600}}).run();reader.readAsDataURL(file);e.target.value=''}}/></label>
   {B('📊',()=>f().insertContent({type:'chart'}).run(),false,'Insérer un graphique')}
   <select value="" onChange={e=>tbl(e.target.value)}><option value="" disabled hidden>▦ Tableau</option>
    <option value="ins">Insérer un tableau 3×3</option><option value="row+">Ajouter une ligne</option><option value="col+">Ajouter une colonne</option>
    <option value="row-">Supprimer la ligne</option><option value="col-">Supprimer la colonne</option><option value="del">Supprimer le tableau</option></select>
   <button type="button" className={'sum-btn'+(sp?' active':'')} title="Résumé et notes de la page" onClick={()=>toggle(!sp)}>
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="2.5" y="3.5" width="15" height="13" rx="3"/><path d="M12.5 3.5v13"/>{sp&&<rect x="12.5" y="3.5" width="5" height="13" rx="2" fill="currentColor" stroke="none" opacity=".35"/>}</svg>
    Résumé{hasSum&&<i title="Cette page a un résumé ou des notes"/>}</button>
  </div>
  <BubbleMenu editor={ed} shouldShow={({editor})=>editor.isActive('table')} tippyOptions={{placement:'top',maxWidth:'none'}}>
   <div className="bm">
    {B('＋ Ligne',()=>f().addRowAfter().run())}{B('＋ Colonne',()=>f().addColumnAfter().run())}
    {B('− Ligne',()=>f().deleteRow().run())}{B('− Colonne',()=>f().deleteColumn().run())}
    {B('⧉ Fusionner / scinder',()=>f().mergeOrSplit().run(),false,'Sélectionne plusieurs cellules en glissant')}
    <label className="cl" title="Fond de la cellule (sélectionnée)">🎨<input type="color" defaultValue="#fde68a" onChange={e=>f().setCellAttribute('background',e.target.value).run()}/></label>
    {B('∅ Fond',()=>f().setCellAttribute('background',null).run())}
    {B('En-tête',()=>f().toggleHeaderRow().run())}
    {B('🗑',()=>f().deleteTable().run(),false,'Supprimer le tableau')}
   </div></BubbleMenu>
  <EditorContent editor={ed}/></div>
  <SidePanel ydoc={ydoc} open={sp} onClose={()=>toggle(false)}/></>
}

// Panneau latéral « Résumé & notes » : 2 zones de texte collaboratives stockées dans le même document que la page
function SidePanel({ydoc,open,onClose}){
 const [tab,setTab]=useState('summary')
 const ed=useEditor({immediatelyRender:false,extensions:[StarterKit.configure({history:false}),
  Collaboration.configure({document:ydoc,field:tab}),TaskList,TaskItem.configure({nested:true})]},[tab])
 useEffect(()=>{if(open&&ed&&!ed.isDestroyed){const t=setTimeout(()=>{try{ed.commands.focus('end')}catch{}},380);return()=>clearTimeout(t)}},[open,tab,ed])
 const words=ed&&!ed.isDestroyed?ed.getText().trim().split(/\s+/).filter(Boolean).length:0
 const f=()=>ed.chain().focus()
 const T=(l,fn,a,t)=><button type="button" title={t} className={a?'on':''} onMouseDown={e=>e.preventDefault()} onClick={fn}>{l}</button>
 return <div className={'sp'+(open?' open':'')} aria-hidden={!open} onKeyDown={e=>{if(e.key==='Escape')onClose()}}>
  <div className="sp-head"><div><h2>Résumé &amp; notes</h2><p>Synchronisé en temps réel</p></div>
   <button type="button" className="sp-x" onClick={onClose} aria-label="Fermer">✕</button></div>
  <div className="sp-seg">{[['summary','Résumé'],['notes','Notes']].map(([k,l])=><button type="button" key={k} className={tab===k?'on':''} onClick={()=>setTab(k)}>{l}</button>)}</div>
  {ed&&<div className="sp-tools">
   {T(<b>B</b>,()=>f().toggleBold().run(),ed.isActive('bold'),'Gras')}
   {T(<i style={{fontFamily:'serif'}}>I</i>,()=>f().toggleItalic().run(),ed.isActive('italic'),'Italique')}
   {T('•',()=>f().toggleBulletList().run(),ed.isActive('bulletList'),'Liste à puces')}
   {T('☑',()=>f().toggleTaskList().run(),ed.isActive('taskList'),'Cases à cocher')}
   {T('Aa',()=>f().toggleHeading({level:3}).run(),ed.isActive('heading'),'Titre')}</div>}
  <div className="sp-body">{ed&&<EditorContent editor={ed}/>}
   {ed?.isEmpty&&<span className="sp-ph">{tab==='summary'?'Résume cette page en quelques lignes…':'Idées, remarques, choses à faire…'}</span>}</div>
  <div className="sp-foot"><span>{words} mot{words>1?'s':''}</span><span>Échap pour fermer</span></div>
 </div>
}
