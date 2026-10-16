'use client'
import {useEffect,useRef,useState} from 'react'
import {Node,Mark,Extension} from '@tiptap/core'
import {Plugin} from '@tiptap/pm/state'
import {ReactNodeViewRenderer,NodeViewWrapper} from '@tiptap/react'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import {supabase} from '../lib/supabase'

// Fond de cellule de tableau
const bg={background:{default:null,parseHTML:el=>el.style.backgroundColor||null,renderHTML:a=>a.background?{style:`background-color:${a.background}`}:{}}}
export const Cell=TableCell.extend({addAttributes(){return{...this.parent?.(),...bg}}})
export const HeadCell=TableHeader.extend({addAttributes(){return{...this.parent?.(),...bg}}})

// Carte d'aperçu de lien
export const LinkCard=Node.create({name:'linkCard',group:'block',atom:true,draggable:true,
 addAttributes(){return{url:{default:''},title:{default:''},desc:{default:''},image:{default:''},site:{default:''}}},
 parseHTML(){return[{tag:'a.lc',getAttrs:el=>({url:el.getAttribute('href'),title:el.dataset.title,desc:el.dataset.desc,image:el.dataset.image,site:el.dataset.site})}]},
 renderHTML({node:{attrs:a}}){return['a',{class:'lc',href:a.url,target:'_blank',rel:'noopener noreferrer','data-title':a.title,'data-desc':a.desc,'data-image':a.image,'data-site':a.site},
  ...(a.image?[['img',{src:a.image,alt:''}]]:[]),['div',['b',a.title],['span',a.desc],['small',a.site]]]}})

// Coller un lien seul => carte d'aperçu (YouTube est géré par l'extension Youtube)
export const PasteLink=Extension.create({name:'pasteLink',addProseMirrorPlugins(){const ed=this.editor;return[new Plugin({props:{
 handlePaste(view,e){
  const t=(e.clipboardData?.getData('text/plain')||'').trim()
  if(!/^https?:\/\/\S+$/.test(t)||/youtu\.?be/.test(t))return false
  supabase.auth.getSession().then(({data})=>fetch('/api/preview?url='+encodeURIComponent(t),{headers:{Authorization:'Bearer '+data.session?.access_token}}))
   .then(r=>r.json()).then(d=>{if(d.error)throw 0;ed.chain().focus().insertContent({type:'linkCard',attrs:{url:t,title:d.title,desc:d.desc,image:d.image,site:d.site}}).run()})
   .catch(()=>ed.chain().focus().insertContent({type:'text',text:t,marks:[{type:'link',attrs:{href:t}}]}).run())
  return true},
 handleClick(view,pos,e){const a=e.target.closest&&e.target.closest('a.lc');if(a){window.open(a.href,'_blank','noopener');return true}return false}}})]}})

