'use client'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import ToolbarIcon from './ToolbarIcon'
import ToolbarPopover from './ToolbarPopover'
import './toolbar.css'

export default function RichTextToolbar({ editor: ed, projectId, vertical = false, extraActions }) {
 const [pop,setPop]=useState(null)
 const popAnchor=useRef(null)
 const [,redraw]=useState(0)
 useEffect(()=>{if(!ed)return;const update=()=>redraw(value=>value+1);ed.on('transaction',update);return()=>ed.off('transaction',update)},[ed])
 useEffect(()=>{
  if(!pop)return
  const close=()=>setPop(null)
  const timer=setTimeout(()=>document.addEventListener('mousedown',close),0)
  return()=>{clearTimeout(timer);document.removeEventListener('mousedown',close)}
 },[pop])
 if(!ed||ed.isDestroyed)return null
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
 const openPop=k=>e=>{e.preventDefault();e.stopPropagation();popAnchor.current=e.currentTarget;setPop(pop===k?null:k)}
 const Pop=({children})=><ToolbarPopover anchor={popAnchor.current} vertical={vertical} onClose={()=>setPop(null)}>{children}</ToolbarPopover>
 return (
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
   <select aria-label="Taille du texte" title="Taille du texte" value={ed.getAttributes('textStyle').fontSize||'15px'} onChange={e=>f().setMark('textStyle',{fontSize:e.target.value}).run()}>{[12,14,15,16,18,20,24,28,32,40].map(size=><option key={size} value={size+'px'}>{size} px</option>)}</select>
   <select aria-label="Alignement du texte" title="Alignement du texte" value={ed.getAttributes('paragraph').textAlign||ed.getAttributes('heading').textAlign||'left'} onChange={e=>f().setTextAlign(e.target.value).run()}><option value="left">À gauche</option><option value="center">Centré</option><option value="right">À droite</option><option value="justify">Justifié</option></select>
   <span className="tb-sep"/>
   <div className="toolbar-group" role="group" aria-label="Listes">{B(<ToolbarIcon name="bullet"/>,()=>f().toggleBulletList().run(),ed.isActive('bulletList'),'Liste à puces','tb-ico')}
   {B(<ToolbarIcon name="ordered"/>,()=>f().toggleOrderedList().run(),ed.isActive('orderedList'),'Liste numérotée','tb-ico')}
   {B(<ToolbarIcon name="task"/>,()=>f().toggleTaskList().run(),ed.isActive('taskList'),'Cases à cocher','tb-ico')}</div>
   <span className="tb-sep"/>
   <div className="toolbar-group" role="group" aria-label="Format du texte">{B(<ToolbarIcon name="bold"/>,()=>f().toggleBold().run(),ed.isActive('bold'),'Gras','tb-b')}
   {B(<ToolbarIcon name="italic"/>,()=>f().toggleItalic().run(),ed.isActive('italic'),'Italique','tb-i')}
   {B(<ToolbarIcon name="underline"/>,()=>f().toggleMark('underline').run(),ed.isActive('underline'),'Souligner','tb-u')}{B(<s>S</s>,()=>f().toggleStrike().run(),ed.isActive('strike'),'Barré')}</div>
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
   <label className="image-upload" title="Insérer une image depuis votre ordinateur"><ToolbarIcon name="image"/><span className="toolbar-label">Image</span><input aria-label="Insérer une image" type="file" accept="image/*" onChange={e=>{const file=e.target.files?.[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{if(ed.isDestroyed)return;f().insertContent({type:'noteImage',attrs:{src:reader.result,width:600}}).run()};reader.readAsDataURL(file);e.target.value=''}}/></label>
   <label className="image-upload" title="Insérer un PDF dans la note"><ToolbarIcon name="pdf"/><span className="toolbar-label">PDF</span><input aria-label="Insérer un PDF" type="file" accept="application/pdf" onChange={async e=>{
    const file=e.target.files?.[0];e.target.value=''
    if(!file)return
    if(!projectId){alert('Projet introuvable');return}
    const key=projectId+'/embed-'+crypto.randomUUID()+'.pdf'
    const {error}=await supabase.storage.from('pdfs').upload(key,file,{contentType:'application/pdf',upsert:false})
    if(error){alert('Envoi du PDF impossible : '+error.message);return}
    if(ed.isDestroyed)return
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
   {extraActions}
  </div></div>
 )
}
