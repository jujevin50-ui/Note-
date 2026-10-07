'use client'
import {useEffect,useRef,useState} from 'react'
import {supabase} from '../lib/supabase'
import Editor from '../components/Editor'
import Board from '../components/Board'

const COLORS=['#f59e0b','#ef4444','#22c55e','#3b82f6','#8b5cf6','#ec4899','#64748b']
const NAMES={page:'Nom de la page',board:'Nom du kanban',folder:'Nom du dossier'}
const EMOJIS='📄 📝 📌 📎 📅 📊 📈 📚 📖 📕 💡 ⭐ ✅ ❗ ❓ 🎯 🚀 🔥 💰 🛠️ 🧠 💬 📁 🗂️ 🧾 🔒 🏠 ✈️ 🍽️ ❤️ 🎓 🧪'.split(' ')
const Folder=({c='#f59e0b'})=><svg width="16" height="14" viewBox="0 0 16 14" style={{flex:'none'}}><path d="M1 1.5h5l1.5 1.5H15v9.5H1z" fill={c}/></svg>
const err=({error})=>error&&alert(error.message)
const Doc=({c})=><svg width="14" height="16" viewBox="0 0 14 16" style={{flex:'none'}}><path d="M1 1h8l4 4v10H1z" fill={c}/><path d="M9 1v4h4" fill="rgba(255,255,255,.45)"/></svg>
const Ic=({i})=>i.icon?<span>{i.icon}</span>:i.type==='folder'?<Folder c={i.color}/>:i.type==='pdf'?<Doc c={i.color||'#ef4444'}/>:<span>{i.type==='board'?'🗂️':'📄'}</span>