// Graphique (anneau / barres / courbe) — style dashboard sombre, redimensionnable comme une image
const PAL=['#29a9f0','#22c55e','#8b3adb','#f97316','#ef4444','#22c6c6','#facc15']
const rid=()=>Math.random().toString(36).slice(2,8)
const nf=(v,d)=>new Intl.NumberFormat('fr-FR',{minimumFractionDigits:d,maximumFractionDigits:d}).format(+v||0)
const NB='\u00a0'
function ChartView({node,updateAttributes,deleteNode,selected,editor,getPos}){
 const [edit,setEdit]=useState(()=>{try{return !(JSON.parse(node.attrs.data)||[]).length}catch{return false}})
 const {type,title,subtitle,unit,label}=node.attrs,align=node.attrs.align||'left'
 let D=[];try{D=JSON.parse(node.attrs.data)||[]}catch{}
 const set=d=>updateAttributes({data:JSON.stringify(d)})
 const row=(i,p)=>set(D.map((x,k)=>k===i?{...x,...p}:x))
 const tot=D.reduce((a,d)=>a+(+d.v||0),0),u=unit?NB+unit:''
 const C=130,ro=108,ri=76,pad=.035+5/((ro+ri)/2)
 const P=(r,a)=>[C+r*Math.cos(a),C+r*Math.sin(a)]
 const sec=(a0,a1)=>{const [x0,y0]=P(ro,a0),[x1,y1]=P(ro,a1),[x2,y2]=P(ri,a1),[x3,y3]=P(ri,a0),L=a1-a0>Math.PI?1:0
  return `M${x0},${y0}A${ro},${ro} 0 ${L} 1 ${x1},${y1}L${x2},${y2}A${ri},${ri} 0 ${L} 0 ${x3},${y3}Z`}
 const glow=c=>({filter:`drop-shadow(0 0 7px ${c}99)`})
 const donut=()=>{let a0=Math.PI;const full=D.filter(d=>+d.v>0).length<2
  return <svg viewBox="0 0 260 260" className="chart-svg" style={{overflow:'visible'}}>
   {tot<=0?<circle cx={C} cy={C} r={(ro+ri)/2} fill="none" stroke="#26272b" strokeWidth={ro-ri+10}/>
   :full?<circle cx={C} cy={C} r={(ro+ri)/2} fill="none" stroke={(D.find(d=>+d.v>0)||{}).c||PAL[0]} strokeWidth={ro-ri+10} style={glow((D.find(d=>+d.v>0)||{}).c||PAL[0])}/>
   :D.map((d,i)=>{const v=+d.v||0;if(v<=0)return null;const span=v/tot*2*Math.PI;let s=a0+pad,e=a0+span-pad;if(e-s<.03){const m=a0+span/2;s=m-.015;e=m+.015}
    a0+=span;return <path key={d.id||i} d={sec(s,e)} fill={d.c} stroke={d.c} strokeWidth="10" strokeLinejoin="round" style={glow(d.c)}/>})}
   {D.length?<text x={C} y={C+4} textAnchor="middle" fontSize="30" fontWeight="700" fill="#fff">{nf(tot,tot>=100?0:2)}{u}</text>:<text x={C} y={C+5} textAnchor="middle" fontSize="14" fill="#8a8f98">Aucune donnée</text>}
   {D.length>0&&label&&<text x={C} y={C+34} textAnchor="middle" fontSize="11" letterSpacing="2" fill="#8a8f98">{label.toUpperCase()}</text>}
  </svg>}
 const W=480,H=240,bw=(W-40)/(D.length||1),max=Math.max(1,...D.map(d=>+d.v||0)),y=v=>H-40-((+v||0)/max)*(H-80)
 const lab=(d,i)=><text key={'t'+i} x={30+(i+.5)*bw} y={H-16} textAnchor="middle" fontSize="12" fill="#8a8f98">{d.l}</text>
 const val=v=>nf(v,Number.isInteger(+v)?0:2)
 const bars=()=><svg viewBox={`0 0 ${W} ${H}`} className="chart-svg"><line x1="20" x2={W-10} y1={H-40} y2={H-40} stroke="#2a2b30"/>
  {D.map((d,i)=><g key={i}><rect x={30+i*bw+bw*.18} y={y(d.v)} width={bw*.64} height={Math.max(2,H-40-y(d.v))} rx="8" fill={d.c} style={glow(d.c)}/>
   <text x={30+(i+.5)*bw} y={y(d.v)-8} textAnchor="middle" fontSize="12" fontWeight="600" fill="#fff">{val(d.v)}</text>{lab(d,i)}</g>)}</svg>
 const line=()=><svg viewBox={`0 0 ${W} ${H}`} className="chart-svg"><line x1="20" x2={W-10} y1={H-40} y2={H-40} stroke="#2a2b30"/>
  <polyline fill="none" stroke={(D[0]||{}).c||PAL[0]} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" style={glow((D[0]||{}).c||PAL[0])} points={D.map((d,i)=>`${30+(i+.5)*bw},${y(d.v)}`).join(' ')}/>
  {D.map((d,i)=><g key={i}><circle cx={30+(i+.5)*bw} cy={y(d.v)} r="6" fill={d.c} stroke="#0e0e10" strokeWidth="2" style={glow(d.c)}/>
   <text x={30+(i+.5)*bw} y={y(d.v)-14} textAnchor="middle" fontSize="12" fontWeight="600" fill="#fff">{val(d.v)}</text>{lab(d,i)}</g>)}</svg>
 const inp=(k,ph,st)=><input type="text" defaultValue={node.attrs[k]} placeholder={ph} style={st} onChange={e=>updateAttributes({[k]:e.target.value})}/>
 return <NodeViewWrapper className="note-image-wrap chart-wrap" style={{textAlign:align}} contentEditable={false}>
  <Frame editor={editor} getPos={getPos} selected={selected} width={Number(node.attrs.width)||620} align={align} min={260}
   onCommit={w=>updateAttributes({width:w})} onAlign={a=>updateAttributes({align:a})} onDelete={deleteNode}
   extra={<button type="button" title="Modifier les données" className={edit?'on':''} onClick={()=>setEdit(!edit)}>✏️</button>}>
   {w=><div className="chart-card" style={{fontSize:Math.max(10,Math.min(16,w/38))}}>
    {title&&<div className="chart-title">{title}</div>}{subtitle&&<div className="chart-sub">{subtitle}</div>}
    <div className={'chart-body'+(type==='pie'?' pie':'')}>
     {type==='pie'?<>{donut()}<div className="chart-legend">{D.map((d,i)=><div key={d.id||i}><i style={{background:d.c,boxShadow:`0 0 8px ${d.c}88`}}/><span>{d.l}</span><b>{nf(d.v,2)}{u}</b></div>)}</div></>
     :type==='line'?line():bars()}</div></div>}
  </Frame>
  {edit&&<div className="cedit">
   <div className="crow">{inp('title','Titre',{flex:1})}{inp('subtitle','Sous-titre',{flex:1})}</div>
   <div className="crow">{inp('unit','Unité (€, %…)',{width:110})}{inp('label','Texte au centre',{flex:1})}
    <select value={type} onChange={e=>updateAttributes({type:e.target.value})}><option value="pie">Anneau</option><option value="bar">Barres</option><option value="line">Courbe</option></select></div>
   {D.map((d,i)=><div className="crow" key={d.id||i}><input type="text" defaultValue={d.l} placeholder="Nom" style={{flex:1}} onChange={e=>row(i,{l:e.target.value})}/>
    <input type="number" step="any" defaultValue={d.v} style={{width:100}} onChange={e=>row(i,{v:e.target.value})}/>
    <input type="color" defaultValue={d.c} onChange={e=>row(i,{c:e.target.value})}/><button onClick={()=>set(D.filter((_,k)=>k!==i))}>✕</button></div>)}
   <div className="crow"><button onClick={()=>set([...D,{id:rid(),l:'',v:'',c:PAL[D.length%PAL.length]}])}>＋ Ligne de données</button><button className="on" onClick={()=>setEdit(false)}>✓ Terminé</button></div></div>}
 </NodeViewWrapper>
}
export const Chart=Node.create({name:'chart',group:'block',atom:true,draggable:true,selectable:true,
 addAttributes(){return{type:{default:'pie'},title:{default:''},subtitle:{default:''},unit:{default:''},label:{default:''},
  width:{default:620},align:{default:'left'},data:{default:'[]'}}},
 parseHTML(){return[{tag:'div[data-chart]'}]},renderHTML(){return['div',{'data-chart':''}]},
 addNodeView(){return ReactNodeViewRenderer(ChartView)}})

