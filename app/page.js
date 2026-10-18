'use client'
import {useEffect,useRef,useState} from 'react'
import {supabase} from '../lib/supabase'
import {colorOf} from '../lib/provider'
import Editor from '../components/Editor'
import PdfView from '../components/PdfView'

const COLORS=['#f59e0b','#ef4444','#22c55e','#3b82f6','#8b5cf6','#ec4899','#64748b']
const NAMES={page:'Nom de la page',folder:'Nom du dossier'}
const EMOJIS='📄 📝 📌 📎 📅 📊 📈 📚 📖 📕 💡 ⭐ ✅ ❗ ❓ 🎯 🚀 🔥 💰 🛠️ 🧠 💬 📁 🗂️ 🧾 🔒 🏠 ✈️ 🍽️ ❤️ 🎓 🧪'.split(' ')
const Folder=({c='#f59e0b'})=><svg width="16" height="14" viewBox="0 0 16 14" style={{flex:'none'}}><path d="M1 1.5h5l1.5 1.5H15v9.5H1z" fill={c}/></svg>
const err=({error})=>error&&alert(error.message)
const Doc=({c})=><svg width="14" height="16" viewBox="0 0 14 16" style={{flex:'none'}}><path d="M1 1h8l4 4v10H1z" fill={c}/><path d="M9 1v4h4" fill="rgba(255,255,255,.45)"/></svg>
const Ic=({i})=>i.icon?<span>{i.icon}</span>:i.type==='folder'?<Folder c={i.color}/>:i.type==='pdf'?<Doc c={i.color||'#ef4444'}/>:<span>📄</span>