function Dlg({d,close}){
 const [v,setV]=useState(d.value||'')
 const ok=()=>{if(d.confirm||v.trim()){d.ok(v.trim());close()}}
 return <div className="ov" onClick={close}><div className="dlg" onClick={e=>e.stopPropagation()}>
  <h3>{d.label}</h3>
  {!d.confirm&&<input autoFocus autoComplete="off" name="nom-note" value={v} onChange={e=>setV(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')ok();if(e.key==='Escape')close()}}/>}
  <div className="btns"><button className="ghost" onClick={close}>Annuler</button><button className="on" onClick={ok}>{d.confirm?'Supprimer':'OK'}</button></div></div></div>
}
function PdfView({path,title}){
 const [u,setU]=useState('')
 useEffect(()=>{let x;supabase.storage.from('pdfs').download(path).then(({data})=>{if(data){x=URL.createObjectURL(data);setU(x)}});return()=>x&&URL.revokeObjectURL(x)},[path])
 return u?<><a href={u} download={title+'.pdf'} style={{display:'inline-block',margin:'0 0 10px',padding:'6px 12px',border:'1px solid #e5e5e0',borderRadius:6,color:'inherit',textDecoration:'none'}}>⬇ Télécharger le PDF</a><iframe src={u} className="pdf"/></>:<p className="muted">Chargement…</p>
}

export default function App(){
 const [s,setS]=useState(null),[ready,setReady]=useState(false)
 useEffect(()=>{supabase.auth.getSession().then(({data})=>{setS(data.session);setReady(true)})
  const {data}=supabase.auth.onAuthStateChange((_,x)=>setS(x));return()=>data.subscription.unsubscribe()},[])
 if(!ready)return null
 return s?<Main user={s.user}/>:<Login/>
}

function Login(){
 const [e,setE]=useState(''),[p,setP]=useState('')
 const go=async up=>{const a={email:e,password:p};const {error}=await(up?supabase.auth.signUp(a):supabase.auth.signInWithPassword(a));if(error)alert(error.message)}
 return <div className="login" style={{maxWidth:320}}><h1>📝 Notes</h1>
  <input placeholder="Email" value={e} onChange={x=>setE(x.target.value)}/>
  <input type="password" placeholder="Mot de passe" value={p} onChange={x=>setP(x.target.value)} onKeyDown={x=>x.key==='Enter'&&go(0)}/>
  <button className="on" onClick={()=>go(0)}>Connexion</button><button className="ghost" onClick={()=>go(1)}>Créer un compte</button></div>
}

function Main({user}){
 const [projs,setProjs]=useState([]),[pid,setPid]=useState(null),[items,setItems]=useState([]),[sel,setSel]=useState(null)
 const [dlg,setDlg]=useState(null),[menu,setMenu]=useState(null),[tabs,setTabs]=useState([]),[open,setOpen]=useState(true),[drop,setDrop]=useState(null)
 const fi=useRef(),pp=useRef(null),drag=useRef(null)
 const loadP=async()=>{const {data}=await supabase.from('projects').select('*');setProjs(data||[]);if(!pid&&data?.[0])setPid(data[0].id)}
 const loadI=async()=>{if(!pid)return;const {data}=await supabase.from('items').select('id,parent_id,type,title,color,closed,icon,pos,created_at').eq('project_id',pid).order('created_at');setItems(data||[])}
 useEffect(()=>{loadP()},[])
 useEffect(()=>{setSel(null);setTabs([]);loadI();if(!pid)return
  const ch=supabase.channel('items:'+pid).on('postgres_changes',{event:'*',schema:'public',table:'items',filter:'project_id=eq.'+pid},loadI).subscribe()
  return()=>supabase.removeChannel(ch)},[pid])

 const ask=(label,value,ok)=>setDlg({label,value,ok,k:Math.random()})
 const insert=async row=>{const {data,error}=await supabase.from('items').insert({project_id:pid,pos:Date.now(),...row}).select().single();if(error)alert(error.message);return data}
 const patch=(id,p)=>{setItems(l=>l.map(x=>x.id===id?{...x,...p}:x));supabase.from('items').update(p).eq('id',id).then(err)}
 const newProj=()=>ask('Nom du projet','',async name=>{const {data,error}=await supabase.from('projects').insert({name}).select().single();if(error)return alert(error.message);await loadP();setPid(data.id)})
 const invite=()=>ask("Email de la personne (elle doit déjà avoir un compte)",'',async p_mail=>{const {error}=await supabase.rpc('invite',{p_pid:pid,p_mail});alert(error?error.message:'Invité !')})
 const add=(type,parent_id)=>ask(NAMES[type],'',async title=>{await insert({type,title,parent_id});if(parent_id)patch(parent_id,{closed:false})})
 const ren=i=>ask('Renommer',i.title,title=>patch(i.id,{title}))
 const del=i=>setDlg({label:`Supprimer « ${i.title} » et son contenu ?`,confirm:true,k:Math.random(),ok:async()=>{
  if(i.type==='pdf')supabase.storage.from('pdfs').remove([pid+'/'+i.id+'.pdf'])
  await supabase.from('items').delete().eq('id',i.id);if(sel===i.id)setSel(null)}})
 const readPdf=async(f,parent_id)=>{const row=await insert({type:'pdf',title:f.name.replace(/\.pdf$/i,''),parent_id});if(!row)return
  const {error}=await supabase.storage.from('pdfs').upload(pid+'/'+row.id+'.pdf',f,{contentType:'application/pdf'})
  if(error){alert("Envoi du PDF impossible : "+error.message);await supabase.from('items').delete().eq('id',row.id)}}
 const pick=p=>{pp.current=p;fi.current.click()}
 const onPdf=e=>{const f=e.target.files[0];e.target.value='';if(f)readPdf(f,pp.current)}
 const show=(e,i,mode)=>{e.preventDefault();e.stopPropagation();setMenu({x:Math.min(e.clientX,innerWidth-230),y:Math.min(e.clientY,innerHeight-340),i,mode})}

 const openItem=id=>{setSel(id);setTabs(t=>t.includes(id)?t:[...t,id])}
 const closeTab=id=>{const n=tabs.filter(x=>x!==id);setTabs(n);if(sel===id)setSel(n[n.length-1]||null)}
 // ordre + déplacement par glisser-déposer
 const key=x=>x.pos??new Date(x.created_at).getTime()
 const sibs=p=>items.filter(i=>i.parent_id===p).sort((a,b)=>key(a)-key(b))
 const isIn=(id,anc)=>{let c=items.find(x=>x.id===id);while(c){if(c.id===anc)return true;c=items.find(x=>x.id===c.parent_id)}return false}
 const zoneOf=(e,f)=>{const r=e.currentTarget.getBoundingClientRect(),y=(e.clientY-r.top)/r.height;return f?(y<.25?'before':y>.75?'after':'in'):(y<.5?'before':'after')}
 const move=(id,tid,zone)=>{
  if(tid&&isIn(tid,id))return
  const t=items.find(x=>x.id===tid)
  if(!t)return patch(id,{parent_id:null,pos:Date.now()})
  if(zone==='in'){patch(id,{parent_id:t.id,pos:Date.now()});return patch(t.id,{closed:false})}
  const l=sibs(t.parent_id).filter(x=>x.id!==id),k=l.findIndex(x=>x.id===t.id)
  const a=zone==='before'?(l[k-1]?key(l[k-1]):key(t)-2000):key(t)
  const b=zone==='before'?key(t):(l[k+1]?key(l[k+1]):key(t)+2000)
  patch(id,{parent_id:t.parent_id,pos:(a+b)/2})}

 const cur=items.find(i=>i.id===sel)
 const tabItems=tabs.map(id=>items.find(i=>i.id===id)).filter(Boolean)
 const tree=parent=>sibs(parent).map(i=>{const f=i.type==='folder',z=drop&&drop.id===i.id?' dz-'+drop.zone:'';return <div key={i.id}>
  <div className={'row'+(sel===i.id?' on':'')+z} draggable
   onDragStart={e=>{drag.current=i.id;e.dataTransfer.setData('text/plain',i.id)}} onDragEnd={()=>{drag.current=null;setDrop(null)}}
   onDragOver={e=>{if(!drag.current)return;e.preventDefault();e.stopPropagation();setDrop({id:i.id,zone:zoneOf(e,f)})}}
   onDrop={e=>{if(!drag.current)return;e.preventDefault();e.stopPropagation();move(drag.current,i.id,zoneOf(e,f));drag.current=null;setDrop(null)}}
   onClick={()=>f?patch(i.id,{closed:!i.closed}):openItem(i.id)} onContextMenu={e=>show(e,i)}>
   <span className="t">{f&&<small>{i.closed?'▸':'▾'}</small>}<Ic i={i}/> {i.title}</span>
   <span className="act">{f&&<b onClick={e=>show(e,i,'new')}>＋</b>}<b onClick={e=>show(e,i)}>⋯</b></span></div>
  {f&&!i.closed&&<div className="kids">{tree(i.id)}</div>}</div>})
 const news=p=>[['📄 Nouvelle page',()=>add('page',p)],['🗂️ Nouveau kanban',()=>add('board',p)],['📁 Nouveau dossier',()=>add('folder',p)],['📎 Importer un PDF',()=>pick(p)]]
 const m=menu&&menu.i&&items.find(x=>x.id===menu.i.id)
 return <div className="app" style={{gridTemplateColumns:open?'290px 1fr':'1fr'}}
  onDragOver={e=>{if(pid&&[...e.dataTransfer.types].includes('Files'))e.preventDefault()}}
  onDrop={e=>{const f=[...e.dataTransfer.files].find(x=>x.type==='application/pdf');if(f&&pid){e.preventDefault();readPdf(f,null)}}}>
  {open&&<aside>
   <div className="head"><select value={pid||''} onChange={e=>setPid(e.target.value)} style={{flex:1,minWidth:0}}>{projs.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
    <button onClick={newProj} title="Nouveau projet">＋</button>{pid&&<button onClick={invite} title="Inviter">👥</button>}
    <button className="ghost" onClick={()=>setOpen(false)} title="Masquer le menu">«</button></div>
   {pid&&<button className="on" onClick={e=>show(e,null,'new')}>＋ Nouveau</button>}
   <div className="tree" onContextMenu={e=>pid&&show(e,null,'new')} onDragOver={e=>drag.current&&e.preventDefault()}
    onDrop={e=>{if(drag.current){e.preventDefault();move(drag.current,null);drag.current=null;setDrop(null)}}}>{tree(null)}</div>
   <button className="ghost" onClick={()=>supabase.auth.signOut()}>Déconnexion</button></aside>}
  <section className="mainc">
   {!open&&<div className="tabs"><button className="ghost" onClick={()=>setOpen(true)} title="Afficher le menu">☰</button>
    {tabItems.map(t=><div key={t.id} className={'tab'+(sel===t.id?' on':'')} onClick={()=>setSel(t.id)}><Ic i={t}/><span>{t.title}</span>
     <b onClick={e=>{e.stopPropagation();closeTab(t.id)}}>✕</b></div>)}</div>}
   <main>{!pid?<p className="muted">Crée ton premier projet avec « ＋ » en haut à gauche.</p>:!cur?<p className="muted">Choisis un élément, ou crée-en un avec « ＋ Nouveau ». Glisse-dépose pour réorganiser.</p>
    :<><h2><span className="ic" onClick={e=>show(e,cur,'icon')} title="Choisir une icône">{cur.icon||<span className="muted">☺</span>}</span> {cur.title}</h2>
     {cur.type==='board'?<Board key={cur.id} id={cur.id} pid={pid} ask={ask}/>
     :cur.type==='pdf'?<PdfView key={cur.id} path={pid+'/'+cur.id+'.pdf'} title={cur.title}/>
     :<Editor key={cur.id} id={cur.id} user={user}/>}</>}</main></section>
  <input ref={fi} type="file" accept="application/pdf" hidden onChange={onPdf}/>
  {menu&&<div className="ov" onClick={()=>setMenu(null)} onContextMenu={e=>{e.preventDefault();setMenu(null)}}>
   <div className="menu" style={{left:menu.x,top:menu.y}} onClick={e=>e.stopPropagation()}>
    {menu.mode==='icon'&&m?<>
     <div className="eg">{EMOJIS.map(e=><span key={e} onClick={()=>{patch(m.id,{icon:e});setMenu(null)}}>{e}</span>)}</div><hr/>
     <div className="mi" onClick={()=>{setMenu(null);ask('Tape ou colle un emoji','',v=>patch(m.id,{icon:[...new Intl.Segmenter().segment(v)][0].segment}))}}>✍️ Autre emoji…</div>
     <div className="mi" onClick={()=>{patch(m.id,{icon:null});setMenu(null)}}>🚫 Retirer l'icône</div></>
    :<>
     {(!m||m.type==='folder')&&news(m?m.id:null).map(([l,f])=><div key={l} className="mi" onClick={()=>{setMenu(null);f()}}>{l}</div>)}
     {m&&menu.mode!=='new'&&<>{m.type==='folder'&&<hr/>}
      <div className="mi" onClick={()=>{setMenu(null);ren(m)}}>✏️ Renommer</div>
      <div className="mi" onClick={()=>setMenu({...menu,mode:'icon'})}>😀 Icône…</div>
      {(m.type==='folder'||m.type==='pdf')&&<div className="sw">{COLORS.map(c=><i key={c} style={{background:c}} onClick={()=>{patch(m.id,{color:c});setMenu(null)}}/>)}
       <input type="color" title="Autre couleur" value={m.color||'#3b82f6'} onChange={e=>setItems(l=>l.map(x=>x.id===m.id?{...x,color:e.target.value}:x))} onBlur={e=>patch(m.id,{color:e.target.value})}/></div>}
      <div className="mi red" onClick={()=>{setMenu(null);del(m)}}>🗑️ Supprimer</div></>}</>}
   </div></div>}
  {dlg&&<Dlg key={dlg.k} d={dlg} close={()=>setDlg(null)}/>}</div>
}
