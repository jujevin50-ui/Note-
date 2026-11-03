'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { colorOf } from '../lib/provider'
import Editor from '../components/Editor'
import PdfView from '../components/PdfView'
import { LiquidBackground, SquishSwitch, BlurText, ShinyText, GradientText, Presence, useTheme, FolderBits, GradientWaves } from '../components/Bits'
import { FxRoot, TextGenerate, Ticker, FxSearch } from '../components/Fx'

// Composant Bouton Espace avec animation
function SpaceBtn({ active, onClick, ico, label, name }) {
  const [show, setShow] = useState(false)
  const [tilt, setTilt] = useState({ tx: 0, ry: 0 })
  const btnRef = useRef(null)
  const onMove = useCallback(e => {
    if (!btnRef.current) return
    const r = btnRef.current.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    setTilt({ tx: x * 12, ry: x * 18 })
  }, [])
  return (
    <button type="button" ref={btnRef} className={active ? 'on' : ''} onClick={onClick}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => { setShow(false); setTilt({ tx: 0, ry: 0 }) }}
      onMouseMove={onMove} title={name}>
      {ico} {label}
      <span className={'liq-tooltip' + (show ? ' show' : '')} style={{ '--tx': tilt.tx + 'px', '--ry': tilt.ry + 'deg' }}>
        <span className="liq-ico">{ico}</span>{name}
      </span>
    </button>
  )
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
  useEffect(() => { let live = true; supabase.rpc('project_members_info', { p_pid: pid }).then(({ data, error }) => { if (!live) return; if (error) setMemberError('Pour afficher les noms et emails, exécute le fichier supabase/project_members_info.sql dans Supabase.'); else setMembers(data || []); setLoading(false) }); return () => { live = false } }, [pid])
  return <div className="ov" onClick={close}><div className="dlg share-dialog" onClick={e => e.stopPropagation()}>
    <h3>Partager l'espace</h3>
    <label className="muted">Code pour inviter un membre</label>
    <input readOnly value={c} onFocus={e => e.target.select()} style={{ fontSize: 22, letterSpacing: 3, textAlign: 'center' }} />
    <p className="muted" style={{ margin: 0 }}>La personne crée son compte, clique sur + puis « Rejoindre avec un code » et saisit ce code.</p>
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
          <p className="st-sub">Ton nom apparaît sur ton curseur et dans la liste « en ligne ».</p>
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
          <p className="st-sub">Le thème est enregistré sur cet appareil.</p>
          <div className="st-cards">
            {[['light', 'Clair'], ['dark', 'Sombre']].map(([k, l]) => <button key={k} type="button" className={'st-card' + (th === k ? ' on' : '')} onClick={() => setTheme(k)}>
              <span className={'st-prev ' + k}><i /><i /></span>{l}</button>)}
          </div>
          <div className="st-field"><label>Raccourci</label><div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><SquishSwitch /><span className="muted" style={{ fontSize: 13 }}>Disponible aussi en bas à gauche du menu.</span></div></div>
        </>}
        {sec === 'editeur' && <>
          <h2>Éditeur</h2>
          <p className="st-sub">Choisis où s'affiche la barre d'outils pendant que tu écris.</p>
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

function Hero({ kicker, name, stats, actions, quick }) {
  const h = new Date().getHours()
  const hello = h >= 18 || h < 5 ? 'Bonsoir,' : 'Bonjour,'
  return <section className="hero">
    <LiquidBackground />
    <span className="hero-kicker"><ShinyText>{kicker}</ShinyText></span>
    <h1 className="hero-title"><BlurText text={hello} /> <GradientText>{name}</GradientText></h1>
    {stats && <div className="hero-stats">{stats}</div>}
    <div className="hero-actions">{actions}</div>
    {quick?.length > 0 && <div className="qa-row">{quick.map(([label, fn]) => {
      const [ico, ...r] = label.split(' ')
      return <button type="button" key={label} className="qa" onClick={fn}><span className="qa-ico">{ico}</span><span>{r.join(' ')}</span></button>
    })}</div>}
  </section>
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
      <p className="muted">Ajoute une page, un sous-dossier ou un PDF depuis la barre latérale ou le bouton ci-dessus.</p>
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

function NotesHome({ items, sibs, openItem, show, projName, name, quick }) {
  const [q, setQ] = useState('')
  const [shut, setShut] = useState(() => { try { return JSON.parse(localStorage.getItem('homeShut') || '{}') } catch { return {} } })
  useEffect(() => { try { localStorage.setItem('homeShut', JSON.stringify(shut)) } catch {} }, [shut])
  const tgl = id => setShut(x => ({ ...x, [id]: !x[id] }))
  const roots = sibs(null)
  const folders = roots.filter(i => i.type === 'folder')
  const loose = roots.filter(i => i.type !== 'folder')
  const nF = items.filter(i => i.type === 'folder').length
  const nP = items.filter(i => i.type === 'page').length
  const nD = items.filter(i => i.type === 'pdf').length
  const path = i => { const a = []; let c = items.find(x => x.id === i.parent_id); while (c) { a.unshift(c.title); c = items.find(x => x.id === c.parent_id) }; return a.join(' › ') }
  const flat = (id, d = 0) => sibs(id).flatMap(c => [{ i: c, d }, ...(c.type === 'folder' ? flat(c.id, d + 1) : [])])
  const flatVis = (id, d = 0) => sibs(id).flatMap(c => [{ i: c, d }, ...(c.type === 'folder' && !shut[c.id] ? flatVis(c.id, d + 1) : [])])
  const needle = q.trim().toLowerCase()
  const found = needle ? items.filter(i => (i.title || '').toLowerCase().includes(needle)) : []
  const plural = (n, w) => n + ' ' + w + (n > 1 ? 's' : '')
  const Row = ({ i, d }) => i.type === 'folder' ? <div className="hrow hsub" style={{ paddingLeft: 6 + d * 14, cursor: 'pointer' }} onClick={() => tgl(i.id)} onDoubleClick={() => openItem(i.id)} onContextMenu={e => show(e, i)}><small className={'hchev' + (shut[i.id] ? '' : ' open')}>›</small><Ic i={i} /><b>{i.title}</b><small className="muted">{flat(i.id).filter(x => x.i.type !== 'folder').length}</small>
    <span className="hact"><b onClick={e => { e.stopPropagation(); show(e, i, 'new') }}>＋</b><b onClick={e => { e.stopPropagation(); show(e, i) }}>⋮</b></span></div> : <div className="hrow hitem" style={{ paddingLeft: 6 + d * 14 }} onClick={() => openItem(i.id)} onContextMenu={e => show(e, i)}><Ic i={i} /><span>{i.title}</span></div>
  const card = f => {
    const all = flat(f.id)
    const n = all.filter(x => x.i.type !== 'folder').length
    const sf = all.filter(x => x.i.type === 'folder').length
    const closed = !!shut[f.id]
    const rows = flatVis(f.id)
    return <article className={'hcard' + (closed ? ' shut' : '')} key={f.id} style={{ '--accent': f.color || '#007aff' }}>
      <div className="hhead" onClick={() => tgl(f.id)} onContextMenu={e => show(e, f)} title={closed ? 'Déplier' : 'Replier'}>
        <small className={'hchev' + (closed ? '' : ' open')}>›</small>
        {f.icon ? <span className="hcard-ico"><Ic i={f} /></span> : <FolderBits size={0.62} color={f.color || '#3b82f6'} open={!closed} className="hcard-folder" />}
        <div><h3>{f.title}</h3><small className="muted">{plural(n, 'élément')}{sf > 0 && ' · ' + plural(sf, 'sous-dossier')}</small></div>
        <span className="hact"><b onClick={e => show(e, f, 'new')} title="Ajouter">＋</b><b onClick={e => show(e, f)}>⋮</b></span>
      </div>
      {!closed && <div className="hbody">{rows.length ? rows.map(r => <Row key={r.i.id} {...r} />) : <p className="hcard-empty muted">Dossier vide</p>}</div>}
    </article>
  }
  return <div className="home home-in">
    <Hero kicker={projName || 'Espace'} name={name} quick={quick}
      stats={<>
        <span className="stat-pill"><Ticker value={nF} /> dossier{nF !== 1 ? 's' : ''}</span>
        <span className="stat-pill"><Ticker value={nP} /> page{nP !== 1 ? 's' : ''}</span>
        {nD > 0 && <span className="stat-pill"><Ticker value={nD} /> PDF</span>}
      </>}
      actions={<>
        <FxSearch value={q} onChange={e => setQ(e.target.value)} placeholders={['Rechercher une note…', 'Un cours, une réunion…', 'Un PDF, un dossier…', 'Une idée à retrouver…']} />
        <button type="button" className="btn-primary btn-glow" onClick={e => show(e, null, 'new')}>＋ Nouveau</button>
      </>} />
    {needle ? <section className="hsec">
      <div className="sec-label"><h4>Résultats</h4><span className="muted">{found.length}</span></div>
      {found.length ? <div className="search-results">{found.map(i => <button type="button" className="result-row" key={i.id} onClick={() => i.type !== 'folder' && openItem(i.id)} onContextMenu={e => show(e, i)}>
        <span className="tile-ico sm"><Ic i={i} /></span>
        <span className="result-meta"><b>{i.title}</b><small className="muted">{path(i) || 'Racine'} · {i.type}</small></span>
      </button>)}</div> : <p className="muted dash-none">Aucun résultat pour « {q.trim()} ».</p>}
    </section> : !items.length ? <div className="dash-empty">
      <div className="dash-empty-ico">📝</div>
      <h3>Commence à écrire</h3>
      <p className="muted">Crée une page ou un dossier pour organiser tes idées.</p>
      <button type="button" className="btn-primary btn-glow" onClick={e => show(e, null, 'new')}>＋ Créer une note</button>
    </div> : <>
      {folders.length > 0 && <section className="hsec">
        <div className="sec-label"><h4>📁 Dossiers</h4><span className="muted">{folders.length}</span><button type="button" className="ghost hmore" style={{ marginLeft: 'auto' }} onClick={() => { const all = items.filter(x => x.type === 'folder'), every = all.every(x => shut[x.id]); setShut(Object.fromEntries(all.map(x => [x.id, !every]))) }}>{items.filter(x => x.type === 'folder').every(x => shut[x.id]) ? 'Tout déplier' : 'Tout replier'}</button></div>
        <div className="hgrid">{folders.map(card)}</div>
      </section>}
      {loose.length > 0 && <section className="hsec">
        <div className="sec-label"><h4>📄 Pages libres</h4><span className="muted">{loose.length}</span></div>
        <div className="tile-grid">
          {loose.map(i => <button type="button" className="tile" key={i.id} onClick={() => openItem(i.id)} onContextMenu={e => show(e, i)}>
            <span className="tile-ico" style={{ '--c': i.color || (i.type === 'pdf' ? '#ef4444' : '#3b82f6') }}><Ic i={i} /></span>
            <span className="tile-body"><b>{i.title}</b><small className="muted">{i.type === 'pdf' ? 'PDF' : 'Page'}</small></span>
          </button>)}
        </div>
      </section>}
    </>}
  </div>
}

function InvestHome({ items, sibs, openItem, show, projName, addCompany, del, name, quick }) {
  const [q, setQ] = useState('')
  const roots = sibs(null)
  const path = i => { const a = []; let c = items.find(x => x.id === i.parent_id); while (c) { a.unshift(c.title); c = items.find(x => x.id === c.parent_id) }; return a.join(' › ') }
  const needle = q.trim().toLowerCase()
  const found = needle ? items.filter(i => (i.title || '').toLowerCase().includes(needle)) : []
  const plural = (n, w) => n + ' ' + w + (n > 1 ? 's' : '')
  const findFolder = t => roots.find(i => i.type === 'folder' && (i.title || '').toLowerCase() === t.toLowerCase())
  const companyFolder = findFolder('Entreprises à suivre')
  const companies = companyFolder ? sibs(companyFolder.id).filter(i => i.type !== 'folder') : []
  const otherSections = INV_SECTIONS.filter(s => s.title !== 'Entreprises à suivre')
  const sectionTitles = new Set(INV_SECTIONS.map(s => s.title.toLowerCase()))
  const otherFolders = roots.filter(i => i.type === 'folder' && !sectionTitles.has((i.title || '').toLowerCase()))
  const loose = roots.filter(i => i.type !== 'folder')
  const ItemRow = ({ i }) => {
    if (i.type === 'folder') return <div className="inv-row inv-sub" onContextMenu={e => show(e, i)}><Ic i={i} /><b>{i.title}</b><small className="muted">{sibs(i.id).length}</small>
      <span className="hact"><b onClick={e => show(e, i, 'new')}>＋</b><b onClick={e => show(e, i)}>⋮</b></span></div>
    return <div className="inv-row" onClick={() => openItem(i.id)} onContextMenu={e => show(e, i)}><Ic i={i} /><span>{i.title}</span>
      <span className="hact"><b onClick={e => { e.stopPropagation(); show(e, i) }}>⋮</b></span></div>
  }
  const Section = ({ s }) => {
    const folder = findFolder(s.title)
    const kids = folder ? sibs(folder.id) : []
    return <section className="inv-sec" style={{ '--inv': s.color }}>
      <header className="inv-head">
        <span className="inv-ico">{s.icon}</span>
        <div className="inv-titles"><h3>{s.title}</h3><small className="muted">{folder ? (kids.length ? plural(kids.length, 'élément') : 'Vide') : 'Non créé'}</small></div>
        <button type="button" className="ghost inv-add" onClick={e => folder ? show(e, folder, 'new') : show(e, null, 'new')} title="Ajouter">＋</button>
      </header>
      <div className="inv-body">
        {folder ? (kids.length ? kids.map(i => <ItemRow key={i.id} i={i} />) : <p className="inv-empty muted">Rien pour l'instant</p>)
          : <p className="inv-empty muted">Crée le dossier « {s.title} » pour commencer.</p>}
      </div>
    </section>
  }
  return <div className="home home-in">
    <Hero kicker={projName || 'Espace'} name={name} quick={quick}
      actions={<>
        <FxSearch value={q} onChange={e => setQ(e.target.value)} placeholders={['Rechercher…', 'Une entreprise suivie…', 'Une analyse, une source…']} />
        <button type="button" className="btn-primary btn-glow" onClick={e => show(e, null, 'new')}>＋ Nouveau</button>
      </>} />
    {needle ? <section className="hsec">
      <div className="sec-label"><h4>Résultats</h4><span className="muted">{found.length}</span></div>
      {found.length ? <div className="search-results">{found.map(i => <button type="button" className="result-row" key={i.id} onClick={() => i.type !== 'folder' && openItem(i.id)} onContextMenu={e => show(e, i)}>
        <span className="tile-ico sm"><Ic i={i} /></span>
        <span className="result-meta"><b>{i.title}</b><small className="muted">{path(i) || 'Racine'} · {i.type}</small></span>
      </button>)}</div> : <p className="muted dash-none">Aucun résultat pour « {q.trim()} ».</p>}
    </section> : <>
      <section className="watchlist">
        <header className="watchlist-hd">
          <div className="watchlist-titles">
            <span className="watchlist-badge">📈</span>
            <div>
              <h2>Entreprises à suivre</h2>
              <p className="muted">{companies.length ? plural(companies.length, 'entreprise suivie') : 'Construis ta watchlist'}</p>
            </div>
          </div>
          <button type="button" className="btn-primary btn-glow" onClick={addCompany}>＋ Ajouter</button>
        </header>
        {companies.length > 0 ? <div className="watchlist-grid">
          {companies.map(c => <div key={c.id} className="watch-card" onClick={() => openItem(c.id)} onContextMenu={e => show(e, c)}>
            <span className="watch-avatar">{c.title?.slice(0, 1).toUpperCase()}</span>
            <span className="watch-name">{c.title}</span>
            <button type="button" className="ghost watch-x" title="Retirer" onClick={e => { e.stopPropagation(); del(c) }}>✕</button>
          </div>)}
        </div> : <div className="watchlist-empty">
          <p className="muted">Aucune société suivie. Ajoute tes tickers ou noms d'entreprises pour y accéder vite.</p>
        </div>}
      </section>
      <section className="hsec">
        <div className="sec-label"><h4>Espaces de travail</h4></div>
        <div className="inv-grid">{otherSections.map(s => <Section key={s.title} s={s} />)}</div>
      </section>
      {(otherFolders.length > 0 || loose.length > 0) && <section className="hsec">
        <div className="sec-label"><h4>Autres</h4></div>
        <div className="tile-grid">
          {otherFolders.map(f => <button type="button" className="tile tile-folder" key={f.id} onContextMenu={e => show(e, f)}>
            <span className="tile-ico" style={{ '--c': f.color || '#f59e0b' }}><Ic i={f} /></span>
            <span className="tile-body"><b>{f.title}</b><small className="muted">Dossier</small></span>
          </button>)}
          {loose.map(i => <button type="button" className="tile" key={i.id} onClick={() => openItem(i.id)} onContextMenu={e => show(e, i)}>
            <span className="tile-ico" style={{ '--c': i.color || '#3b82f6' }}><Ic i={i} /></span>
            <span className="tile-body"><b>{i.title}</b><small className="muted">{i.type === 'pdf' ? 'PDF' : 'Page'}</small></span>
          </button>)}
        </div>
      </section>}
    </>}
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
        <p className="login-lead">
          <TextGenerate text="Prends des notes, apprends et suis tes projets — à plusieurs, en temps réel." step={45} />
        </p>
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
  const [drop, setDrop] = useState(null)
  const [share, setShare] = useState(null)
  const [settings, setSettings] = useState(false)
  const [online, setOnline] = useState([])
  const [w, setW] = useState(280)
  const [collapsed, setCollapsed] = useState(() => { try { return JSON.parse(localStorage.getItem('collapsed') || '{}') } catch { return {} } })
  useEffect(() => { try { localStorage.setItem('collapsed', JSON.stringify(collapsed)) } catch {} }, [collapsed])
  const toggle = id => setCollapsed(c => ({ ...c, [id]: !c[id] }))
  const [space, setSpace] = useState(() => { try { return localStorage.getItem('space') || 'notes' } catch { return 'notes' } })
  const switchSpace = s => { setSpace(s); try { localStorage.setItem('space', s) } catch {}; setSel(null); setTabs([]) }
  const fi = useRef(), pp = useRef(null), drag = useRef(null), pch = useRef(null)
  const loadP = async () => { const { data } = await supabase.from('projects').select('*'); setProjs(data || []); if (!pid && data?.[0]) setPid(data[0].id) }
  const loadI = async () => {
    if (!pid) return
    const { data } = await supabase.from('items').select('id,parent_id,type,title,color,closed,icon,pos,created_at,space').eq('project_id', pid).order('created_at')
    setItems((data || []).filter(x => x.type !== 'board').map(x => ({ ...x, space: x.space || 'notes' })))
  }
  useEffect(() => { loadP() }, [])
  useEffect(() => { setSel(null); setTabs([]); loadI(); if (!pid) return; const ch = supabase.channel('items:' + pid).on('postgres_changes', { event: '*', schema: 'public', table: 'items', filter: 'project_id=eq.' + pid }, loadI).subscribe(); return () => supabase.removeChannel(ch) }, [pid])
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
  const insert = async row => { const { data, error } = await supabase.from('items').insert({ project_id: pid, pos: Date.now(), space, ...row }).select().single(); if (error) { alert(error.message + (String(error.message).includes('space') ? '\n\n→ Exécute supabase/space.sql dans Supabase.' : '')); return null }; return data ? { ...data, space: data.space || space } : null }
  const patch = (id, p) => { setItems(l => l.map(x => x.id === id ? { ...x, ...p } : x)); supabase.from('items').update(p).eq('id', id).then(err) }
  const newProj = () => ask('Nom du projet', '', async name => { const { data, error } = await supabase.from('projects').insert({ name }).select().single(); if (error) return alert(error.message); await loadP(); setPid(data.id) })
  const code = projs.find(p => p.id === pid)?.code
  const invite = () => code ? setShare(code) : alert("Code introuvable : lance d'abord update2.sql dans Supabase.")
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
  const pathTo = id => { const chain = []; let c = items.find(x => x.id === id); while (c) { if (c.type === 'folder') chain.unshift(c.id); c = items.find(x => x.id === c.parent_id) }; return chain }
  const openItem = id => { setSel(id); setTabs(t => t.includes(id) ? t : [...t, id]); const it = items.find(x => x.id === id); if (it) { const p = pathTo(it.parent_id); if (p.length) setCollapsed(c => { const n = { ...c }; p.forEach(x => { delete n[x] }); return n }) } }
  const closeTab = id => { const n = tabs.filter(x => x !== id); setTabs(n); if (sel === id) setSel(n[n.length - 1] || null) }
  const openFolder = id => openItem(id)
  const key = x => x.pos ?? new Date(x.created_at).getTime()
  const spaceItems = items.filter(i => (i.space || 'notes') === space)
  const sibs = p => spaceItems.filter(i => i.parent_id === p).sort((a, b) => key(a) - key(b))
  const isIn = (id, anc) => { let c = items.find(x => x.id === id); while (c) { if (c.id === anc) return true; c = items.find(x => x.id === c.parent_id) }; return false }
  const zoneOf = (e, f) => { const r = e.currentTarget.getBoundingClientRect(), y = (e.clientY - r.top) / r.height; return f ? (y < .25 ? 'before' : y > .75 ? 'after' : 'in') : (y < .5 ? 'before' : 'after') }
  const move = (id, tid, zone) => {
    if (tid && isIn(tid, id)) return
    const t = items.find(x => x.id === tid)
    if (!t) return patch(id, { parent_id: null, pos: Date.now() })
    if (zone === 'in') { patch(id, { parent_id: t.id, pos: Date.now() }); return }
    const l = sibs(t.parent_id).filter(x => x.id !== id), k = l.findIndex(x => x.id === t.id)
    const a = zone === 'before' ? (l[k - 1] ? key(l[k - 1]) : key(t) - 2000) : key(t)
    const b = zone === 'before' ? key(t) : (l[k + 1] ? key(l[k + 1]) : key(t) + 2000)
    patch(id, { parent_id: t.parent_id, pos: (a + b) / 2 })
  }
  const cur = items.find(i => i.id === sel && (i.space || 'notes') === space)
  const trail = i => { const a = []; let c = items.find(x => x.id === i.parent_id); while (c) { a.unshift(c); c = items.find(x => x.id === c.parent_id) }; return a }
  const tabItems = tabs.map(id => items.find(i => i.id === id)).filter(i => i && (i.space || 'notes') === space)
  const sideW = open ? w : 0
  const selItem = items.find(x => x.id === sel)
  const chain = selItem ? [...pathTo(selItem.parent_id), selItem.id] : []
  const renderTree = (parentId, depth) => { const kids = sibs(parentId), act = depth > 0 ? kids.findIndex(k => chain.includes(k.id)) : -1; return kids.map((i, idx) => {
    const f = i.type === 'folder', shut = !!collapsed[i.id], z = drop && drop.id === i.id ? ' dz-' + drop.zone : ''
    return <div key={i.id} className="tnode">
      {depth > 0 && <>
        <i className={'ln up' + (act >= 0 && idx <= act ? ' lit' : '')} />
        {idx < kids.length - 1 && <i className={'ln dn' + (idx < act ? ' lit' : '')} />}
        <i className={'ln tk' + (idx === act ? ' lit' : '')} />
      </>}
      <div className={'row trow' + (sel === i.id ? ' on' : '') + z} style={{ paddingLeft: 6 }} draggable
        onDragStart={e => { drag.current = i.id; e.dataTransfer.setData('text/plain', i.id) }}
        onDragEnd={() => { drag.current = null; setDrop(null) }}
        onDragOver={e => { if (!drag.current) return; e.preventDefault(); e.stopPropagation(); setDrop({ id: i.id, zone: zoneOf(e, f) }) }}
        onDrop={e => { if (!drag.current) return; e.preventDefault(); e.stopPropagation(); move(drag.current, i.id, zoneOf(e, f)); drag.current = null; setDrop(null) }}
        onClick={() => f ? toggle(i.id) : openItem(i.id)} onDoubleClick={() => f && openItem(i.id)} onContextMenu={e => show(e, i)}>
        <span className="t">
          {f ? <small className={'tchev' + (shut ? '' : ' open')}>›</small> : <small className="tchev ph" />}
          {f && !i.icon ? <FolderBits size={0.21} color={i.color || '#3b82f6'} open={!shut} /> : <Ic i={i} />} {i.title}
        </span>
        <span className="act">{f && <small className="tcount">{sibs(i.id).length}</small>}{f && <b onClick={e => show(e, i, 'new')}>＋</b>}<b onClick={e => show(e, i)}>⋮</b></span>
      </div>
      {f && !shut && <div className="tchildren" style={{ '--tc': i.color || '#3b82f6' }}>{renderTree(i.id, depth + 1)}</div>}
    </div>
  }) }
  const allFolders = spaceItems.filter(i => i.type === 'folder')
  const allShut = allFolders.length > 0 && allFolders.every(f => collapsed[f.id])
  const toggleAll = () => setCollapsed(c => { const n = { ...c }; allFolders.forEach(f => { n[f.id] = !allShut }); return n })
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
        {pid && <div className="head side-nav"><button className={sel ? 'ghost' : 'on'} onClick={() => setSel(null)}>🏠 Accueil</button><button className="on" onClick={e => show(e, null, 'new')}>＋ Nouveau</button></div>}
        {pid && <div className="tree-hd"><span>Fichiers</span>{allFolders.length > 0 && <button type="button" onClick={toggleAll} title={allShut ? 'Tout déplier' : 'Tout replier'}>{allShut ? 'Tout déplier' : 'Tout replier'}</button>}</div>}
        <div className="tree"
          onDragOver={e => drag.current && e.preventDefault()}
          onDrop={e => { if (drag.current) { e.preventDefault(); move(drag.current, null, 'in'); drag.current = null; setDrop(null) } }}
          onContextMenu={e => pid && show(e, null, 'new')}>
          {!sibs(null).length && <p className="muted col-empty">Aucun fichier</p>}
          {renderTree(null, 0)}
        </div>
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
            {cur ? <>{trail(cur).map(t => <span key={t.id}><i>›</i> {t.title}</span>)}<i>›</i><b>{cur.title}</b></> : <><i>›</i><b>Accueil</b></>}
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
        <main className={cur && (cur.type === 'page' || cur.type === 'pdf') ? 'paper' : ''}>
          <div className="workspace">
            {!pid ? <div className="dash-empty">
              <div className="dash-empty-ico">🚀</div>
              <h3>Bienvenue !</h3>
              <p className="muted">Crée un projet ou rejoins-en un pour commencer.</p>
              <div className="btns">
                <button className="btn-primary btn-glow" onClick={newProj}>＋ Nouveau projet</button>
                <button className="ghost" onClick={joinProj}>🔗 Rejoindre un projet</button>
              </div>
            </div> : !sel ? (space === 'invest' ? <InvestHome items={items} sibs={sibs} openItem={openItem} show={show} projName={projName} addCompany={addCompany} del={del} name={name} quick={news(null)} /> : <NotesHome items={items} sibs={sibs} openItem={openItem} show={show} projName={projName} name={name} quick={news(null)} />) : cur?.type === 'pdf' ? <PdfView key={cur.id} id={cur.id} user={user} path={pid + '/' + cur.id + '.pdf'} title={cur.title} /> : cur?.type === 'page' ? <Editor key={cur.id} id={cur.id} user={user} projectId={pid} /> : cur?.type === 'folder' ? <FolderView folder={cur} sibs={sibs} openItem={openItem} openFolder={openFolder} show={show} items={items} /> : null}
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
