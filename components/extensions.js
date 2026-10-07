'use client'
import {useState} from 'react'
import {Node,Extension} from '@tiptap/core'
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

// Graphique (barres / courbe / camembert) avec tableau de données
const PAL=['#3b82f6','#22c55e','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6']
const rid=()=>Math.random().toString(36).slice(2,8)
function ChartView({node,updateAttributes,deleteNode}){
 const [edit,setEdit]=useState(false)
 const {type,title}=node.attrs
 let D=[];try{D=JSON.parse(node.attrs.data)||[]}catch{}
 const set=d=>updateAttributes({data:JSON.stringify(d)})
 const row=(i,p)=>set(D.map((x,k)=>k===i?{...x,...p}:x))
 const W=480,H=230,bw=(W-40)/(D.length||1),max=Math.max(1,...D.map(d=>+d.v||0)),tot=D.reduce((a,d)=>a+(+d.v||0),0)||1
 const y=v=>H-34-((+v||0)/max)*(H-70)
 const lab=(d,i)=><text key={'t'+i} x={30+(i+.5)*bw} y={H-14} textAnchor="middle" fontSize="12" fill="currentColor">{d.l}</text>
 let g
 if(type==='pie'){const cx=130,cy=H/2,r=88;let a0=-Math.PI/2
  g=<>{D.map((d,i)=>{const a=((+d.v||0)/tot)*2*Math.PI,a1=a0+a
   const p=a>=6.28?<circle key={i} cx={cx} cy={cy} r={r} fill={d.c}/>:<path key={i} fill={d.c} d={`M${cx},${cy}L${cx+r*Math.cos(a0)},${cy+r*Math.sin(a0)}A${r},${r} 0 ${a>Math.PI?1:0} 1 ${cx+r*Math.cos(a1)},${cy+r*Math.sin(a1)}Z`}/>
   a0=a1;return p})}
   {D.map((d,i)=><g key={'l'+i}><rect x="250" y={26+i*22} width="12" height="12" rx="3" fill={d.c}/><text x="270" y={37+i*22} fontSize="13" fill="currentColor">{d.l} — {d.v} ({Math.round((+d.v||0)/tot*100)}%)</text></g>)}</>
 }else if(type==='line'){
  g=<><line x1="30" x2={W-10} y1={H-34} y2={H-34} stroke="#d4d4cf"/>
   <polyline fill="none" stroke="#2563eb" strokeWidth="3" points={D.map((d,i)=>`${30+(i+.5)*bw},${y(d.v)}`).join(' ')}/>
   {D.map((d,i)=><g key={i}><circle cx={30+(i+.5)*bw} cy={y(d.v)} r="5" fill={d.c}/><text x={30+(i+.5)*bw} y={y(d.v)-10} textAnchor="middle" fontSize="12" fill="currentColor">{d.v}</text>{lab(d,i)}</g>)}</>
 }else{
  g=<><line x1="30" x2={W-10} y1={H-34} y2={H-34} stroke="#d4d4cf"/>
   {D.map((d,i)=><g key={i}><rect x={30+i*bw+bw*.15} y={y(d.v)} width={bw*.7} height={H-34-y(d.v)} rx="4" fill={d.c}/><text x={30+(i+.5)*bw} y={y(d.v)-6} textAnchor="middle" fontSize="12" fill="currentColor">{d.v}</text>{lab(d,i)}</g>)}</>
 }
 return <NodeViewWrapper className="chart" contentEditable={false}>
  <div className="chead"><b>{title}</b><span><button onClick={()=>setEdit(!edit)}>{edit?'✓ Terminé':'✏️ Modifier'}</button> <button onClick={deleteNode}>🗑</button></span></div>
  <svg viewBox={`0 0 ${W} ${H}`} width="100%">{g}</svg>
  {edit&&<div className="cedit">
   <div className="crow"><input type="text" defaultValue={title} placeholder="Titre" style={{flex:1}} onChange={e=>updateAttributes({title:e.target.value})}/>
    <select value={type} onChange={e=>updateAttributes({type:e.target.value})}><option value="bar">Barres</option><option value="line">Courbe</option><option value="pie">Camembert</option></select></div>
   {D.map((d,i)=><div className="crow" key={d.id||i}><input type="text" defaultValue={d.l} placeholder="Nom" style={{flex:1}} onChange={e=>row(i,{l:e.target.value})}/>
    <input type="number" defaultValue={d.v} style={{width:90}} onChange={e=>row(i,{v:e.target.value})}/>
    <input type="color" defaultValue={d.c} onChange={e=>row(i,{c:e.target.value})}/><button onClick={()=>set(D.filter((_,k)=>k!==i))}>✕</button></div>)}
   <button onClick={()=>set([...D,{id:rid(),l:'Nouveau',v:10,c:PAL[D.length%PAL.length]}])}>＋ Ligne de données</button></div>}
 </NodeViewWrapper>
}
export const Chart=Node.create({name:'chart',group:'block',atom:true,draggable:true,
 addAttributes(){return{type:{default:'bar'},title:{default:'Mon graphique'},
  data:{default:JSON.stringify([{id:'a',l:'A',v:30,c:PAL[0]},{id:'b',l:'B',v:50,c:PAL[1]},{id:'c',l:'C',v:20,c:PAL[2]}])}}},
 parseHTML(){return[{tag:'div[data-chart]'}]},renderHTML(){return['div',{'data-chart':''}]},
 addNodeView(){return ReactNodeViewRenderer(ChartView)}})
