'use client'
import {useEffect,useRef,useState} from 'react'
import {supabase} from '../lib/supabase'
import Editor from '../components/Editor'
import Board from '../components/Board'

const COLORS=['#f59e0b','#ef4444','#22c55e','#3b82f6','#8b5cf6','#ec4899','#64748b']
const NAMES={page:'Nom de la page',board:'Nom du kanban',folder:'Nom du dossier'}
const ICON={page:'📄',board:'🗂️',pdf:'📕'}
const Folder=({c='#f59e0b'})=><svg width="16" height="14" viewBox="0 0 16 14" style={{flex:'none'}}><path d="M1 1.5h5l1.5 1.5H15v9.5H1z" fill={c}/></svg>
const err=({error})=>error&&alert(error.message)

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
 const [dlg,setDlg]=useState(null),[menu,setMenu]=useState(null)
 const fi=useRef(),pp=useRef(null)
 const loadP=async()=>{const {data}=await supabase.from('projects').select('*');setProjs(data||[]);if(!pid&&data?.[0])setPid(data[0].id)}
 const loadI=async()=>{if(!pid)return;const {data}=await supabase.from('items').select('id,parent_id,type,title,color,closed').eq('project_id',pid).order('created_at');setItems(data||[])}
 useEffect(()=>{loadP()},[])
 useEffect(()=>{setSel(null);loadI();if(!pid)return
  const ch=supabase.channel('items:'+pid).on('postgres_changes',{event:'*',schema:'public',table:'items',filter:'project_id=eq.'+pid},loadI).subscribe()
  return()=>supabase.removeChannel(ch)},[pid])

 const ask=(label,value,ok)=>setDlg({label,value,ok,k:Math.random()})
 const insert=async row=>{const {data,error}=await supabase.from('items').insert({project_id:pid,...row}).select().single();if(error)alert(error.message);return data}
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
 const show=(e,i,mode)=>{e.preventDefault();e.stopPropagation();setMenu({x:Math.min(e.clientX,innerWidth-230),y:Math.min(e.clientY,innerHeight-330),i,mode})}

 const cur=items.find(i=>i.id===sel)
 const tree=parent=>items.filter(i=>i.parent_id===parent).map(i=>{const f=i.type==='folder';return <div key={i.id}>
  <div className={'row'+(sel===i.id?' on':'')} onClick={()=>f?patch(i.id,{closed:!i.closed}):setSel(i.id)} onContextMenu={e=>show(e,i)}>
   <span className="t">{f?<><small>{i.closed?'▸':'▾'}</small><Folder c={i.color}/></>:ICON[i.type]} {i.title}</span>
   <span className="act">{f&&<b onClick={e=>show(e,i,'new')}>＋</b>}<b onClick={e=>show(e,i)}>⋯</b></span></div>
  {f&&!i.closed&&<div className="kids">{tree(i.id)}</div>}</div>})
 const news=p=>[['📄 Nouvelle page',()=>add('page',p)],['🗂️ Nouveau kanban',()=>add('board',p)],['📁 Nouveau dossier',()=>add('folder',p)],['📎 Importer un PDF',()=>pick(p)]]
 const m=menu&&menu.i
 return <div className="app" onDragOver={e=>{if(pid&&[...e.dataTransfer.types].includes('Files'))e.preventDefault()}}
  onDrop={e=>{const f=[...e.dataTransfer.files].find(x=>x.type==='application/pdf');if(f&&pid){e.preventDefault();readPdf(f,null)}}}>
  <aside>
   <div className="head"><select value={pid||''} onChange={e=>setPid(e.target.value)} style={{flex:1,minWidth:0}}>{projs.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
    <button onClick={newProj} title="Nouveau projet">＋</button>{pid&&<button onClick={invite} title="Inviter">👥</button>}</div>
   {pid&&<button className="on" onClick={e=>show(e,null,'new')}>＋ Nouveau</button>}
   <div className="tree" onContextMenu={e=>pid&&show(e,null,'new')}>{tree(null)}</div>
   <button className="ghost" onClick={()=>supabase.auth.signOut()}>Déconnexion</button></aside>
  <main>{!pid?<p className="muted">Crée ton premier projet avec « ＋ » en haut à gauche.</p>:!cur?<p className="muted">Choisis un élément, ou crée-en un avec « ＋ Nouveau ». Clic droit sur un dossier = options.</p>
   :<><h2>{cur.title}</h2>{cur.type==='board'?<Board key={cur.id} id={cur.id} pid={pid} ask={ask}/>
    :cur.type==='pdf'?<PdfView key={cur.id} path={pid+'/'+cur.id+'.pdf'} title={cur.title}/>
    :<Editor key={cur.id} id={cur.id} user={user}/>}</>}</main>
  <input ref={fi} type="file" accept="application/pdf" hidden onChange={onPdf}/>
  {menu&&<div className="ov" onClick={()=>setMenu(null)} onContextMenu={e=>{e.preventDefault();setMenu(null)}}>
   <div className="menu" style={{left:menu.x,top:menu.y}} onClick={e=>e.stopPropagation()}>
    {(!m||m.type==='folder')&&news(m?m.id:null).map(([l,f])=><div key={l} className="mi" onClick={()=>{setMenu(null);f()}}>{l}</div>)}
    {m&&menu.mode!=='new'&&<>{m.type==='folder'&&<hr/>}
     <div className="mi" onClick={()=>{setMenu(null);ren(m)}}>✏️ Renommer</div>
     {m.type==='folder'&&<div className="sw">{COLORS.map(c=><i key={c} style={{background:c}} onClick={()=>{patch(m.id,{color:c});setMenu(null)}}/>)}</div>}
     <div className="mi red" onClick={()=>{setMenu(null);del(m)}}>🗑️ Supprimer</div></>}</div></div>}
  {dlg&&<Dlg key={dlg.k} d={dlg} close={()=>setDlg(null)}/>}</div>
}
