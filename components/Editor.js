'use client'
import './toolbar.css'
import {useEffect,useState,useRef,useLayoutEffect} from 'react'
import ToolbarIcon from './ToolbarIcon'
import PageOutline from './PageOutline'
import ToolbarPopover from './ToolbarPopover'
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
 const [spw,setSpw]=useState(()=>{try{return Math.max(280,Math.min(720,+localStorage.getItem('spw')||380))}catch{return 380}})
 const [tbPos,setTbPos]=useState(()=>{try{return localStorage.getItem('tbpos')||'center'}catch{return 'center'}})
 useEffect(()=>{
  const sync=()=>{try{setTbPos(localStorage.getItem('tbpos')||'center')}catch{}}
  window.addEventListener('storage',sync)
  window.addEventListener('tbpos-change',sync)
  return()=>{window.removeEventListener('storage',sync);window.removeEventListener('tbpos-change',sync)}
 },[])
 const [hasSum,setHasSum]=useState(false)
 const [pop,setPop]=useState(null)
 const popAnchor=useRef(null)
 const [compact,setCompact]=useState(false)
 useEffect(()=>{
  const media=window.matchMedia('(max-width:900px)')
  const sync=()=>setCompact(media.matches)
  sync();media.addEventListener('change',sync)
  return()=>media.removeEventListener('change',sync)
 },[])
 const vertical=tbPos==='right'&&!compact
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
  TextStyle,Color,Highlight.configure({multicolor:true,HTMLAttributes:{class:'hl'}}),Youtube.configure({nocookie:true,width:640,height:360}),LinkCard,Chart,PasteLink]})
 if(!ed)return null
 const f=()=>ed.chain().focus()
 const B=(l,fn,a,t,extra='')=><button type="button" title={t} aria-label={t} aria-pressed={typeof a==='boolean'?a:undefined} className={(a?'on ':'')+extra} onMouseDown={e=>e.preventDefault()} onClick={fn}>{l}</button>
 const tbl=v=>{const c=f();({ins:()=>c.insertTable({rows:3,cols:3,withHeaderRow:true}),'row+':()=>c.addRowAfter(),'col+':()=>c.addColumnAfter(),'row-':()=>c.deleteRow(),'col-':()=>c.deleteColumn(),del:()=>c.deleteTable()})[v]().run();setPop(null)}
 const block=v=>{v==='p'?f().setParagraph().run():f().setHeading({level:+v}).run();setPop(null)}
 const STYLES=[{v:'p',l:'Texte',s:'15px',w:450},{v:'1',l:'Titre 1',s:'28px',w:700},{v:'2',l:'Titre 2',s:'22px',w:650},{v:'3',l:'Titre 3',s:'18px',w:600}]
 const cur=ed.isActive('heading',{level:1})?'1':ed.isActive('heading',{level:2})?'2':ed.isActive('heading',{level:3})?'3':'p'
 const curStyle=STYLES.find(s=>s.v===cur)
 const INKS=['#1d1d1f','#6e6e73','#007aff','#34c759','#ff9500','#ff3b30','#af52de','#ff2d55']
 const MARKS=[
  {c:'rgba(255,214,10,.42)',l:'Jaune'},
  {c:'rgba(255,159,10,.38)',l:'Orange'},
  {c:'rgba(255,69,58,.32)',l:'Rouge'},
  {c:'rgba(48,209,88,.34)',l:'Vert'},
  {c:'rgba(100,210,255,.38)',l:'Cyan'},
  {c:'rgba(191,90,242,.34)',l:'Violet'},
  {c:'rgba(174,174,178,.36)',l:'Gris'},
 ]
 const CELL_BG=['#fff3a3','#ffe0b2','#ffd0d8','#c8f5d4','#cfe4ff','#ead9ff']
 const openPop=k=>e=>{e.preventDefault();e.stopPropagation();popAnchor.current=e.currentTarget;setPop(pop===k?null:k)}
 const Pop=({children})=><ToolbarPopover anchor={popAnchor.current} vertical={vertical} onClose={()=>setPop(null)}>{children}</ToolbarPopover>
 return <>
  <div className={'ed-wrap'+(sp?' shift':'')+(tbPos==='right'?' tb-right':' tb-center')} style={sp?{'--spw':spw+'px'}:undefined}>
  <div className="toolbar-rail"><div className="bar" role="toolbar" aria-label="Mise en forme du document" aria-orientation={vertical?'vertical':'horizontal'}>
   <div className="tb-slot">
    <button type="button" className={'tb-trigger'+(pop==='style'?' open':'')} onMouseDown={e=>e.preventDefault()} onClick={openPop('style')} title="Style de paragraphe" aria-label="Style de paragraphe" aria-expanded={pop==='style'} aria-haspopup="dialog">
     <ToolbarIcon name="style"/><span className="toolbar-label">{curStyle.l}</span><i className="tb-caret"/>
    </button>
    {pop==='style'&&<Pop><div className="tb-menu tb-styles">
     <p className="tb-cap">Style</p>
     {STYLES.map(s=><button type="button" key={s.v} className={'tb-style'+(cur===s.v?' on':'')} onClick={e=>{e.preventDefault();block(s.v)}}>
      <span style={{fontSize:s.s,fontWeight:s.w}}>{s.l}</span>
      {cur===s.v&&<em>✓</em>}
     </button>)}
    </div></Pop>}
   </div>
   <span className="tb-sep"/>
   <div className="toolbar-group" role="group" aria-label="Listes">{B(<ToolbarIcon name="bullet"/>,()=>f().toggleBulletList().run(),ed.isActive('bulletList'),'Liste à puces','tb-ico')}
   {B(<ToolbarIcon name="ordered"/>,()=>f().toggleOrderedList().run(),ed.isActive('orderedList'),'Liste numérotée','tb-ico')}
   {B(<ToolbarIcon name="task"/>,()=>f().toggleTaskList().run(),ed.isActive('taskList'),'Cases à cocher','tb-ico')}</div>
   <span className="tb-sep"/>
   <div className="toolbar-group" role="group" aria-label="Format du texte">{B(<ToolbarIcon name="bold"/>,()=>f().toggleBold().run(),ed.isActive('bold'),'Gras','tb-b')}
   {B(<ToolbarIcon name="italic"/>,()=>f().toggleItalic().run(),ed.isActive('italic'),'Italique','tb-i')}
   {B(<ToolbarIcon name="underline"/>,()=>f().toggleMark('underline').run(),ed.isActive('underline'),'Souligner','tb-u')}</div>
   <span className="tb-sep"/>
   <div className="tb-slot">
    <button type="button" className={'tb-swatch'+(pop==='ink'?' open':'')} aria-label="Couleur du texte" aria-expanded={pop==='ink'} aria-haspopup="dialog" title="Couleur du texte" onMouseDown={e=>e.preventDefault()} onClick={openPop('ink')}>
     <b>A</b><u style={{background:ed.getAttributes('textStyle').color||'#e11d48'}}/>
    </button>
    {pop==='ink'&&<Pop><div className="tb-menu tb-colors">
     <p className="tb-cap">Couleur du texte</p>
     <div className="tb-dots">{INKS.map(c=><button type="button" key={c} className="tb-dot" style={{background:c}} title={c} onClick={e=>{e.preventDefault();f().setColor(c).run();setPop(null)}}/>)}</div>
     <label className="tb-custom">Personnalisée<input type="color" onChange={e=>f().setColor(e.target.value).run()}/></label>
     <button type="button" className="tb-clear" onClick={e=>{e.preventDefault();f().unsetColor().run();setPop(null)}}>Couleur par défaut</button>
    </div></Pop>}
   </div>
   <div className="tb-slot">
    <button type="button" className={'tb-swatch'+(pop==='mark'?' open':'')} aria-label="Surligner" aria-expanded={pop==='mark'} aria-haspopup="dialog" title="Surligner" onMouseDown={e=>e.preventDefault()} onClick={openPop('mark')}>
     <ToolbarIcon name="highlight"/>
     <u style={{background:'#ffe14a'}}/>
    </button>
    {pop==='mark'&&<Pop><div className="tb-menu tb-colors">
     <p className="tb-cap">Surlignage</p>
     <div className="tb-hl-grid">{MARKS.map(m=><button type="button" key={m.l} className="tb-hl-chip" title={m.l} onClick={e=>{e.preventDefault();f().setHighlight({color:m.c}).run();setPop(null)}}>
      <i style={{background:m.c}}/><span>{m.l}</span>
     </button>)}</div>
     <button type="button" className="tb-clear" onClick={e=>{e.preventDefault();f().unsetHighlight().run();setPop(null)}}>Retirer le surlignage</button>
    </div></Pop>}
   </div>
   <span className="tb-sep"/>
   {B(<ToolbarIcon name="code"/>,()=>f().toggleCodeBlock().run(),ed.isActive('codeBlock'),'Bloc de code','tb-code')}
   {B(<ToolbarIcon name="quote"/>,()=>f().toggleBlockquote().run(),ed.isActive('blockquote'),'Citation','tb-ico')}
   {B(<ToolbarIcon name="rule"/>,()=>f().setHorizontalRule().run(),false,'Séparateur','tb-ico')}
   <label className="image-upload" title="Insérer une image depuis votre ordinateur"><ToolbarIcon name="image"/><span className="toolbar-label">Image</span><input aria-label="Insérer une image" type="file" accept="image/*" onChange={e=>{const file=e.target.files?.[0];if(!file)return;const reader=new FileReader();reader.onload=()=>f().insertContent({type:'noteImage',attrs:{src:reader.result,width:600}}).run();reader.readAsDataURL(file);e.target.value=''}}/></label>
   <label className="image-upload" title="Insérer un PDF dans la note"><ToolbarIcon name="pdf"/><span className="toolbar-label">PDF</span><input aria-label="Insérer un PDF" type="file" accept="application/pdf" onChange={async e=>{
    const file=e.target.files?.[0];e.target.value=''
    if(!file)return
    if(!projectId){alert('Projet introuvable');return}
    const key=projectId+'/embed-'+crypto.randomUUID()+'.pdf'
    const {error}=await supabase.storage.from('pdfs').upload(key,file,{contentType:'application/pdf',upsert:false})
    if(error){alert('Envoi du PDF impossible : '+error.message);return}
    f().insertContent([{type:'notePdf',attrs:{src:key,name:file.name,width:640,align:'left'}},{type:'paragraph'}]).run()
   }}/></label>
   {B(<ToolbarIcon name="chart"/>,()=>f().insertContent({type:'chart'}).run(),false,'Insérer un graphique','tb-word')}
   <div className="tb-slot">
    <button type="button" className={'tb-trigger tb-word'+(pop==='table'?' open':'')} onMouseDown={e=>e.preventDefault()} onClick={openPop('table')} title="Tableau" aria-label="Tableau" aria-expanded={pop==='table'} aria-haspopup="dialog">
     <ToolbarIcon name="table"/><span className="toolbar-label">Tableau</span><i className="tb-caret"/>
    </button>
    {pop==='table'&&<Pop><div className="tb-menu">
     <p className="tb-cap">Tableau</p>
     {[['ins','Insérer un tableau 3×3'],['row+','Ajouter une ligne'],['col+','Ajouter une colonne'],['row-','Supprimer la ligne'],['col-','Supprimer la colonne'],['del','Supprimer le tableau']].map(([v,l])=>
      <button type="button" key={v} className={'tb-item'+(v==='del'?' danger':'')} onClick={e=>{e.preventDefault();tbl(v)}}>{l}</button>)}
    </div></Pop>}
   </div>
   <button type="button" className={'sum-btn'+(sp?' active':'')} aria-label="Résumé et notes de la page" aria-pressed={sp} title="Résumé et notes de la page" onClick={()=>toggle(!sp)}>
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="2.5" y="3.5" width="15" height="13" rx="3"/><path d="M12.5 3.5v13"/>{sp&&<rect x="12.5" y="3.5" width="5" height="13" rx="2" fill="currentColor" stroke="none" opacity=".35"/>}</svg>
    <span className="toolbar-label">Résumé</span>{hasSum&&<i title="Cette page a un résumé ou des notes"/>}</button>
  </div></div>
  <BubbleMenu editor={ed} shouldShow={({editor})=>editor.isActive('table')} tippyOptions={{placement:'top',maxWidth:'none'}}>
   <div className="bm" onMouseDown={e=>e.preventDefault()}>
    {B('＋ Ligne',()=>f().addRowAfter().run())}{B('＋ Colonne',()=>f().addColumnAfter().run())}
    {B('− Ligne',()=>f().deleteRow().run())}{B('− Colonne',()=>f().deleteColumn().run())}
    {B('Fusionner',()=>f().mergeOrSplit().run(),false,'Sélectionne plusieurs cellules en glissant')}
    <span className="tb-sep"/>
    {CELL_BG.map(c=><button type="button" key={c} className="tb-dot tb-dot-hi" style={{background:c}} title="Fond de cellule" onClick={e=>{e.preventDefault();f().setCellAttribute('background',c).run()}}/>)}
    {B('∅',()=>f().setCellAttribute('background',null).run(),false,'Retirer le fond')}
    {B('En-tête',()=>f().toggleHeaderRow().run(),false,'Ligne d’en-tête')}
    {B('Suppr.',()=>f().deleteTable().run(),false,'Supprimer le tableau')}
   </div></BubbleMenu>
  <PageOutline editor={ed}/>
  <EditorContent className="editor-content" editor={ed}/></div>
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
