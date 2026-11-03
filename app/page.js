'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { colorOf } from '../lib/provider'
import Editor from '../components/Editor'
import PdfView from '../components/PdfView'
import WelcomeDashboard from '../components/WelcomeDashboard'
import SidebarNavigation from '../components/SidebarNavigation'
import { LiquidBackground, SquishSwitch, Presence, useTheme, GradientWaves } from '../components/Bits'
import { FxRoot, TextGenerate, Ticker, FxSearch } from '../components/Fx'

function SpaceBtn({ active, onClick, ico, label }) {
  return <button type="button" className={active ? 'on' : ''} onClick={onClick}>{ico} {label}</button>
}

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

const SET_SECS = [['profil', '👤', 'Profil'], ['apparence', '🎨', 'Apparence'], ['editeur', '✍️', 'Éditeur']]

function Settings({ user, close }) {
  const [sec, setSec] = useState('profil')
  const [n, setN] = useState(user.user_metadata?.name || ''), [st, setSt] = useState('')
  const [th, setTheme] = useTheme()
  const [tb, setTb] = useState(() => { try { return localStorage.getItem('tbpos') || 'center' } catch { return 'center' } })
  const setToolbar = p => { setTb(p); try { localStorage.setItem('tbpos', p) } catch {}; window.dispatchEvent(new Event('tbpos-change')) }
  const save = async () => { const { error } = await supabase.auth.updateUser({ data: { name: n.trim() } }); setSt(error ? error.message : '✓ Enregistré') }
  const shown = n.trim() || user.email.split('@')[0]
  useEffect(() => { const k = e => e.key === 'Escape' && close(); addEventListener('keydown', k); return () => removeEventListener('keydown', k) }, [])
  return <div className="ov" onClick={close}><div className="st-sheet" onClick={e => e.stopPropagation()}>
    <nav className="st-nav">
      <h3>Paramètres</h3>
      {SET_SECS.map(([k, ico, l]) => <button key={k} type="button" className={sec === k ? 'on' : ''} onClick={() => setSec(k)}><span>{ico}</span>{l}</button>)}
      <button type="button" className="st-out" onClick={() => supabase.auth.signOut()}><span>↪</span>Se déconnecter</button>
    </nav>
    <div className="st-main">
      <div className="st-body">
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

function TreeHome({ items, sibs, openItem, show, projName, space, addCompany, mapOnly = false }) {
  const SLOT = 128, LV = 132, STAG = 46, OFF = 120
  const GREENS = ['#5fae4f', '#7bbf5e', '#4c9a63', '#8fc45f', '#3f8f6b']
  const [q, setQ] = useState('')
  const [shut, setShut] = useState(() => { try { return JSON.parse(localStorage.getItem('homeShut') || '{}') } catch { return {} } })
  useEffect(() => { try { localStorage.setItem('homeShut', JSON.stringify(shut)) } catch {} }, [shut])
  const [view, setView] = useState({ x: 0, y: 70, k: 1 })
  const stage = useRef(null), drag = useRef(null), fitted = useRef(false)
  const needle = q.trim().toLowerCase()
  const allFolders = items.filter(i => i.type === 'folder')
  const folders = allFolders.filter(i => !i.parent_id)
  const nF = allFolders.length, nP = items.filter(i => i.type === 'page').length, nD = items.filter(i => i.type === 'pdf').length
  const recentItems = [...items].filter(i => i.type === 'page' || i.type === 'pdf').sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)).slice(0, 4)
  const totalItems = nP + nD
  const greeting = new Date().getHours() < 12 ? 'Bonjour' : new Date().getHours() < 18 ? 'Bon après-midi' : 'Bonsoir'
  const allShut = nF > 0 && folders.every(f => shut[f.id])

  // mise en page : le tronc est en bas, les dossiers sont des branches, les pages des feuilles
  const build = (pid, depth, color) => sibs(pid).map((i, k) => { const c = i.color || color || GREENS[k % GREENS.length]; return { i, depth, c, kids: i.type === 'folder' && (needle || !shut[i.id]) ? build(i.id, depth + 1, i.color || color || c) : [] } })
  let leaf = 0, maxD = 1
  const nodes = []
  const place = (n, parent) => {
    maxD = Math.max(maxD, n.depth)
    n.kids.forEach(k => place(k, n))
    n.x = n.kids.length ? (n.kids[0].x + n.kids[n.kids.length - 1].x) / 2 : leaf++ * SLOT
    n.parent = parent
    n.slot = Math.round(n.x / SLOT)
    nodes.push(n)
  }
  const tops = build(null, 1, null)
  tops.forEach(t => place(t, null))
  const rx = tops.length ? (tops[0].x + tops[tops.length - 1].x) / 2 : 0
  const ry = maxD * LV + 70, gy = ry + 120
  nodes.forEach(n => { n.y = (maxD - n.depth) * LV + 70 + (n.i.type !== 'folder' && n.slot % 2 ? -STAG : 0) })
  const Wd = Math.max(leaf - 1, 1) * SLOT + 2 * OFF, Hd = gy + 90

  const fit = () => {
    const el = stage.current
    if (!el) return
    const sw = el.clientWidth, sh = el.clientHeight
    const k = Math.max(0.35, Math.min(1, (sw * 0.94) / Wd, (sh - 90) / Hd))
    setView({ k, x: (sw - Wd * k) / 2, y: Math.max(70, sh - Hd * k - 6) })
  }
  useEffect(() => { if (!fitted.current && stage.current) { fitted.current = true; fit() } })
  useEffect(() => {
    const el = stage.current
    if (!el) return
    const h = e => {
      e.preventDefault()
      const r = el.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top
      setView(v => { const k = Math.max(0.3, Math.min(1.8, v.k * Math.exp(-e.deltaY * 0.0012))), s = k / v.k; return { k, x: mx - (mx - v.x) * s, y: my - (my - v.y) * s } })
    }
    el.addEventListener('wheel', h, { passive: false })
    return () => el.removeEventListener('wheel', h)
  }, [])
  const zoomBy = f => { const el = stage.current; if (!el) return; const mx = el.clientWidth / 2, my = el.clientHeight / 2; setView(v => { const k = Math.max(0.3, Math.min(1.8, v.k * f)), s = k / v.k; return { k, x: mx - (mx - v.x) * s, y: my - (my - v.y) * s } }) }
  const onNode = i => { if (i.type === 'folder') setShut(s => ({ ...s, [i.id]: !s[i.id] })); else openItem(i.id) }

  const a = rx + OFF
  const edge = n => {
    const x1 = (n.parent ? n.parent.x : rx) + OFF, y1 = n.parent ? n.parent.y : ry
    const x2 = n.x + OFF, y2 = n.y, dy = y1 - y2
    return `M${x1} ${y1} C${x1 + (x2 - x1) * 0.12} ${y1 - dy * 0.55} ${x2 - (x2 - x1) * 0.1} ${y2 + dy * 0.45} ${x2} ${y2}`
  }
  const bw = n => n.i.type === 'folder' ? Math.max(3.5, 13 - (n.depth - 1) * 3.5) : 2.2
  const trunk = `M${a - 34} ${gy + 8} C${a - 26} ${gy - 34} ${a - 17} ${ry + 70} ${a - 14} ${ry} L${a + 14} ${ry} C${a + 17} ${ry + 70} ${a + 26} ${gy - 34} ${a + 34} ${gy + 8} Z`
  return <div className={"th th-dashboard" + (mapOnly ? " th-map-only" : "")}>
    <div className="th-dashboard-content">
      {!mapOnly && <>
      <section className="th-welcome">
        <div className="th-welcome-copy">
          <div className="th-eyebrow"><span className="th-eyebrow-dot" /> ESPACE DE CONNAISSANCES <span className="th-eyebrow-sep">/</span> {space === 'invest' ? 'INVESTISSEMENT' : 'NOTES'}</div>
          <h1>{greeting}, <span>{(projName || 'bienvenue').split(' ')[0]}.</span></h1>
          <p>Un espace commun pour organiser vos idées, approfondir vos recherches et construire vos connaissances.</p>
        </div>
        <div className="th-welcome-actions">
          <button type="button" className="th-primary" onClick={e => show(e, null, 'new')}><span>＋</span> Créer un contenu</button>
          {space === 'invest' && addCompany && <button type="button" className="th-secondary" onClick={addCompany}>＋ Entreprise</button>}
        </div>
        <div className="th-orbit th-orbit-one" /><div className="th-orbit th-orbit-two" /><div className="th-orbit-core"><span>✳</span></div>
      </section>
      <section className="th-overview" aria-label="Vue d'ensemble">
        <div className="th-stat"><span className="th-stat-icon blue">▤</span><div><strong>{nF}</strong><small>Dossiers</small></div></div>
        <div className="th-stat"><span className="th-stat-icon violet">▧</span><div><strong>{nP}</strong><small>Pages</small></div></div>
        <div className="th-stat"><span className="th-stat-icon coral">▤</span><div><strong>{nD}</strong><small>Documents PDF</small></div></div>
        <div className="th-stat th-stat-wide"><span className="th-stat-icon green">⌁</span><div><strong>{totalItems + nF}</strong><small>Éléments dans cet espace</small></div><span className="th-stat-caption">Mis à jour en temps réel</span></div>
      </section>
      <section className="th-section">
        <div className="th-section-heading"><div><span className="th-section-kicker">VOTRE BIBLIOTHÈQUE</span><h2>Explorer les dossiers</h2></div><span className="th-section-note">{nF} espace{nF !== 1 ? 's' : ''} organisé{nF !== 1 ? 's' : ''}</span></div>
        {folders.length ? <div className="th-folder-grid">{folders.slice(0, 6).map((folder, idx) => { const count = sibs(folder.id).length; return <button type="button" key={folder.id} className="th-folder-card" style={{ '--folder-accent': folder.color || ['#6d9cff','#9b8af7','#65b99a','#e7a36f'][idx % 4], '--card-index': idx }} onClick={() => openItem(folder.id)} onContextMenu={e => show(e, folder)}>
          <span className="th-folder-symbol">{folder.icon || '▰'}</span><span className="th-folder-arrow">↗</span><strong>{folder.title}</strong><small>{count} élément{count !== 1 ? 's' : ''}</small><span className="th-folder-progress"><i style={{ width: `${Math.min(100, Math.max(12, count * 16))}%` }} /></span>
        </button> })}</div> : <div className="th-empty-inline"><span>▱</span><div><strong>Votre bibliothèque commence ici</strong><small>Créez un premier dossier pour structurer vos recherches.</small></div><button type="button" onClick={e => show(e, null, 'new')}>Créer un dossier</button></div>}
      </section>
      <section className="th-section th-recent-section">
        <div className="th-section-heading"><div><span className="th-section-kicker">REPRENDRE VOTRE TRAVAIL</span><h2>Documents récents</h2></div><span className="th-section-note">Les derniers contenus ajoutés</span></div>
        {recentItems.length ? <div className="th-recent-list">{recentItems.map((item, idx) => <button type="button" className="th-recent-row" key={item.id} onClick={() => openItem(item.id)}><span className={'th-recent-icon ' + (item.type === 'pdf' ? 'pdf' : 'page')}>{item.type === 'pdf' ? 'PDF' : 'Aa'}</span><span className="th-recent-title"><strong>{item.title}</strong><small>{item.type === 'pdf' ? 'Document PDF' : 'Note'}</small></span><span className="th-recent-date">{item.created_at ? new Date(item.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : 'Récemment'}</span><span className="th-recent-arrow">↗</span></button>)}</div> : <div className="th-recent-empty">Vos pages et PDF apparaîtront ici au fur et à mesure de vos recherches.</div>}
      </section>
      </>}
      <section className="th-map-section">
        <div className="th-section-heading th-map-heading"><div><span className="th-section-kicker">VUE D’ENSEMBLE</span><h2>Cartographie des connaissances</h2></div></div>
        <div className="th-map-panel">
    <div className="th-stage" ref={stage}
      onPointerDown={e => { if (e.target.closest('.tr-tag,.tr-leaf,.tr-sign,.th-bar,.th-zoom')) return; drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y }; e.currentTarget.setPointerCapture(e.pointerId) }}
      onPointerMove={e => { const d = drag.current; if (d) setView(v => ({ ...v, x: d.vx + e.clientX - d.x, y: d.vy + e.clientY - d.y })) }}
      onPointerUp={() => { drag.current = null }} onPointerCancel={() => { drag.current = null }}
      onContextMenu={e => show(e, null, 'new')}>
      <div className="th-canvas" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})` }}>
        <svg className="th-svg" width={Wd + 400} height={Hd} style={{ left: -200 }} viewBox={`-200 0 ${Wd + 400} ${Hd}`}>
          <ellipse className="tr-grass" cx={a} cy={gy + 26} rx={Wd / 2 + 180} ry={64} />
          <ellipse className="tr-soil" cx={a} cy={gy + 14} rx={86} ry={20} />
          <path className="tr-trunk" d={trunk} />
          <path className="tr-bark" d={`M${a - 8} ${gy - 10} C${a - 9} ${gy - 70} ${a - 6} ${ry + 80} ${a - 5} ${ry + 14}`} />
          <path className="tr-bark" d={`M${a + 9} ${gy - 18} C${a + 10} ${gy - 80} ${a + 7} ${ry + 90} ${a + 6} ${ry + 24}`} />
          {nodes.map(n => <path key={n.i.id} className="tr-br" d={edge(n)} pathLength="1" style={{ strokeWidth: bw(n), '--dl': n.depth * 180 + n.slot * 18 + 'ms' }} />)}
        </svg>
        <div className="tr-sign" style={{ left: a + 74, top: gy - 60 }}>
          <b>{projName || 'Mon espace'}</b>
          <small>{nF} dossier{nF > 1 ? 's' : ''} · {nP + nD} fichier{nP + nD > 1 ? 's' : ''}</small>
        </div>
        {nodes.map(n => {
          const i = n.i, f = i.type === 'folder', closed = f && !needle && !!shut[i.id]
          const hit = needle && (i.title || '').toLowerCase().includes(needle)
          const cls = (needle && !hit ? ' dim' : '') + (hit ? ' hit' : '')
          const dl = n.depth * 180 + n.slot * 18 + 500 + 'ms'
          const side = n.x < (n.parent ? n.parent.x : rx) ? -1 : 1
          const pos = { left: n.x + OFF, top: n.y, '--c': n.c, '--dl': dl }
          return f
            ? <div key={i.id} className={'tr-tag' + (closed ? ' shut' : '') + cls} style={pos} onClick={() => onNode(i)} onContextMenu={e => show(e, i)}>
              <span className="tr-em">{i.icon || '📁'}</span><span className="tr-t">{i.title}</span>
              <small className="tr-n">{sibs(i.id).length}</small>
              <span className="tr-act">
                <b onClick={e => { e.stopPropagation(); show(e, i, 'new') }}>＋</b>
                <b onClick={e => { e.stopPropagation(); openItem(i.id) }}>↗</b>
              </span>
            </div>
            : <div key={i.id} className={'tr-leaf' + cls} style={{ ...pos, '--rot': side * 5 + 'deg', '--sd': (n.slot % 5) * -1.1 + 's' }} onClick={() => onNode(i)} onContextMenu={e => show(e, i)}>
              <span className="tr-em"><Ic i={i} /></span><span className="tr-t">{i.title}</span>
            </div>
        })}
      </div>
    </div>
    <div className="th-bar">
      <FxSearch value={q} onChange={e => setQ(e.target.value)} placeholders={['Rechercher dans l\'arbre…', 'Un dossier, une page…', 'Un PDF, une idée…']} />
      <button type="button" className="btn-primary" onClick={e => show(e, null, 'new')}>＋ Nouveau</button>
      {space === 'invest' && addCompany && <button type="button" className="th-btn" onClick={addCompany}>＋ Entreprise</button>}
      {nF > 0 && <button type="button" className="th-btn" onClick={() => setShut(Object.fromEntries(folders.map(f => [f.id, !allShut])))}>{allShut ? 'Tout déplier' : 'Tout replier'}</button>}
      <span className="th-stats">
        <span className="stat-pill"><Ticker value={nF} /> dossier{nF !== 1 ? 's' : ''}</span>
        <span className="stat-pill"><Ticker value={nP} /> page{nP !== 1 ? 's' : ''}</span>
        {nD > 0 && <span className="stat-pill"><Ticker value={nD} /> PDF</span>}
      </span>
    </div>
    <div className="th-zoom">
      <button type="button" onClick={() => zoomBy(1 / 1.2)} aria-label="Zoom arrière">−</button>
      <button type="button" className="th-pct" onClick={fit} aria-label="Ajuster">{Math.round(view.k * 100)}%</button>
      <button type="button" onClick={() => zoomBy(1.2)} aria-label="Zoom avant">＋</button>
      <button type="button" onClick={fit} aria-label="Tout voir" title="Tout voir">⤢</button>
    </div>
        </div>
      </section>
    </div>
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
      <div style={{ position: 'absolute', left: 20, bottom: 20, zIndex: 3 }}><SquishSwitch /></div>
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
  const [tabs, setTabs] = useState([])
  const [open, setOpen] = useState(true)
  const [share, setShare] = useState(null)
  const [settings, setSettings] = useState(false)
  const [online, setOnline] = useState([])
  const [w, setW] = useState(280)
  const [section, setSection] = useState('home')
  const [space, setSpace] = useState(() => { try { return localStorage.getItem('space') || 'notes' } catch { return 'notes' } })
  const switchSpace = s => { setSpace(s); try { localStorage.setItem('space', s) } catch {}; setSel(null); setTabs([]); setSection('home') }
  const fi = useRef(), pp = useRef(null), pch = useRef(null)
  const loadP = async () => { const { data } = await supabase.from('projects').select('*'); setProjs(data || []); if (!pid && data?.[0]) setPid(data[0].id) }
  const loadI = async () => {
    if (!pid) return
    const { data } = await supabase.from('items').select('id,parent_id,type,title,color,closed,icon,pos,created_at,space').eq('project_id', pid).order('created_at')
    setItems((data || []).filter(x => x.type !== 'board').map(x => ({ ...x, space: x.space || 'notes' })))
  }
  useEffect(() => { loadP() }, [])
  useEffect(() => { setSel(null); setTabs([]); setSection('home'); loadI(); if (!pid) return; const ch = supabase.channel('items:' + pid).on('postgres_changes', { event: '*', schema: 'public', table: 'items', filter: 'project_id=eq.' + pid }, loadI).subscribe(); return () => supabase.removeChannel(ch) }, [pid])
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
  const openItem = id => { setSel(id); setTabs(t => t.includes(id) ? t : [...t, id]) }
  const closeTab = id => { const n = tabs.filter(x => x !== id); setTabs(n); if (sel === id) setSel(n[n.length - 1] || null) }
  const openFolder = id => openItem(id)
  const key = x => x.pos ?? new Date(x.created_at).getTime()
  const spaceItems = items.filter(i => (i.space || 'notes') === space)
  const sibs = p => spaceItems.filter(i => i.parent_id === p).sort((a, b) => key(a) - key(b))
  const cur = items.find(i => i.id === sel && (i.space || 'notes') === space)
  const trail = i => { const a = []; let c = items.find(x => x.id === i.parent_id); while (c) { a.unshift(c); c = items.find(x => x.id === c.parent_id) }; return a }
  const tabItems = tabs.map(id => items.find(i => i.id === id)).filter(i => i && (i.space || 'notes') === space)
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
        <div className="head side-top"><img src="/logo-192.png" width="24" height="24" alt="" />
          <select value={pid || ''} onChange={e => setPid(e.target.value)}>{projs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
          <button onClick={e => show(e, null, 'proj')} title="Nouveau projet ou rejoindre">＋</button>{pid && <button onClick={invite} title="Partager (code)">👥</button>}
          <button className="ghost" onClick={() => setOpen(false)} title="Masquer le menu">◀</button></div>
        {pid && <div className="side-spaces">
          <SpaceBtn active={space === 'notes'} onClick={() => switchSpace('notes')} ico="📝" label="Notes" name="Notes" />
          <SpaceBtn active={space === 'invest'} onClick={() => switchSpace('invest')} ico="📈" label="Invest" name="Invest" />
        </div>}
        {pid && <SidebarNavigation active={sel ? null : section} onChange={next => { setSection(next); setSel(null) }} onCreate={(e, folder) => show(e, folder, 'new')} items={spaceItems} activeItem={sel} onOpen={openItem} onOptions={show} />}
        <div className="side-foot">
          <SquishSwitch />
          <button type="button" className="me" onClick={() => setSettings(true)} title="Paramètres">
            <span className="me-av" style={{ background: colorOf(user.email) }}>{name[0].toUpperCase()}</span>
            <span className="me-name">{name}<small>Paramètres</small></span>
          </button>
        </div>
      </aside>}
      <div className="mainc">
        <div className="topbar">
          <button type="button" className="tb-ico" onClick={() => setOpen(o => !o)} title={open ? 'Masquer le menu' : 'Afficher le menu'}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M9 4v16" /></svg>
          </button>
          <div className="crumbs">
            <span>{projName || 'Aucun projet'}</span>
            {cur ? <>{trail(cur).map(t => <span key={t.id}><i>›</i> {t.title}</span>)}<i>›</i><b>{cur.title}</b></> : <><i>›</i><b>{{ home: 'Accueil', pages: 'Pages', pdf: 'PDF', map: 'Cartographie' }[section]}</b></>}
          </div>
          <div className="tb-spacer" />
          <Presence online={online} me={user.id} titleOf={titleOf} />
          <button type="button" className="tb-ico" onClick={() => setSettings(true)} title="Paramètres">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>
          </button>
        </div>
        {tabs.length > 0 && <div className="tabs">
          {tabItems.map(t => <div key={t.id} className={'tab' + (sel === t.id ? ' on' : '')} onClick={() => openItem(t.id)}>
            <span className="tab-ico"><Ic i={t} /></span>
            <span className="tab-title">{t.title}</span>
            <span className="tab-close" onClick={e => { e.stopPropagation(); closeTab(t.id) }}>✕</span>
          </div>)}
        </div>}
        <main className={cur && (cur.type === 'page' || cur.type === 'pdf') ? 'paper' : !sel ? 'full' : ''}>
          <div className="workspace">
            {!pid ? <div className="dash-empty">
              <div className="dash-empty-ico">🚀</div>
              <h3>Bienvenue !</h3>

              <div className="btns">
                <button className="btn-primary btn-glow" onClick={newProj}>＋ Nouveau projet</button>
                <button className="ghost" onClick={joinProj}>🔗 Rejoindre un projet</button>
              </div>
            </div> : !sel ? <WelcomeDashboard section={section} items={spaceItems} sibs={sibs} openItem={openItem} show={show} projName={projName} space={space} addCompany={addCompany} name={name}><TreeHome mapOnly items={spaceItems} sibs={sibs} openItem={openItem} show={show} projName={projName} space={space} addCompany={addCompany} /></WelcomeDashboard> : cur?.type === 'pdf' ? <PdfView key={cur.id} id={cur.id} user={user} path={pid + '/' + cur.id + '.pdf'} title={cur.title} /> : cur?.type === 'page' ? <Editor key={cur.id} id={cur.id} user={user} projectId={pid} /> : cur?.type === 'folder' ? <FolderView folder={cur} sibs={sibs} openItem={openItem} openFolder={openFolder} show={show} items={items} /> : null}
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
      {settings && <Settings user={user} close={() => setSettings(false)} />}
      <input type="file" accept=".pdf" ref={fi} onChange={onPdf} style={{ display: 'none' }} />
    </div>
  )
}