// Soulignement du texte
export const UnderlineMark=Mark.create({
 name:'underline',
 parseHTML(){return [{tag:'u'}]},
 renderHTML(){return ['u',0]}
})

// Cadre redimensionnable façon Word (images et graphiques) : clic = sélection, poignées aux coins et sur les côtés
const HANDLES=[['nw',-1],['ne',1],['se',1],['sw',-1],['w',-1],['e',1]]
function Frame({editor,getPos,selected,width,align,onCommit,onAlign,onDelete,extra,children,min=40}){
 const [w,setW]=useState(width),[drag,setDrag]=useState(false),fr=useRef(null)
 useEffect(()=>{setW(width)},[width])
 const start=sx=>e=>{
  e.preventDefault();e.stopPropagation()
  const x0=e.clientX,w0=w,box=fr.current?.parentElement?.clientWidth||1400,k=align==='center'?2:1
  let cur=w0;setDrag(true)
  const move=ev=>{cur=Math.max(min,Math.min(box,Math.round(w0+(ev.clientX-x0)*sx*k)));setW(cur)}
  const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);setDrag(false);onCommit(cur)}
  window.addEventListener('pointermove',move);window.addEventListener('pointerup',up)
 }
 const pick=()=>{if(!selected){const p=getPos();if(typeof p==='number')editor.commands.setNodeSelection(p)}}
 const tool=(a,l,t)=><button key={a} type="button" title={t} className={align===a?'on':''} onClick={()=>onAlign(a)}>{l}</button>
 return <div ref={fr} className={'note-image-frame'+(selected?' sel':'')+(drag?' resizing':'')} style={{width:`min(${w}px, 100%)`}} onMouseDown={pick}>
  {children(w)}
  {selected&&<>
   {!drag&&<div className="image-tools" onMouseDown={e=>{e.preventDefault();e.stopPropagation()}}>
    {tool('left','⇤','Aligner à gauche')}{tool('center','↔','Centrer')}{tool('right','⇥','Aligner à droite')}{extra}
    <button type="button" title="Supprimer" onClick={onDelete}>🗑</button></div>}
   {HANDLES.map(([h,sx])=><span key={h} className={'image-handle h-'+h} onPointerDown={start(sx)}/>)}</>}
 </div>
}

