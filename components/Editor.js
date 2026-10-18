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
import {Cell,HeadCell,LinkCard,Chart,PasteLink,NoteImage,NotePdf,UnderlineMark,ImagePaste} from './extensions'

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
 const [hasSum,setHasSum]=useState(false)
 const [pop,setPop]=useState(null)
 useEffect(()=>{
  if(!pop)return
  const close=()=>setPop(null)
  const t=setTimeout(()=>document.addEventListener('mousedown',close),0)
  return()=>{clearTimeout(t);document.removeEventListener('mousedown',close)}
 },[pop])
 useEffect(()=>{
  const fs=['summary','notes'].map(k=>ydoc.getXmlFragment(k))
  const chk=()=>setHasSum(fs.some(f=>f.toString().replace(/<[^>]*>/g,'').trim().length>0))
  chk();fs.forEach(f=>f.observeDeep(chk));return()=>fs.forEach(f=>f.unobserveDeep(chk))
 },[ydoc])
 const ed=useEditor({immediatelyRender:false,extensions:[StarterKit.configure({history:false}),
  Collaboration.configure({document:ydoc}),
  CollaborationCursor.configure({provider,user:provider.awareness.getLocalState().user}),
  NoteImage,NotePdf,UnderlineMark,ImagePaste,
  TaskList,TaskItem.configure({nested:true}),Table.configure({resizable:true}),TableRow,HeadCell,Cell,
  TextStyle,Color,Highlight.configure({multicolor:true}),Youtube.configure({nocookie:true,width:640,height:360}),LinkCard,Chart,PasteLink]})
 if(!ed)return null
 const f=()=>ed.chain().focus()
 const B=(l,fn,a,t,extra='')=><button type="button" title={t} className={(a?'on ':'')+extra} onMouseDown={e=>e.preventDefault()} onClick={fn}>{l}</button>
 const tbl=v=>{const c=f();({ins:()=>c.insertTable({rows:3,cols:3,withHeaderRow:true}),'row+':()=>c.addRowAfter(),'col+':()=>c.addColumnAfter(),'row-':()=>c.deleteRow(),'col-':()=>c.deleteColumn(),del:()=>c.deleteTable()})[v]().run();setPop(null)}
 const block=v=>{v==='p'?f().setParagraph().run():f().setHeading({level:+v}).run();setPop(null)}
 const STYLES=[{v:'p',l:'Texte',s:'15px',w:450},{v:'1',l:'Titre 1',s:'28px',w:700},{v:'2',l:'Titre 2',s:'22px',w:650},{v:'3',l:'Titre 3',s:'18px',w:600}]
 const cur=ed.isActive('heading',{level:1})?'1':ed.isActive('heading',{level:2})?'2':ed.isActive('heading',{level:3})?'3':'p'
 const curStyle=STYLES.find(s=>s.v===cur)
 const INKS=['#1d1d1f','#6e6e73','#007aff','#34c759','#ff9500','#ff3b30','#af52de','#ff2d55']
 const MARKS=['#fff3a3','#ffe0b2','#ffd0d8','#c8f5d4','#cfe4ff','#ead9ff','#f2f2f7','#ffffff']
 const openPop=k=>e=>{e.preventDefault();e.stopPropagation();setPop(pop===k?null:k)}
 const Pop=({children})=><div className="tb-pop" onMouseDown={e=>e.stopPropagation()}>{children}</div>
 return <>
  <div className={'ed-wrap'+(sp?' shift':'')}>
  <div className="bar">
   <div className="tb-slot">
    <button type="button" className={'tb-trigger'+(pop==='style'?' open':'')} onMouseDown={openPop('style')} title="Style de paragraphe">
     <span>{curStyle.l}</span><i className="tb-caret"/>
    </button>
    {pop==='style'&&<Pop><div className="tb-menu tb-styles">
     <p className="tb-cap">Style</p>
     {STYLES.map(s=><button type="button" key={s.v} className={'tb-style'+(cur===s.v?' on':'')} onClick={()=>block(s.v)}>
      <span style={{fontSize:s.s,fontWeight:s.w}}>{s.l}</span>
      {cur===s.v&&<em>✓</em>}
     </button>)}
    </div></Pop>}
   </div>
   <span className="tb-sep"/>
   {B('•',()=>f().toggleBulletList().run(),ed.isActive('bulletList'),'Liste à puces','tb-ico')}
   {B('1.',()=>f().toggleOrderedList().run(),ed.isActive('orderedList'),'Liste numérotée','tb-ico')}
   {B('☑',()=>f().toggleTaskList().run(),ed.isActive('taskList'),'Cases à cocher','tb-ico')}
   <span className="tb-sep"/>
   {B('B',()=>f().toggleBold().run(),ed.isActive('bold'),'Gras','tb-b')}
   {B('I',()=>f().toggleItalic().run(),ed.isActive('italic'),'Italique','tb-i')}
   {B('U',()=>f().toggleMark('underline').run(),ed.isActive('underline'),'Souligner','tb-u')}
   <span className="tb-sep"/>
   <div className="tb-slot">
    <button type="button" className={'tb-swatch'+(pop==='ink'?' open':'')} title="Couleur du texte" onMouseDown={openPop('ink')}>
     <b>A</b><u style={{background:ed.getAttributes('textStyle').color||'#e11d48'}}/>
    </button>
    {pop==='ink'&&<Pop><div className="tb-menu tb-colors">
     <p className="tb-cap">Couleur du texte</p>
     <div className="tb-dots">{INKS.map(c=><button type="button" key={c} className="tb-dot" style={{background:c}} title={c} onClick={()=>{f().setColor(c).run();setPop(null)}}/>)}</div>
     <label className="tb-custom">Personnalisée<input type="color" onChange={e=>f().setColor(e.target.value).run()}/></label>
     <button type="button" className="tb-clear" onClick={()=>{f().unsetColor().run();setPop(null)}}>Couleur par défaut</button>
    </div></Pop>}
   </div>
   <div className="tb-slot">
    <button type="button" className={'tb-swatch'+(pop==='mark'?' open':'')} title="Surligner" onMouseDown={openPop('mark')}>
     <span className="tb-pen"/>
     <u style={{background:'#ffe14a'}}/>
    </button>
    {pop==='mark'&&<Pop><div className="tb-menu tb-colors">
     <p className="tb-cap">Surlignage</p>
     <div className="tb-dots">{MARKS.map(c=><button type="button" key={c} className="tb-dot tb-dot-hi" style={{background:c}} title={c} onClick={()=>{f().setHighlight({color:c}).run();setPop(null)}}/>)}</div>
     <label className="tb-custom">Personnalisée<input type="color" defaultValue="#fde047" onChange={e=>f().setHighlight({color:e.target.value}).run()}/></label>
     <button type="button" className="tb-clear" onClick={()=>{f().unsetHighlight().run();setPop(null)}}>Retirer le surlignage</button>
    </div></Pop>}
   </div>
   <span className="tb-sep"/>
   {B('</>',()=>f().toggleCodeBlock().run(),ed.isActive('codeBlock'),'Bloc de code','tb-code')}
   {B('❝',()=>f().toggleBlockquote().run(),ed.isActive('blockquote'),'Citation','tb-ico')}
   {B('—',()=>f().setHorizontalRule().run(),false,'Séparateur','tb-ico')}
   <label className="image-upload" title="Insérer une image depuis votre ordinateur">Image<input type="file" accept="image/*" onChange={e=>{const file=e.target.files?.[0];if(!file)return;const reader=new FileReader();reader.onload=()=>f().insertContent({type:'noteImage',attrs:{src:reader.result,width:600}}).run();reader.readAsDataURL(file);e.target.value=''}}/></label>
   <label className="image-upload" title="Insérer un PDF dans la note">PDF<input type="file" accept="application/pdf" onChange={async e=>{
    const file=e.target.files?.[0];e.target.value=''
    if(!file)return
    if(!projectId){alert('Projet introuvable');return}
    const key=projectId+'/embed-'+crypto.randomUUID()+'.pdf'
    const {error}=await supabase.storage.from('pdfs').upload(key,file,{contentType:'application/pdf',upsert:false})
    if(error){alert('Envoi du PDF impossible : '+error.message);return}
    f().insertContent([{type:'notePdf',attrs:{src:key,name:file.name}},{type:'paragraph'}]).run()
   }}/></label>
   {B('Graphique',()=>f().insertContent({type:'chart'}).run(),false,'Insérer un graphique','tb-word')}
   <div className="tb-slot">
    <button type="button" className={'tb-trigger tb-word'+(pop==='table'?' open':'')} onMouseDown={openPop('table')} title="Tableau">
     <span>Tableau</span><i className="tb-caret"/>
    </button>
    {pop==='table'&&<Pop><div className="tb-menu">
     <p className="tb-cap">Tableau</p>
     {[['ins','Insérer un tableau 3×3'],['row+','Ajouter une ligne'],['col+','Ajouter une colonne'],['row-','Supprimer la ligne'],['col-','Supprimer la colonne'],['del','Supprimer le tableau']].map(([v,l])=>
      <button type="button" key={v} className={'tb-item'+(v==='del'?' danger':'')} onClick={()=>tbl(v)}>{l}</button>)}
    </div></Pop>}
   </div>
   <button type="button" className={'sum-btn'+(sp?' active':'')} title="Résumé et notes de la page" onClick={()=>toggle(!sp)}>
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="2.5" y="3.5" width="15" height="13" rx="3"/><path d="M12.5 3.5v13"/>{sp&&<rect x="12.5" y="3.5" width="5" height="13" rx="2" fill="currentColor" stroke="none" opacity=".35"/>}</svg>
    Résumé{hasSum&&<i title="Cette page a un résumé ou des notes"/>}</button>
  </div>
  <BubbleMenu editor={ed} shouldShow={({editor})=>editor.isActive('table')} tippyOptions={{placement:'top',maxWidth:'none'}}>
   <div className="bm">
    {B('＋ Ligne',()=>f().addRowAfter().run())}{B('＋ Colonne',()=>f().addColumnAfter().run())}
    {B('− Ligne',()=>f().deleteRow().run())}{B('− Colonne',()=>f().deleteColumn().run())}
    {B('Fusionner',()=>f().mergeOrSplit().run(),false,'Sélectionne plusieurs cellules en glissant')}
    <span className="tb-sep"/>
    {MARKS.slice(0,6).map(c=><button type="button" key={c} className="tb-dot tb-dot-hi" style={{background:c}} title="Fond de cellule" onMouseDown={e=>e.preventDefault()} onClick={()=>f().setCellAttribute('background',c).run()}/>)}
    {B('∅',()=>f().setCellAttribute('background',null).run(),false,'Retirer le fond')}
    {B('En-tête',()=>f().toggleHeaderRow().run(),false,'Ligne d’en-tête')}
    {B('Suppr.',()=>f().deleteTable().run(),false,'Supprimer le tableau')}
   </div></BubbleMenu>
  <EditorContent editor={ed}/></div>
  <SidePanel ydoc={ydoc} open={sp} onClose={()=>toggle(false)}/></>
}

export function SidePanel({ydoc,open,onClose}){
 const [tab,setTab]=useState('summary')
 const ed=useEditor({immediatelyRender:false,extensions:[StarterKit.configure({history:false}),
  Collaboration.configure({document:ydoc,field:tab}),TaskList,TaskItem.configure({nested:true})]},[tab])
 useEffect(()=>{if(open&&ed&&!ed.isDestroyed){const t=setTimeout(()=>{try{ed.commands.focus('end')}catch{}},380);return()=>clearTimeout(t)}},[open,tab,ed])
 const words=ed&&!ed.isDestroyed?ed.getText().trim().split(/\s+/).filter(Boolean).length:0
 const f=()=>ed.chain().focus()
 const T=(l,fn,a,t)=><button type="button" title={t} className={a?'on':''} onMouseDown={e=>e.preventDefault()} onClick={fn}>{l}</button>
 return <div className={'sp'+(open?' open':'')} aria-hidden={!open} onKeyDown={e=>{if(e.key==='Escape')onClose()}}>
  <div className="sp-head"><div><h2>Résumé & notes</h2><p>Synchronisé en temps réel</p></div>
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