function Dlg({d,close}){
 const [v,setV]=useState(d.value||'')
 const ok=()=>{if(d.confirm||v.trim()){d.ok(v.trim());close()}}
 return <div className="ov" onClick={close}><div className="dlg" onClick={e=>e.stopPropagation()}>
  <h3>{d.label}</h3>
  {!d.confirm&&<input autoFocus autoComplete="off" name="nom-note" value={v} onChange={e=>setV(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')ok();if(e.key==='Escape')close()}}/>}
  <div className="btns"><button className="ghost" onClick={close}>Annuler</button><button className="on" onClick={ok}>{d.confirm?'Supprimer':'OK'}</button></div></div></div>
}
function ShareDlg({code,pid,onNew,close}){
 const [c,setC]=useState(code),[ok,setOk]=useState(false),[members,setMembers]=useState([]),[loading,setLoading]=useState(true),[memberError,setMemberError]=useState('')
 useEffect(()=>{let live=true;supabase.rpc('project_members_info',{p_pid:pid}).then(({data,error})=>{if(!live)return;if(error)setMemberError('Pour afficher les noms et emails, exécute le fichier supabase/project_members_info.sql dans Supabase.');else setMembers(data||[]);setLoading(false)});return()=>{live=false}},[pid])
 return <div className="ov" onClick={close}><div className="dlg share-dialog" onClick={e=>e.stopPropagation()}>
  <h3>Partager l’espace</h3>
  <label className="muted">Code pour inviter un membre</label>
  <input readOnly value={c} onFocus={e=>e.target.select()} style={{fontSize:22,letterSpacing:3,textAlign:'center'}}/>
  <p className="muted" style={{margin:0}}>La personne crée son compte, clique sur ＋ puis « Rejoindre avec un code » et saisit ce code.</p>
  <div className="btns"><button className="ghost" onClick={async()=>setC(await onNew())}>Nouveau code</button>
   <button onClick={()=>{navigator.clipboard.writeText(c);setOk(true)}}>{ok?'Copié ✓':'Copier le code'}</button></div>
  <hr className="share-divider"/><h3>Membres de cet espace</h3>
  {loading?<p className="muted">Chargement des membres…</p>:memberError?<p className="muted">{memberError}</p>:members.length?<div className="member-list">{members.map(m=><div className="member-row" key={m.user_id}><span className="member-avatar">{(m.name||m.email||'?').slice(0,1).toUpperCase()}</span><span><b>{m.name||'Membre'}</b><small>{m.email||m.user_id}</small></span>{m.is_owner&&<span className="member-owner">Propriétaire</span>}</div>)}</div>:<p className="muted">Aucun membre trouvé.</p>}
  <div className="btns"><button className="on" onClick={close}>Fermer</button></div></div></div>
}
function Settings({user,close}){
 const [n,setN]=useState(user.user_metadata?.name||''),[st,setSt]=useState(''),[th,setTh]=useState(()=>localStorage.getItem('theme')||'light')
 const setTheme=t=>{setTh(t);localStorage.setItem('theme',t);document.documentElement.dataset.theme=t}
 const save=async()=>{const {error}=await supabase.auth.updateUser({data:{name:n.trim()}});setSt(error?error.message:'✓ Enregistré')}
 return <div className="ov" onClick={close}><div className="dlg" onClick={e=>e.stopPropagation()}>
  <h3>⚙️ Paramètres</h3>
  <label className="muted">Nom d'utilisateur (affiché sur ton curseur et dans « en ligne »)</label>
  <input autoFocus autoComplete="off" name="nom-utilisateur" value={n} placeholder={user.email.split('@')[0]} onChange={e=>setN(e.target.value)} onKeyDown={e=>e.key==='Enter'&&save()}/>
  <label className="muted">Thème (sur cet appareil)</label>
  <div className="btns" style={{justifyContent:'flex-start'}}>{[['light','☀️ Clair'],['dark','🌙 Sombre']].map(([k,l])=><button key={k} className={th===k?'on':''} onClick={()=>setTheme(k)}>{l}</button>)}</div>
  <p className="muted" style={{margin:0}}>Compte : {user.email}</p>{st&&<p style={{margin:0}}>{st}</p>}
  <div className="btns"><button className="ghost" onClick={close}>Fermer</button><button className="on" onClick={save}>Enregistrer</button></div></div></div>
}
const INV_SECTIONS=[
 {title:'Entreprises à suivre',icon:'📈',color:'#007aff'},
 {title:'Analyses',icon:'🔬',color:'#ff9500'},
 {title:'Journal',icon:'📓',color:'#34c759'},
 {title:'Concepts',icon:'💡',color:'#af52de'},
 {title:'Sources',icon:'📰',color:'#ff3b30'},
 {title:'Portefeuille',icon:'💰',color:'#30b0c7'},
 {title:'Objectifs',icon:'🎯',color:'#5856d6'},
 {title:'Questions',icon:'❓',color:'#8e8e93'},
]

function NotesHome({items,sibs,openItem,show,projName}){
 const [q,setQ]=useState(''),[more,setMore]=useState({})
 const roots=sibs(null),folders=roots.filter(i=>i.type==='folder'),loose=roots.filter(i=>i.type!=='folder')
 const nF=items.filter(i=>i.type==='folder').length,nP=items.filter(i=>i.type==='page').length,nD=items.filter(i=>i.type==='pdf').length
 const path=i=>{const a=[];let c=items.find(x=>x.id===i.parent_id);while(c){a.unshift(c.title);c=items.find(x=>x.id===c.parent_id)}return a.join(' › ')}
 const flat=(id,d=0)=>sibs(id).flatMap(c=>[{i:c,d},...(c.type==='folder'?flat(c.id,d+1):[])])
 const needle=q.trim().toLowerCase(),found=needle?items.filter(i=>(i.title||'').toLowerCase().includes(needle)):[]
 const plural=(n,w)=>n+' '+w+(n>1?'s':'')
 const Row=({i,d})=>i.type==='folder'
  ?<div className="hrow hsub" style={{paddingLeft:6+d*16}} onContextMenu={e=>show(e,i)}><Ic i={i}/><b>{i.title}</b><small className="muted">{flat(i.id).filter(x=>x.i.type!=='folder').length}</small>
    <span className="hact"><b onClick={e=>show(e,i,'new')}>＋</b><b onClick={e=>show(e,i)}>⋯</b></span></div>
  :<div className="hrow hitem" style={{paddingLeft:6+d*16}} onClick={()=>openItem(i.id)} onContextMenu={e=>show(e,i)}><Ic i={i}/><span>{i.title}</span></div>
 const card=f=>{const all=flat(f.id),n=all.filter(x=>x.i.type!=='folder').length,sf=all.filter(x=>x.i.type==='folder').length,open=more[f.id],rows=open?all:all.slice(0,8)
  return <div className="hcard" key={f.id} style={{borderTopColor:f.color||'#007aff'}}>
   <div className="hhead" onContextMenu={e=>show(e,f)}><Ic i={f}/><div><h3>{f.title}</h3><small className="muted">{plural(n,'élément')}{sf>0&&' · '+plural(sf,'sous-dossier')}</small></div>
    <span className="hact"><b onClick={e=>show(e,f,'new')} title="Ajouter">＋</b><b onClick={e=>show(e,f)}>⋯</b></span></div>
   <div className="hbody">{rows.length?rows.map(r=><Row key={r.i.id} {...r}/>):<p className="muted" style={{margin:'4px 6px'}}>Dossier vide</p>}</div>
   {all.length>8&&<button className="ghost hmore" onClick={()=>setMore({...more,[f.id]:!open})}>{open?'Réduire':'Afficher '+(all.length-8)+' de plus'}</button>}</div>}
 return <div className="home">
  <div className="hhd"><div><h1>Notes</h1><p className="muted" style={{margin:'2px 0 0'}}>{projName} · {plural(nF,'dossier')} · {plural(nP,'page')}{nD>0&&' · '+plural(nD,'PDF')}</p></div>
   <div className="hsearch"><input placeholder="Rechercher…" value={q} onChange={e=>setQ(e.target.value)}/><button className="on" onClick={e=>show(e,null,'new')}>＋ Nouveau</button></div></div>
  {needle?<div className="hsec"><h4>Résultats ({found.length})</h4>{found.length?<div className="hlist">{found.map(i=><div className="hrow hitem hres" key={i.id} onClick={()=>i.type!=='folder'&&openItem(i.id)} onContextMenu={e=>show(e,i)}><Ic i={i}/><span>{i.title}</span><small className="muted">{path(i)}</small></div>)}</div>:<p className="muted">Aucun résultat.</p>}</div>
  :!items.length?<div className="hempty"><p className="muted">Aucune note pour l’instant.</p><button className="on" onClick={e=>show(e,null,'new')}>＋ Créer une note</button></div>
  :<>
   {folders.length>0&&<div className="hsec"><h4>Dossiers</h4><div className="hgrid">{folders.map(card)}</div></div>}
   {loose.length>0&&<div className="hsec"><h4>Hors dossier</h4><div className="hgrid hgrid-s">{loose.map(i=><div className="hmini" key={i.id} onClick={()=>openItem(i.id)} onContextMenu={e=>show(e,i)}><Ic i={i}/><span>{i.title}</span></div>)}</div></div>}
  </>}
 </div>
}

function InvestHome({items,sibs,openItem,show,projName,addCompany,del}){
 const [q,setQ]=useState('')
 const roots=sibs(null)
 const path=i=>{const a=[];let c=items.find(x=>x.id===i.parent_id);while(c){a.unshift(c.title);c=items.find(x=>x.id===c.parent_id)}return a.join(' › ')}
 const needle=q.trim().toLowerCase(),found=needle?items.filter(i=>(i.title||'').toLowerCase().includes(needle)):[]
 const plural=(n,w)=>n+' '+w+(n>1?'s':'')
 const findFolder=t=>roots.find(i=>i.type==='folder'&&(i.title||'').toLowerCase()===t.toLowerCase())
 const companyFolder=findFolder('Entreprises à suivre')
 const companies=companyFolder?sibs(companyFolder.id).filter(i=>i.type!=='folder'):[]
 const otherSections=INV_SECTIONS.filter(s=>s.title!=='Entreprises à suivre')
 const sectionTitles=new Set(INV_SECTIONS.map(s=>s.title.toLowerCase()))
 const otherFolders=roots.filter(i=>i.type==='folder'&&!sectionTitles.has((i.title||'').toLowerCase()))
 const loose=roots.filter(i=>i.type!=='folder')

 const ItemRow=({i})=>{
  if(i.type==='folder')return <div className="inv-row inv-sub" onContextMenu={e=>show(e,i)}><Ic i={i}/><b>{i.title}</b><small className="muted">{sibs(i.id).length}</small>
   <span className="hact"><b onClick={e=>show(e,i,'new')}>＋</b><b onClick={e=>show(e,i)}>⋯</b></span></div>
  return <div className="inv-row" onClick={()=>openItem(i.id)} onContextMenu={e=>show(e,i)}><Ic i={i}/><span>{i.title}</span>
   <span className="hact"><b onClick={e=>{e.stopPropagation();show(e,i)}}>⋯</b></span></div>
 }
 const Section=({s})=>{
  const folder=findFolder(s.title)
  const kids=folder?sibs(folder.id):[]
  return <section className="inv-sec" style={{'--inv':s.color}}>
   <header className="inv-head">
    <span className="inv-ico">{s.icon}</span>
    <div className="inv-titles"><h3>{s.title}</h3><small className="muted">{folder?(kids.length?plural(kids.length,'élément'):'Vide'):'—'}</small></div>
    <button type="button" className="ghost inv-add" onClick={e=>folder?show(e,folder,'new'):show(e,null,'new')} title="Ajouter">＋</button>
   </header>
   <div className="inv-body">
    {folder?(kids.length?kids.map(i=><ItemRow key={i.id} i={i}/>):<p className="inv-empty muted">Vide</p>)
     :<p className="inv-empty muted">Crée un dossier « {s.title} » ici pour le remplir.</p>}
   </div>
  </section>
 }

 return <div className="home">
  <div className="hhd"><div><h1>Invest</h1><p className="muted" style={{margin:'2px 0 0'}}>{projName} · espace investissement</p></div>
   <div className="hsearch"><input placeholder="Rechercher…" value={q} onChange={e=>setQ(e.target.value)}/><button className="on" onClick={e=>show(e,null,'new')}>＋ Nouveau</button></div></div>
  {needle?<div className="hsec"><h4>Résultats ({found.length})</h4>{found.length?<div className="hlist">{found.map(i=><div className="hrow hitem hres" key={i.id} onClick={()=>i.type!=='folder'&&openItem(i.id)} onContextMenu={e=>show(e,i)}><Ic i={i}/><span>{i.title}</span><small className="muted">{path(i)}</small></div>)}</div>:<p className="muted">Aucun résultat.</p>}</div>
  :<>
   {/* Entreprises à suivre — liste simple de noms */}
   <section className="co-sec">
    <header className="co-head">
     <div className="co-titles">
      <span className="co-ico">📈</span>
      <div>
       <h2>Entreprises à suivre</h2>
       <p className="muted">{companies.length?plural(companies.length,'entreprise'):'Ajoute les sociétés que tu veux suivre'}</p>
      </div>
     </div>
     <button type="button" className="on co-add" onClick={addCompany}>＋ Ajouter</button>
    </header>
    {companies.length>0?<div className="co-list">
     {companies.map(c=><div key={c.id} className="co-chip" onClick={()=>openItem(c.id)} onContextMenu={e=>show(e,c)}>
      <span className="co-name">{c.title}</span>
      <button type="button" className="ghost co-x" title="Retirer" onClick={e=>{e.stopPropagation();del(c)}}>✕</button>
     </div>)}
    </div>:<div className="co-empty muted">Aucune entreprise pour l’instant. Clique sur « ＋ Ajouter » pour en saisir une.</div>}
   </section>

   <div className="inv-grid" style={{marginTop:22}}>{otherSections.map(s=><Section key={s.title} s={s}/>)}</div>
   {(otherFolders.length>0||loose.length>0)&&<div className="hsec" style={{marginTop:24}}>
    <h4>Autres</h4>
    <div className="hgrid hgrid-s">
     {otherFolders.map(f=><div className="hmini" key={f.id} onContextMenu={e=>show(e,f)}><Ic i={f}/><span>{f.title}</span></div>)}
     {loose.map(i=><div className="hmini" key={i.id} onClick={()=>openItem(i.id)} onContextMenu={e=>show(e,i)}><Ic i={i}/><span>{i.title}</span></div>)}
    </div>
   </div>}
  </>}
 </div>
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
 return <div className="login" style={{maxWidth:320}}><h1 style={{display:'flex',alignItems:'center',gap:10}}><img src="/logo-192.png" width="48" height="48" alt=""/> Notes</h1>
  <input placeholder="Email" value={e} onChange={x=>setE(x.target.value)}/>
  <input type="password" placeholder="Mot de passe" value={p} onChange={x=>setP(x.target.value)} onKeyDown={x=>x.key==='Enter'&&go(0)}/>
  <button className="on" onClick={()=>go(0)}>Connexion</button><button className="ghost" onClick={()=>go(1)}>Créer un compte</button></div>
}

function Main({user}){
 const [projs,setProjs]=useState([]),[pid,setPid]=useState(null),[items,setItems]=useState([]),[sel,setSel]=useState(null)
 const [dlg,setDlg]=useState(null),[menu,setMenu]=useState(null),[tabs,setTabs]=useState([]),[open,setOpen]=useState(true),[drop,setDrop]=useState(null),[share,setShare]=useState(null),[settings,setSettings]=useState(false),[online,setOnline]=useState([]),[w,setW]=useState(290)
 const [space,setSpace]=useState(()=>{try{return localStorage.getItem('space')||'notes'}catch{return 'notes'}})
 const switchSpace=s=>{setSpace(s);try{localStorage.setItem('space',s)}catch{};setSel(null);setTabs([])}
 const fi=useRef(),pp=useRef(null),drag=useRef(null),pch=useRef(null)
 const loadP=async()=>{const {data}=await supabase.from('projects').select('*');setProjs(data||[]);if(!pid&&data?.[0])setPid(data[0].id)}
 const loadI=async()=>{if(!pid)return;const {data}=await supabase.from('items').select('id,parent_id,type,title,color,closed,icon,pos,created_at,space').eq('project_id',pid).order('created_at');setItems((data||[]).filter(x=>x.type!=='board').map(x=>({...x,space:x.space||'notes'})))}
 useEffect(()=>{loadP()},[])
 useEffect(()=>{setSel(null);setTabs([]);loadI();if(!pid)return
  const ch=supabase.channel('items:'+pid).on('postgres_changes',{event:'*',schema:'public',table:'items',filter:'project_id=eq.'+pid},loadI).subscribe()
  return()=>supabase.removeChannel(ch)},[pid])

 const name=user.user_metadata?.name||user.email.split('@')[0]
 useEffect(()=>{const v=+localStorage.getItem('sbw');if(v)setW(v)},[])
 useEffect(()=>{if(!pid)return
  const ch=supabase.channel('presence:'+pid,{config:{presence:{key:user.id}}})
  ch.on('presence',{event:'sync'},()=>setOnline(Object.values(ch.presenceState()).map(a=>a[0])))
   .subscribe(st=>{if(st==='SUBSCRIBED'){pch.current=ch;ch.track({id:user.id,name,color:colorOf(user.email),item:null})}})
  return()=>{pch.current=null;setOnline([]);supabase.removeChannel(ch)}},[pid])
 useEffect(()=>{pch.current?.track({id:user.id,name,color:colorOf(user.email),item:sel})},[sel,name])
 const startRz=e=>{e.preventDefault();const mv=ev=>{const n=Math.max(200,Math.min(560,ev.clientX));setW(n);localStorage.setItem('sbw',n)}
  const up=()=>{removeEventListener('mousemove',mv);removeEventListener('mouseup',up)};addEventListener('mousemove',mv);addEventListener('mouseup',up)}
 const ask=(label,value,ok)=>setDlg({label,value,ok,k:Math.random()})
 const insert=async row=>{const {data,error}=await supabase.from('items').insert({project_id:pid,pos:Date.now(),space,...row}).select().single();if(error){alert(error.message+(String(error.message).includes('space')?'\n\n→ Exécute supabase/space.sql dans Supabase.':''));return null}return data?{...data,space:data.space||space}:null}
 const patch=(id,p)=>{setItems(l=>l.map(x=>x.id===id?{...x,...p}:x));supabase.from('items').update(p).eq('id',id).then(err)}
 const newProj=()=>ask('Nom du projet','',async name=>{const {data,error}=await supabase.from('projects').insert({name}).select().single();if(error)return alert(error.message);await loadP();setPid(data.id)})
 const code=projs.find(p=>p.id===pid)?.code
 const invite=()=>code?setShare(code):alert("Code introuvable : lance d'abord update2.sql dans Supabase.")
 const newCode=async()=>{const {data,error}=await supabase.rpc('new_code',{p_pid:pid});if(error){alert(error.message);return code}await loadP();return data}
 const joinProj=()=>ask('Code du projet','',async p_code=>{const {data,error}=await supabase.rpc('join_project',{p_code});if(error)return alert(error.message);await loadP();setPid(data)})
 const add=(type,parent_id)=>ask(NAMES[type],'',async title=>{await insert({type,title,parent_id});if(parent_id)patch(parent_id,{closed:false})})
 const addCompany=()=>ask('Nom de l’entreprise','',async title=>{
  if(!title)return
  let folder=spaceItems.find(i=>!i.parent_id&&i.type==='folder'&&(i.title||'').toLowerCase()==='entreprises à suivre')
  if(!folder){
   folder=await insert({type:'folder',title:'Entreprises à suivre',parent_id:null,color:'#007aff',icon:'📈'})
   if(!folder)return
   setItems(l=>[...l,{...folder,space}])
  }
  const page=await insert({type:'page',title,parent_id:folder.id,icon:'🏢'})
  if(page)setItems(l=>[...l,{...page,space}])
  if(folder.closed)patch(folder.id,{closed:false})
 })
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
 const spaceItems=items.filter(i=>(i.space||'notes')===space)
 const sibs=p=>spaceItems.filter(i=>i.parent_id===p).sort((a,b)=>key(a)-key(b))
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

 const cur=items.find(i=>i.id===sel&&(i.space||'notes')===space)
 const trail=i=>{const a=[];let c=items.find(x=>x.id===i.parent_id);while(c){a.unshift(c);c=items.find(x=>x.id===c.parent_id)}return a}
 const tabItems=tabs.map(id=>items.find(i=>i.id===id)).filter(i=>i&&(i.space||'notes')===space)
 const tree=parent=>sibs(parent).map(i=>{const f=i.type==='folder',z=drop&&drop.id===i.id?' dz-'+drop.zone:'';return <div key={i.id}>
  <div className={'row'+(sel===i.id?' on':'')+z} draggable
   onDragStart={e=>{drag.current=i.id;e.dataTransfer.setData('text/plain',i.id)}} onDragEnd={()=>{drag.current=null;setDrop(null)}}
   onDragOver={e=>{if(!drag.current)return;e.preventDefault();e.stopPropagation();setDrop({id:i.id,zone:zoneOf(e,f)})}}
   onDrop={e=>{if(!drag.current)return;e.preventDefault();e.stopPropagation();move(drag.current,i.id,zoneOf(e,f));drag.current=null;setDrop(null)}}
   onClick={()=>f?patch(i.id,{closed:!i.closed}):openItem(i.id)} onContextMenu={e=>show(e,i)}>
   <span className="t">{f&&<small>{i.closed?'▸':'▾'}</small>}<Ic i={i}/> {i.title}</span>
   <span className="act">{f&&<b onClick={e=>show(e,i,'new')}>＋</b>}<b onClick={e=>show(e,i)}>⋯</b></span></div>
  {f&&!i.closed&&<div className="kids">{tree(i.id)}</div>}</div>})
 const news=p=>[['📄 Nouvelle page',()=>add('page',p)],['📁 Nouveau dossier',()=>add('folder',p)],['📎 Importer un PDF',()=>pick(p)]]
 const m=menu&&menu.i&&items.find(x=>x.id===menu.i.id)
 const titleOf=id=>items.find(x=>x.id===id)?.title
 const pres=<div className="pres">{online.map(u=><i key={u.id} style={{background:u.color}} title={u.name+(u.id===user.id?' (toi)':'')+(u.item&&titleOf(u.item)?' · '+titleOf(u.item):'')}>{(u.name||'?')[0].toUpperCase()}</i>)}{online.length>0&&<small className="muted">{online.length} en ligne</small>}</div>
 return <div className="app" style={{gridTemplateColumns:open?w+'px 1fr':'1fr'}}
  onDragOver={e=>{if(pid&&[...e.dataTransfer.types].includes('Files'))e.preventDefault()}}
  onDrop={e=>{const f=[...e.dataTransfer.files].find(x=>x.type==='application/pdf');if(f&&pid){e.preventDefault();readPdf(f,null)}}}>
  {open&&<aside>
   <div className="rz" onMouseDown={startRz}/>
   <div className="head side-top"><img src="/logo-192.png" width="24" height="24" alt=""/><select value={pid||''} onChange={e=>setPid(e.target.value)}>{projs.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
    <button onClick={e=>show(e,null,'proj')} title="Nouveau projet ou rejoindre">＋</button>{pid&&<button onClick={invite} title="Partager (code)">👥</button>}
    <button className="ghost" onClick={()=>setOpen(false)} title="Masquer le menu">«</button></div>
   {pid&&<div className="side-spaces"><button type="button" className={space==='notes'?'on':''} onClick={()=>switchSpace('notes')}>📝 Notes</button><button type="button" className={space==='invest'?'on':''} onClick={()=>switchSpace('invest')}>📈 Invest</button></div>}
   {pid&&<div className="head side-nav"><button className={sel?'ghost':'on'} onClick={()=>setSel(null)}>🏠 Accueil</button><button className="on" onClick={e=>show(e,null,'new')}>＋ Nouveau</button></div>}
   {pres}
   <div className="tree" onContextMenu={e=>pid&&show(e,null,'new')} onDragOver={e=>drag.current&&e.preventDefault()}
    onDrop={e=>{if(drag.current){e.preventDefault();move(drag.current,null);drag.current=null;setDrop(null)}}}>{tree(null)}</div>
   <div className="head side-foot"><button className="ghost" onClick={()=>setSettings(true)}>⚙️ Paramètres</button><button className="ghost" onClick={()=>supabase.auth.signOut()}>Déconnexion</button></div></aside>}
  <section className="mainc">
   {!open&&<div className="tabs"><button className="ghost" onClick={()=>setOpen(true)} title="Afficher le menu">☰</button><button className="ghost" onClick={()=>setSel(null)} title="Accueil">🏠</button>
    {tabItems.map(t=><div key={t.id} className={'tab'+(sel===t.id?' on':'')} onClick={()=>setSel(t.id)}><Ic i={t}/><span>{t.title}</span>
     <b onClick={e=>{e.stopPropagation();closeTab(t.id)}}>✕</b></div>)}<span style={{marginLeft:'auto'}}>{pres}</span></div>}
   <main>{!pid?<p className="muted">Crée un projet, ou rejoins-en un avec un code, via « ＋ » en haut à gauche.</p>:!cur?(space==='invest'
     ?<InvestHome items={spaceItems} sibs={sibs} openItem={openItem} show={show} projName={projs.find(p=>p.id===pid)?.name||''} addCompany={addCompany} del={del}/>
     :<NotesHome items={spaceItems} sibs={sibs} openItem={openItem} show={show} projName={projs.find(p=>p.id===pid)?.name||''}/>)
    :<><div className="crumb"><a onClick={()=>setSel(null)}>🏠 Accueil</a>{trail(cur).map(t=><span key={t.id}> › {t.title}</span>)}</div><h2><span className="ic" onClick={e=>show(e,cur,'icon')} title="Choisir une icône">{cur.icon||<span className="muted">☺</span>}</span> {cur.title}</h2>
     {cur.type==='pdf'?<PdfView key={cur.id} id={cur.id} user={user} path={pid+'/'+cur.id+'.pdf'} title={cur.title}/>
     :<Editor key={cur.id} id={cur.id} user={user}/>}</>}</main></section>
  <input ref={fi} type="file" accept="application/pdf" hidden onChange={onPdf}/>
  {menu&&<div className="ov" onClick={()=>setMenu(null)} onContextMenu={e=>{e.preventDefault();setMenu(null)}}>
   <div className="menu" style={{left:menu.x,top:menu.y}} onClick={e=>e.stopPropagation()}>
    {menu.mode==='proj'?<>
     <div className="mi" onClick={()=>{setMenu(null);newProj()}}>➕ Nouveau projet</div>
     <div className="mi" onClick={()=>{setMenu(null);joinProj()}}>🔑 Rejoindre avec un code</div></>
    :menu.mode==='icon'&&m?<>
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
  {dlg&&<Dlg key={dlg.k} d={dlg} close={()=>setDlg(null)}/>}
  {share&&<ShareDlg code={share} pid={pid} onNew={newCode} close={()=>setShare(null)}/>}
  {settings&&<Settings user={user} close={()=>setSettings(false)}/>}</div>
}
