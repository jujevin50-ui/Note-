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
import {Cell,HeadCell,LinkCard,Chart,PasteLink} from './extensions'

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
 const ed=useEditor({immediatelyRender:false,extensions:[StarterKit.configure({history:false}),
  Collaboration.configure({document:ydoc}),
  CollaborationCursor.configure({provider,user:provider.awareness.getLocalState().user}),
  TaskList,TaskItem.configure({nested:true}),Table.configure({resizable:true}),TableRow,HeadCell,Cell,
  TextStyle,Color,Highlight.configure({multicolor:true}),Youtube.configure({nocookie:true,width:640,height:360}),LinkCard,Chart,PasteLink]})
 if(!ed)return null
 const f=()=>ed.chain().focus()
 const B=(l,fn,a,t)=><button title={t} className={a?'on':''} onMouseDown={e=>e.preventDefault()} onClick={fn}>{l}</button>
 const tbl=v=>{const c=f();({ins:()=>c.insertTable({rows:3,cols:3,withHeaderRow:true}),'row+':()=>c.addRowAfter(),'col+':()=>c.addColumnAfter(),'row-':()=>c.deleteRow(),'col-':()=>c.deleteColumn(),del:()=>c.deleteTable()})[v]().run()}
 const block=v=>v==='p'?f().setParagraph().run():f().setHeading({level:+v}).run()
 return <div>
  <div className="bar">
   <select defaultValue="p" onChange={e=>block(e.target.value)}>
    <option value="p">Texte</option><option value="1">Titre 1</option><option value="2">Titre 2</option><option value="3">Titre 3</option></select>
   {B('•',()=>f().toggleBulletList().run(),ed.isActive('bulletList'),'Liste à puces')}
   {B('1.',()=>f().toggleOrderedList().run(),ed.isActive('orderedList'),'Liste numérotée')}
   {B('☑',()=>f().toggleTaskList().run(),ed.isActive('taskList'),'Cases à cocher')}
   {B('B',()=>f().toggleBold().run(),ed.isActive('bold'),'Gras')}
   {B('I',()=>f().toggleItalic().run(),ed.isActive('italic'),'Italique')}
   <label className="cl" title="Couleur du texte"><b style={{color:'#e11d48'}}>A</b><input type="color" defaultValue="#e11d48" onChange={e=>f().setColor(e.target.value).run()}/></label>
   <label className="cl" title="Surligner">🖍<input type="color" defaultValue="#fde047" onChange={e=>f().setHighlight({color:e.target.value}).run()}/></label>
   {B('⌫',()=>f().unsetColor().unsetHighlight().run(),false,'Effacer couleur et surlignage')}
   {B('</>',()=>f().toggleCodeBlock().run(),ed.isActive('codeBlock'),'Bloc de code')}
   {B('❝',()=>f().toggleBlockquote().run(),ed.isActive('blockquote'),'Citation')}
   {B('―',()=>f().setHorizontalRule().run(),false,'Séparateur')}
   {B('📊',()=>f().insertContent({type:'chart'}).run(),false,'Insérer un graphique')}
   <select value="" onChange={e=>tbl(e.target.value)}><option value="" disabled hidden>▦ Tableau</option>
    <option value="ins">Insérer un tableau 3×3</option><option value="row+">Ajouter une ligne</option><option value="col+">Ajouter une colonne</option>
    <option value="row-">Supprimer la ligne</option><option value="col-">Supprimer la colonne</option><option value="del">Supprimer le tableau</option></select>
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
}
