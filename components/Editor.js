'use client'
import {useEffect,useState} from 'react'
import * as Y from 'yjs'
import {useEditor,EditorContent} from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCursor from '@tiptap/extension-collaboration-cursor'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import {supabase} from '../lib/supabase'
import {connect,b64,un} from '../lib/provider'

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
   const h=[...user.email].reduce((a,x)=>a+x.charCodeAt(0),0)*37%360
   c=connect(id,ydoc,{name:user.email.split('@')[0],color:`hsl(${h},70%,45%)`})
   ydoc.on('update',()=>{dirty=true;clearTimeout(t);t=setTimeout(save,800)})
   setCtx({ydoc,provider:c})
  })()
  return()=>{off=true;clearTimeout(t);save();c?.destroy();setCtx(null)}
 },[id])
 return ctx?<Tiptap key={id} {...ctx}/>:<p className="muted">Chargement…</p>
}

function Tiptap({ydoc,provider}){
 const ed=useEditor({immediatelyRender:false,extensions:[StarterKit.configure({history:false}),
  Collaboration.configure({document:ydoc}),
  CollaborationCursor.configure({provider,user:provider.awareness.getLocalState().user}),
  TaskList,TaskItem.configure({nested:true}),Table.configure({resizable:true}),TableRow,TableHeader,TableCell]})
 if(!ed)return null
 const f=()=>ed.chain().focus()
 const B=(l,fn,a)=><button className={a?'on':''} onClick={fn}>{l}</button>
 const tbl=v=>{const c=f();({ins:()=>c.insertTable({rows:3,cols:3,withHeaderRow:true}),'row+':()=>c.addRowAfter(),'col+':()=>c.addColumnAfter(),'row-':()=>c.deleteRow(),'col-':()=>c.deleteColumn(),del:()=>c.deleteTable()})[v]().run()}
 const block=v=>v==='p'?f().setParagraph().run():f().setHeading({level:+v}).run()
 return <div>
  <div className="bar">
   <select defaultValue="p" onChange={e=>block(e.target.value)}>
    <option value="p">Texte</option><option value="1">Titre 1</option><option value="2">Titre 2</option><option value="3">Titre 3</option></select>
   <select value="" onChange={e=>tbl(e.target.value)}><option value="" disabled hidden>▦ Tableau</option>
    <option value="ins">Insérer un tableau 3×3</option><option value="row+">Ajouter une ligne</option><option value="col+">Ajouter une colonne</option>
    <option value="row-">Supprimer la ligne</option><option value="col-">Supprimer la colonne</option><option value="del">Supprimer le tableau</option></select>
   {B('•',()=>f().toggleBulletList().run(),ed.isActive('bulletList'))}
   {B('1.',()=>f().toggleOrderedList().run(),ed.isActive('orderedList'))}
   {B('☑',()=>f().toggleTaskList().run(),ed.isActive('taskList'))}
   {B('B',()=>f().toggleBold().run(),ed.isActive('bold'))}
   {B('I',()=>f().toggleItalic().run(),ed.isActive('italic'))}
   {B('</>',()=>f().toggleCodeBlock().run(),ed.isActive('codeBlock'))}
   {B('❝',()=>f().toggleBlockquote().run(),ed.isActive('blockquote'))}
  </div>
  <EditorContent editor={ed}/></div>
}
