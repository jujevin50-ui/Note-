'use client'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { colorOf } from '../lib/provider'
import Editor from '../components/Editor'
import PdfView from '../components/PdfView'
import WelcomeDashboard from '../components/WelcomeDashboard'
import SidebarNavigation from '../components/SidebarNavigation'
import HomeGreeting from '../components/HomeGreeting'
import { LiquidBackground, SquishSwitch, Presence, useTheme, GradientWaves } from '../components/Bits'
import { FxRoot, TextGenerate } from '../components/Fx'

const COLORS = ['#f59e0b', '#ef4444', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#64748b']
const NAMES = { page: 'Nom de la page', folder: 'Nom du dossier' }
const EMOJIS = '\ud83d\udcc4 \ud83d\udcdd \ud83d\udccc \ud83d\udcce \ud83d\udcc5 \ud83d\udcca \ud83d\udcc8 \ud83d\udcda \ud83d\udcd6 \ud83d\udcd5 \ud83d\udca1 \u2b50 \u2705 \u2757 \u2753 \ud83c\udfaf \ud83d\ude80 \ud83d\udd25 \ud83d\udcb0 \ud83d\udee0\ufe0f \ud83e\udde0 \ud83d\udcac \ud83d\udcc1 \ud83d\uddc2\ufe0f \ud83e\uddfe \ud83d\udd12 \ud83c\udfe0 \u2708\ufe0f \ud83c\udf7d\ufe0f \u2764\ufe0f \ud83c\udf93 \ud83e\uddea'.split(' ')

const Folder = ({ c = '#f59e0b' }) => <svg width="16" height="14" viewBox="0 0 16 14" style={{ flex: 'none' }}><path d="M1 1.5h5l1.5 1.5H15v9.5H1z" fill={c} /></svg>
const err = ({ error }) => error && alert(error.message)
const Doc = ({ c }) => <svg width="14" height="16" viewBox="0 0 14 16" style={{ flex: 'none' }}><path d="M1 1h8l4 4v10H1z" fill={c} /><path d="M9 1v4h4" fill="rgba(255,255,255,.45)" /></svg>
const Ic = ({ i }) => i.icon ? <span>{i.icon}</span> : i.type === 'folder' ? <Folder c={i.color} /> : i.type === 'pdf' ? <Doc c={i.color || '#ef4444'} /> : <span>📄</span>

function Dlg({ d, close }) {
  const [v, setV] = useState(d.value || '')
  const ok = () => { if (d.confirm || v.trim()) { d.ok(v.trim()); close() } }
  return <div className="ov" onClick={close}><div className="dlg" onClick={e => e.stopPropagation()}>
    <h3>{d.label}</h3>
    {!d.confirm && <input autoFocus autoComplete="off" name="nom-note" value={v} onChange={e => setV(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') ok(); if (e.key === 'Escape') close() }} />}
    <div className="btns"><button className="ghost" onClick={close}>Annuler</button><button className="on" onClick={ok}>{d.confirm ? 'Supprimer' : 'OK'}</button></div></div></div>
}

function ShareDlg({ code, pid, onNew, close }) {
  const [c, setC] = useState(code), [ok, setOk] = useState(false), [members, setMembers] = useState([]), [loading, setLoading] = useState(true), [memberError, setMemberError] = useState('')
  useEffect(() => { let live = true; supabase.rpc('project_members_info', { p_pid: pid }).then(({ data, error }) => { if (!live) return; if (error) setMemberError('Membres indisponibles'); else setMembers(data || []); setLoading(false) }); return () => { live = false } }, [pid])
  return <div className="ov" onClick={close}><div className="dlg share-dialog" onClick={e => e.stopPropagation()}>
    <h3>Partager l'espace</h3>
    <label className="muted">Code pour inviter un membre</label>
    <input readOnly value={c} onFocus={e => e.target.select()} style={{ fontSize: 22, letterSpacing: 3, textAlign: 'center' }} />

    <div className="btns"><button className="ghost" onClick={async () => setC(await onNew())}>Nouveau code</button>
      <button onClick={() => { navigator.clipboard.writeText(c); setOk(true) }}>{ok ? 'Copié ✓' : 'Copier le code'}</button></div>
    <hr className="share-divider" />
    <h3>Membres de cet espace</h3>
    {loading ? <p className="muted">Chargement des membres…</p> :
      memberError ? <p className="muted">{memberError}</p> : members.length ? <div className="member-list">{members.map(m => <div className="member-row" key={m.user_id}><span className="member-avatar">{m.name?.slice(0, 1).toUpperCase() || m.email?.slice(0, 1).toUpperCase() || '?'}</span><span><b>{m.name || 'Membre'}</b><small>{m.email || m.user_id}</small></span>{m.is_owner && <span className="member-owner">Propriétaire</span>}</div>)}</div> : <p className="muted">Aucun membre trouvé.</p>}
    <div className="btns"><button className="on" onClick={close}>Fermer</button></div></div></div>
}

const SET_SECS = [['projet', '◈', 'Projet'], ['profil', '👤', 'Profil'], ['apparence', '🎨', 'Apparence'], ['editeur', '✍️', 'Éditeur']]

function Settings({ user, close, projects, projectId, onProjectChange, onCreateProject, onJoinProject, onShareProject }) {
  const [sec, setSec] = useState('projet')
  const [n, setN] = useState(user.user_metadata?.name || ''), [st, setSt] = useState('')
  const [th, setTheme] = useTheme()
  const [tb, setTb] = useState(() => { try { return localStorage.getItem('tbpos') || 'center' } catch { return 'center' } })
  const setToolbar = p => { setTb(p); try { localStorage.setItem('tbpos', p) } catch {}; window.dispatchEvent(new Event('tbpos-change')) }
  const save = async () => { const { error } = await supabase.auth.updateUser({ data: { name: n.trim() } }); setSt(error ? error.message : '✓ Enregistré') }
  const shown = n.trim() || user.email.split('@')[0]
  useEffect(() => { const k = e => e.key === 'Escape' && close(); addEventListener('keydown', k); return () => removeEventListener('keydown', k) }, [])
  return <div className="ov" onClick={close}><div className="st-sheet" role="dialog" aria-modal="true" aria-label="Paramètres" onClick={e => e.stopPropagation()}>
    <nav className="st-nav">
      <h3>Paramètres</h3>
      {SET_SECS.map(([k, ico, l]) => <button key={k} type="button" className={sec === k ? 'on' : ''} onClick={() => setSec(k)}><span>{ico}</span>{l}</button>)}
      <button type="button" className="st-out" onClick={() => supabase.auth.signOut()}><span>↪</span>Se déconnecter</button>
    </nav>
    <div className="st-main">
      <div className="st-body">
        {sec === 'projet' && <>
          <h2>Projet</h2>
          <div className="project-preference">
            <label htmlFor="settings-project">Projet actif</label>
            <select id="settings-project" value={projectId || ''} onChange={e => onProjectChange(e.target.value)}>
              {!projects.length && <option value="">Aucun projet</option>}
              {projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
            <div className="project-preference-actions">
              <button type="button" onClick={() => { close(); onCreateProject() }}>Nouveau projet</button>
              <button type="button" onClick={() => { close(); onJoinProject() }}>Rejoindre un projet</button>
              {projectId && <button type="button" onClick={() => { close(); onShareProject() }}>Partager</button>}
            </div>
          </div>
        </>}
        {sec === 'profil' && <>
          <h2>Profil</h2>
          <div className="st-profile">
            <span className="me-av" style={{ background: colorOf(user.email) }}>{shown[0].toUpperCase()}</span>
            <div><b style={{ fontSize: 17 }}>{shown}</b><div className="muted" style={{ fontSize: 13 }}>{user.email}</div></div>
          </div>
          <div className="st-field"><label>Nom d'utilisateur</label>
            <input autoFocus autoComplete="off" name="nom-utilisateur" value={n} placeholder={user.email.split('@')[0]} onChange={e => setN(e.target.value)} onKeyDown={e => e.key === 'Enter' && save()} /></div>
          <div className="st-field"><label>Email</label><input readOnly value={user.email} /></div>
        </>}
        {sec === 'apparence' && <>
          <h2>Apparence</h2>
          <div className="st-cards">
            {[['light', 'Clair'], ['dark', 'Sombre']].map(([k, l]) => <button key={k} type="button" className={'st-card' + (th === k ? ' on' : '')} onClick={() => setTheme(k)}>
              <span className={'st-prev ' + k}><i /><i /></span>{l}</button>)}
          </div>
          <div className="st-field"><label>Raccourci</label><div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><SquishSwitch /></div></div>
        </>}
        {sec === 'editeur' && <>
          <h2>Éditeur</h2>
          <div className="st-cards">
            <button type="button" className={'st-card' + (tb === 'center' ? ' on' : '')} onClick={() => setToolbar('center')}><span className="st-prev tb-c"><b /></span>Centre (en haut)</button>
            <button type="button" className={'st-card' + (tb === 'right' ? ' on' : '')} onClick={() => setToolbar('right')}><span className="st-prev tb-r"><b /></span>Droite (verticale)</button>
          </div>
        </>}
      </div>
      <div className="st-foot">
        <span className="st-msg">{st}</span>
        <button type="button" className="st-btn" onClick={close}>Fermer</button>
        {sec === 'profil' && <button type="button" className="st-btn pri" onClick={save}>Enregistrer</button>}
      </div>
    </div>
  </div></div>
}

const INV_SECTIONS = [
  { title: 'Entreprises à suivre', icon: '📈', color: '#007aff' },
  { title: 'Analyses', icon: '🔍', color: '#ff9500' },
  { title: 'Journal', icon: '📓', color: '#34c759' },
  { title: 'Concepts', icon: '💡', color: '#af52de' },
  { title: 'Sources', icon: '📰', color: '#ff3b30' },
  { title: 'Portefeuille', icon: '💰', color: '#30b0c7' },
  { title: 'Objectifs', icon: '🎯', color: '#5856d6' },
  { title: 'Questions', icon: '❓', color: '#8e8e93' },
]

function FolderView({ folder, sibs, openItem, openFolder, show, items }) {
  const kids = sibs(folder.id)
  const folders = kids.filter(i => i.type === 'folder')
  const files = kids.filter(i => i.type !== 'folder')
  return <div className="home home-in">
    <header className="dash-hd dash-hd-sm">
      <div>
        <p className="dash-kicker">Dossier</p>
        <h1><TextGenerate text={folder.title} /></h1>
        <p className="dash-sub muted">{kids.length ? kids.length + ' élément' + (kids.length > 1 ? 's' : '') : 'Aucun contenu'}</p>
      </div>
      <button type="button" className="btn-primary btn-glow" onClick={e => show(e, folder, 'new')}>＋ Ajouter</button>
    </header>
    {!kids.length ? <div className="dash-empty">
      <div className="dash-empty-ico">📁</div>
      <h3>Dossier vide</h3>

    </div> : <div className="tile-grid">
      {folders.map(i => <button type="button" className="tile tile-folder" key={i.id} onClick={() => openFolder(i.id)} onContextMenu={e => show(e, i)}>
        <span className="tile-ico" style={{ '--c': i.color || '#f59e0b' }}><Ic i={i} /></span>
        <span className="tile-body"><b>{i.title}</b><small className="muted">{sibs(i.id).length} élément{sibs(i.id).length !== 1 ? 's' : ''}</small></span>
        <span className="tile-chev">›</span>
      </button>)}
      {files.map(i => <button type="button" className="tile" key={i.id} onClick={() => openItem(i.id)} onContextMenu={e => show(e, i)}>
        <span className="tile-ico" style={{ '--c': i.color || (i.type === 'pdf' ? '#ef4444' : '#3b82f6') }}><Ic i={i} /></span>
        <span className="tile-body"><b>{i.title}</b><small className="muted">{i.type === 'pdf' ? 'PDF' : 'Page'}</small></span>
      </button>)}
    </div>}
  </div>
}

function Login() {
  const [e, setE] = useState('')
  const [p, setP] = useState('')
  const [busy, setBusy] = useState(0)
  const go = async up => {
    setBusy(up ? 2 : 1)
    const a = { email: e, password: p }
    const { error } = await (up ? supabase.auth.signUp(a) : supabase.auth.signInWithPassword(a))
    setBusy(0)
    if (error) alert(error.message)
  }
  return (
    <div className="login-stage">
      <div className="aurora" aria-hidden />
      <LiquidBackground />
      <div style={{ position: 'absolute', right: 20, top: 20, zIndex: 3 }}><SquishSwitch /></div>
      <form className="login login-card" onSubmit={x => { x.preventDefault(); go(0) }}>
        <div className="login-brand">
          <img src="/logo-192.png" width="44" height="44" alt="" />
          <h1><TextGenerate text="Notes" /></h1>
        </div>
        <input placeholder="Email" type="email" autoComplete="email" value={e} onChange={x => setE(x.target.value)} />
        <input type="password" placeholder="Mot de passe" autoComplete="current-password" value={p} onChange={x => setP(x.target.value)} />
        <button type="submit" className="on btn-glow" disabled={!!busy}><span>{busy === 1 ? 'Connexion…' : 'Connexion'}</span></button>
        <button type="button" className="ghost" disabled={!!busy} onClick={() => go(1)}>{busy === 2 ? 'Création…' : 'Créer un compte'}</button>
      </form>
    </div>
  )
}

export default function App() {
  const [s, setS] = useState(null), [ready, setReady] = useState(false)
  useEffect(() => { supabase.auth.getSession().then(({ data }) => { setS(data.session); setReady(true) }); const { data } = supabase.auth.onAuthStateChange((_, x) => setS(x)); return () => data.subscription.unsubscribe() }, [])
  if (!ready) return null
  return <><FxRoot />{s ? <Main user={s.user} /> : <Login />}</>
}

function Main({ user }) {
  const [projs, setProjs] = useState([])
  const [pid, setPid] = useState(null)
  const [items, setItems] = useState([])
  const [sel, setSel] = useState(null)
  const [dlg, setDlg] = useState(null)
  const [menu, setMenu] = useState(null)
  const [open, setOpen] = useState(true)
  const [share, setShare] = useState(null)
  const [settings, setSettings] = useState(false)
  const [online, setOnline] = useState([])
  const [w, setW] = useState(280)
  const [section, setSection] = useState('home')
  const [space, setSpace] = useState(() => { try { return localStorage.getItem('space') || 'notes' } catch { return 'notes' } })
  const switchSpace = s => { setSpace(s); try { localStorage.setItem('space', s) } catch {}; setSel(null); setSection('home') }
  const fi = useRef(), pp = useRef(null), pch = useRef(null)
  const loadP = async () => { const { data } = await supabase.from('projects').select('*'); setProjs(data || []); if (!pid && data?.[0]) setPid(data[0].id) }
  const loadI = async () => {
    if (!pid) return
    const { data } = await supabase.from('items').select('id,parent_id,type,title,color,closed,icon,pos,created_at,space').eq('project_id', pid).order('created_at')
    setItems((data || []).filter(x => x.type !== 'board').map(x => ({ ...x, space: x.space || 'notes' })))
  }
  useEffect(() => { loadP() }, [])
  useEffect(() => { setSel(null); setSection('home'); loadI(); if (!pid) return; const ch = supabase.channel('items:' + pid).on('postgres_changes', { event: '*', schema: 'public', table: 'items', filter: 'project_id=eq.' + pid }, loadI).subscribe(); return () => supabase.removeChannel(ch) }, [pid])
  const name = user.user_metadata?.name || user.email.split('@')[0]
  useEffect(() => { const v = +localStorage.getItem('sbw'); if (v) setW(Math.max(240, Math.min(440, v))) }, [])
  useEffect(() => {
    if (!pid) return
    const ch = supabase.channel('presence:' + pid, { config: { presence: { key: user.id } } })
    ch.on('presence', { event: 'sync' }, () => setOnline(Object.values(ch.presenceState()).map(a => a[0])))
      .subscribe(st => { if (st === 'SUBSCRIBED') { pch.current = ch; ch.track({ id: user.id, name, color: colorOf(user.email), item: null }) } })
    return () => { pch.current = null; setOnline([]); supabase.removeChannel(ch) }
  }, [pid])
  useEffect(() => { pch.current?.track({ id: user.id, name, color: colorOf(user.email), item: sel }) }, [sel, name])
  const startRz = e => { e.preventDefault(); const mv = ev => { const n = Math.max(240, Math.min(440, ev.clientX)); setW(n); localStorage.setItem('sbw', n) }; const up = () => { removeEventListener('mousemove', mv); removeEventListener('mouseup', up) }; addEventListener('mousemove', mv); addEventListener('mouseup', up) }
  const ask = (label, value, ok) => setDlg({ label, value, ok, k: Math.random() })
  const insert = async row => { const { data, error } = await supabase.from('items').insert({ project_id: pid, pos: Date.now(), space, ...row }).select().single(); if (error) { alert('Impossible de créer ce contenu.'); return null }; return data ? { ...data, space: data.space || space } : null }
  const patch = (id, p) => { setItems(l => l.map(x => x.id === id ? { ...x, ...p } : x)); supabase.from('items').update(p).eq('id', id).then(err) }
  const newProj = () => ask('Nom du projet', '', async name => { const { data, error } = await supabase.from('projects').insert({ name }).select().single(); if (error) return alert(error.message); await loadP(); setPid(data.id) })
  const code = projs.find(p => p.id === pid)?.code
  const invite = () => code ? setShare(code) : alert("Partage indisponible.")
  const newCode = async () => { const { data, error } = await supabase.rpc('new_code', { p_pid: pid }); if (error) { alert(error.message); return code } await loadP(); return data }
  const joinProj = () => ask('Code du projet', '', async p_code => { const { data, error } = await supabase.rpc('join_project', { p_code }); if (error) return alert(error.message); await loadP(); setPid(data) })
  const add = (type, parent_id) => ask(NAMES[type], '', async title => { await insert({ type, title, parent_id }); if (parent_id) patch(parent_id, { closed: false }) })
  const addCompany = () => ask('Nom de l\'entreprise', '', async title => {
    if (!title) return
    let folder = spaceItems.find(i => !i.parent_id && i.type === 'folder' && (i.title || '').toLowerCase() === 'entreprises à suivre')
    if (!folder) { folder = await insert({ type: 'folder', title: 'Entreprises à suivre', parent_id: null, color: '#007aff', icon: '📈' }); if (!folder) return; setItems(l => [...l, { ...folder, space }]) }
    const page = await insert({ type: 'page', title, parent_id: folder.id, icon: '📊' }); if (page) setItems(l => [...l, { ...page, space }]); if (folder.closed) patch(folder.id, { closed: false })
  })
  const ren = i => ask('Renommer', i.title, title => patch(i.id, { title }))
  const del = i => setDlg({ label: `Supprimer « ${i.title} » et son contenu ?`, confirm: true, k: Math.random(), ok: async () => { if (i.type === 'pdf') supabase.storage.from('pdfs').remove([pid + '/' + i.id + '.pdf']); await supabase.from('items').delete().eq('id', i.id); if (sel === i.id) setSel(null) } })
  const readPdf = async (f, parent_id) => { const row = await insert({ type: 'pdf', title: f.name.replace(/.pdf$/i, ''), parent_id }); if (!row) return; const { error } = await supabase.storage.from('pdfs').upload(pid + '/' + row.id + '.pdf', f, { contentType: 'application/pdf' }); if (error) { alert("Envoi du PDF impossible : " + error.message); await supabase.from('items').delete().eq('id', row.id) } }
  const pick = p => { pp.current = p; fi.current.click() }
  const onPdf = e => { const f = e.target.files[0]; e.target.value = ''; if (f) readPdf(f, pp.current) }
  const show = (e, i, mode) => { e.preventDefault(); e.stopPropagation(); setMenu({ x: Math.min(e.clientX, innerWidth - 230), y: Math.min(e.clientY, innerHeight - 340), i, mode }) }
  const openItem = id => setSel(id)
  const openFolder = id => openItem(id)
  const key = x => x.pos ?? new Date(x.created_at).getTime()
  const spaceItems = items.filter(i => (i.space || 'notes') === space)
  const sibs = p => spaceItems.filter(i => i.parent_id === p).sort((a, b) => key(a) - key(b))
  const cur = items.find(i => i.id === sel && (i.space || 'notes') === space)
  const trail = i => { const a = []; let c = items.find(x => x.id === i.parent_id); while (c) { a.unshift(c); c = items.find(x => x.id === c.parent_id) }; return a }
  const sideW = open ? w : 0
  const news = p => [['📄 Nouvelle page', () => add('page', p)], ['📁 Nouveau dossier', () => add('folder', p)], ['📎 Importer un PDF', () => pick(p)]]
  const m = menu && menu.i && items.find(x => x.id === menu.i.id)
  const titleOf = id => items.find(x => x.id === id)?.title
  const projName = projs.find(p => p.id === pid)?.name
  return (
    <div className="app" style={{ gridTemplateColumns: open ? sideW + 'px 1fr' : '1fr' }}
      onDragOver={e => { if (pid && [...e.dataTransfer.types].includes('Files')) e.preventDefault() }}
      onDrop={e => { const f = [...e.dataTransfer.files].find(x => x.type === 'application/pdf'); if (f && pid) { e.preventDefault(); readPdf(f, null) } }}>
      {open && <aside className="side-cols">
        <div className="plasma-wrap" aria-hidden><GradientWaves /><span className="plasma-veil" /></div>
        <div className="rz" onMouseDown={startRz} />
        <SidebarNavigation space={space} onSpaceChange={next => { switchSpace(next); setSection('library') }} active={sel ? null : section} onChange={next => { setSection(next); setSel(null) }} onCreate={(e, folder) => pid ? show(e, folder, 'new') : setSettings(true)} items={spaceItems} activeItem={sel} onOpen={openItem} onOptions={show} />
      </aside>}
      <div className="mainc">
        <div className="topbar">
          <button type="button" className="tb-ico" onClick={() => setOpen(o => !o)} title={open ? 'Masquer le menu' : 'Afficher le menu'}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M9 4v16" /></svg>
          </button>
          <nav className="crumbs" aria-label="Chemin du dossier">
            {(section !== 'home' || cur) && <button type="button" className="active-space-name" onClick={() => { setSection('library'); setSel(null) }} title="Revenir à la racine">{space === 'invest' ? 'Invest' : 'Notes'}</button>}
            {cur ? <>{trail(cur).map(t => <span className="crumb-parent" key={t.id}><i aria-hidden="true">›</i><button type="button" onClick={() => openFolder(t.id)} title={'Revenir au dossier ' + t.title}>{t.title}</button></span>)}<i aria-hidden="true">›</i><b aria-current="page" title={cur.title}>{cur.title}</b></> : <><i aria-hidden="true">›</i><b aria-current="page">{{ home: 'Accueil', library: space === 'invest' ? 'Invest' : 'Notes', pages: 'Pages', pdf: 'PDF' }[section]}</b></>}
          </nav>
          <div className="tb-spacer" />
          <Presence online={online} me={user.id} titleOf={titleOf} />
          <button type="button" className="tb-ico" onClick={() => setSettings(true)} title="Paramètres">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>
          </button>
          <SquishSwitch />
        </div>
        <main className={cur && (cur.type === 'page' || cur.type === 'pdf') ? 'paper' : !sel ? 'full' : ''}>
          <div className="workspace">
            {section === 'home' && !sel ? <HomeGreeting name={name} /> : !pid ? <div className="dash-empty"><h3>Aucun projet</h3><button type="button" className="btn-primary" onClick={() => setSettings(true)}>Paramètres</button></div> : !sel ? <WelcomeDashboard section={section} items={spaceItems} sibs={sibs} openItem={openItem} show={show} projName={projName} space={space} addCompany={addCompany} name={name} /> : cur?.type === 'pdf' ? <PdfView key={cur.id} id={cur.id} user={user} path={pid + '/' + cur.id + '.pdf'} title={cur.title} /> : cur?.type === 'page' ? <Editor key={cur.id} id={cur.id} user={user} projectId={pid} /> : cur?.type === 'folder' ? <FolderView folder={cur} sibs={sibs} openItem={openItem} openFolder={openFolder} show={show} items={items} /> : null}
          </div>
        </main>
      </div>
      {menu && <div className="ctx-menu" style={{ left: menu.x, top: menu.y }} onClick={() => setMenu(null)}>
        {menu.mode === 'new' ? news(menu.i?.id).map(([l, a]) => <div key={l} className="ctx-item" onClick={e => { e.stopPropagation(); a(); setMenu(null) }}><span>{l}</span></div>) : menu.mode === 'proj' ? <>
          <div className="ctx-item" onClick={e => { e.stopPropagation(); newProj(); setMenu(null) }}><span>＋ Nouveau projet</span></div>
          <div className="ctx-item" onClick={e => { e.stopPropagation(); joinProj(); setMenu(null) }}><span>🔗 Rejoindre un projet</span></div>
          {pid && <div className="ctx-item" onClick={e => { e.stopPropagation(); invite(); setMenu(null) }}><span>👥 Partager</span></div>}
        </> : m && <>
          <div className="ctx-item" onClick={e => { e.stopPropagation(); openItem(m.id); setMenu(null) }}><span>👁️ Ouvrir</span></div>
          {m.type !== 'folder' && <div className="ctx-item" onClick={e => { e.stopPropagation(); ren(m); setMenu(null) }}><span>✏️ Renommer</span></div>}
          <div className="ctx-item" onClick={e => { e.stopPropagation(); del(m); setMenu(null) }}><span style={{ color: '#ef4444' }}>🗑️ Supprimer</span></div>
          {m.type === 'folder' && <>
            <div className="ctx-item" onClick={e => { e.stopPropagation(); add('page', m.id); setMenu(null) }}><span>📄 Nouvelle page</span></div>
            <div className="ctx-item" onClick={e => { e.stopPropagation(); add('folder', m.id); setMenu(null) }}><span>📁 Nouveau dossier</span></div>
            <div className="ctx-item" onClick={e => { e.stopPropagation(); pick(m.id); setMenu(null) }}><span>📎 Importer PDF</span></div>
          </>}
        </>}
        <div className="ctx-item" onClick={e => { e.stopPropagation(); setMenu(null) }}><span>✕ Annuler</span></div>
      </div>}
      {dlg && <Dlg d={dlg} close={() => setDlg(null)} />}
      {share && <ShareDlg code={share} pid={pid} onNew={newCode} close={() => setShare(null)} />}
      {settings && <Settings user={user} projects={projs} projectId={pid} onProjectChange={setPid} onCreateProject={newProj} onJoinProject={joinProj} onShareProject={invite} close={() => setSettings(false)} />}
      <input type="file" accept=".pdf" ref={fi} onChange={onPdf} style={{ display: 'none' }} />
    </div>
  )
}