// Image
function ImageView({node,updateAttributes,selected,deleteNode,editor,getPos}){
 const align=node.attrs.align||'left'
 return <NodeViewWrapper className="note-image-wrap" style={{textAlign:align}} contentEditable={false}>
  <Frame editor={editor} getPos={getPos} selected={selected} width={Number(node.attrs.width)||600} align={align}
   onCommit={w=>updateAttributes({width:w})} onAlign={a=>updateAttributes({align:a})} onDelete={deleteNode}>
   {()=><img data-drag-handle src={node.attrs.src} alt={node.attrs.alt||''} draggable="true"/>}
  </Frame>
 </NodeViewWrapper>
}
export const NoteImage=Node.create({
 name:'noteImage',group:'block',atom:true,draggable:true,selectable:true,
 addAttributes(){return {src:{default:null},alt:{default:''},width:{default:600},align:{default:'left',parseHTML:el=>el.getAttribute('data-align')||'left'}}},
 parseHTML(){return [{tag:'img[src]',getAttrs:el=>({src:el.getAttribute('src'),alt:el.getAttribute('alt')||'',width:Number(el.getAttribute('width'))||el.width||600})}]},
 renderHTML({node}){return ['img',{src:node.attrs.src,alt:node.attrs.alt||'','data-align':node.attrs.align,width:node.attrs.width,style:`width:${node.attrs.width}px;max-width:100%;height:auto`}]},
 addNodeView(){return ReactNodeViewRenderer(ImageView)}
})
export const ImagePaste=Extension.create({
 name:'imagePaste',
 addProseMirrorPlugins(){const editor=this.editor;return [new Plugin({props:{handlePaste:(view,event)=>{
  const files=Array.from(event.clipboardData?.items||[]).map(i=>i.getAsFile?.()).filter(f=>f&&f.type.startsWith('image/'))
  if(!files.length)return false
  event.preventDefault()
  files.forEach(file=>{const reader=new FileReader();reader.onload=()=>editor.chain().focus().insertContent({type:'noteImage',attrs:{src:reader.result,width:600}}).run();reader.readAsDataURL(file)})
  return true
 }}})]}
})
