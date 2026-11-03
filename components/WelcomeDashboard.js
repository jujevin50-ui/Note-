'use client'
import { useEffect, useState } from 'react'
import './welcome-dashboard.css'
import { selectLibraryItems } from '../lib/library'

function Icon({ name, size = 20 }) {
  const paths = {
    plus: <path d="M12 5v14M5 12h14" />,
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /></>,
    folder: <path d="M3 8V6a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />,
    page: <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z M14 3v6h6M8 13h8M8 17h5" /></>,
    pdf: <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z M14 3v6h6M12 12v6m-3-3 3 3 3-3" /></>,
    spark: <path d="m12 2 2.6 7.4L22 12l-7.4 2.6L12 22l-2.6-7.4L2 12l7.4-2.6Z" />,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.page}</svg>
}

function follow(e) {
  if (e.pointerType === 'touch') return
  const el = e.currentTarget, r = el.getBoundingClientRect()
  el.style.setProperty('--pointer-x', `${e.clientX - r.left}px`)
  el.style.setProperty('--pointer-y', `${e.clientY - r.top}px`)
  el.style.setProperty('--rotate-x', `${((e.clientY - r.top) / r.height - .5) * -5}deg`)
  el.style.setProperty('--rotate-y', `${((e.clientX - r.left) / r.width - .5) * 5}deg`)
}
function reset(e) {
  e.currentTarget.style.setProperty('--rotate-x', '0deg')
  e.currentTarget.style.setProperty('--rotate-y', '0deg')
}

export default function WelcomeDashboard({ items, sibs, openItem, show, projName, space, addCompany, name, recentDocuments = [], recentStatus = 'ready', refreshRecent, section = 'home' }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('recent')
  useEffect(() => { setQuery(''); setFilter(section === 'pages' ? 'page' : section === 'pdf' ? 'pdf' : 'all') }, [section, space, projName])
  useEffect(() => { if (section === 'library') refreshRecent?.() }, [section, refreshRecent])
  const needle = query.trim().toLocaleLowerCase('fr')
  const rootsOnly = !['pages', 'pdf'].includes(section)
  const documents = items.filter(i => i.type !== 'folder')
  const recent = recentDocuments.map(entry => { const item = documents.find(item => item.id === entry.id); return item ? { ...item, last_opened_at: entry.last_opened_at } : null }).filter(Boolean).slice(0, 3)
  const visible = selectLibraryItems(items, { query, filter, sort, rootsOnly })
  const matches = selectLibraryItems(items, { query, rootsOnly: false })
  const firstName = (name || 'vous').split(' ')[0]
  const create = e => show(e, null, 'new')
  const date = value => value && !Number.isNaN(Date.parse(value)) ? new Date(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : 'Sans date'
  const tile = (item, index, folder = false) => <button type="button" key={item.id} className={'wd-tile' + (folder ? ' wd-folder' : '')} style={{ '--accent': item.color || (item.type === 'pdf' ? '#d38a69' : '#8d91db'), '--index': Math.min(index, 10) }} onPointerMove={follow} onPointerLeave={reset} onClick={() => openItem(item.id)} onContextMenu={e => show(e, item)}>
    <span className="wd-tile-light" aria-hidden="true" />
    <span className="wd-tile-top"><span className="wd-file-icon">{item.icon || <Icon name={item.type} size={24} />}</span><span className="wd-open"><Icon name="arrow" size={18} /></span></span>
    {folder && <span className="wd-paper-stack" aria-hidden="true"><i /><i /><i /></span>}
    <strong title={item.title}>{item.title}</strong>
    <span className="wd-tile-meta">{folder ? `${sibs(item.id).length} élément${sibs(item.id).length > 1 ? 's' : ''}` : item.type === 'pdf' ? 'Document PDF' : 'Page de notes'}<span>{!folder && date(item.created_at)}</span></span>
  </button>

  return <div className="wd">
    <header className="wd-top"><span className="wd-breadcrumb"><span className="wd-status" />{projName || 'Mon espace'}<span>/</span>{space === 'invest' ? 'Investissement' : 'Notes'}</span></header>
    {section === 'home' && <section className="wd-hero" onPointerMove={follow} onPointerLeave={reset}>
      <div className="wd-hero-copy"><h1>Bonjour {firstName}.</h1><div className="wd-hero-actions"><button type="button" className="wd-create" onClick={create}><span className="wd-create-icon"><Icon name="plus" size={18} /></span>Créer un contenu<Icon name="arrow" size={17} /></button>{space === 'invest' && addCompany && <button type="button" className="wd-company" onClick={addCompany}>Ajouter une entreprise ↗</button>}</div></div>
      <div className="wd-hero-art" aria-hidden="true"><div className="wd-art-orbit" /><div className="wd-art-orbit second" /><div className="wd-art-note back"><span /><span /><span /></div><div className="wd-art-note front"><div className="wd-art-star"><Icon name="spark" size={64} /></div><div className="wd-art-lines"><i /><i /><i /></div></div><div className="wd-art-badge"><Icon name="spark" size={18} /></div></div>

    </section>}
    {section === 'home' && <div className="wd-summary"><span><b>{documents.length}</b> document{documents.length > 1 ? 's' : ''}</span><span><b>{items.filter(i => i.type === 'folder').length}</b> dossier{items.filter(i => i.type === 'folder').length > 1 ? 's' : ''}</span></div>}
    {section !== 'home' && <h1 className="wd-section-heading">{{ library: space === 'invest' ? 'Invest' : 'Notes', pages: 'Pages', pdf: 'PDF' }[section]}</h1>}
    {section === 'library' && <section className="wd-resume" aria-label="Documents ouverts récemment par le projet">
      <div className="wd-section-title"><h2>Ouverts récemment</h2><span>Par les membres du projet</span></div>
      {recentStatus === 'loading' ? <p className="wd-recent-status" role="status">Chargement…</p> : recentStatus === 'setup-required' ? <p className="wd-recent-status" role="status">L’historique partagé doit être activé dans la base du projet avec le fichier recent-documents.sql.</p> : recentStatus === 'error' ? <div className="wd-recent-status" role="status">Impossible de charger l’historique partagé. <button type="button" onClick={refreshRecent}>Réessayer</button></div> : recent.length ? <div className="wd-recent-grid">{recent.map((item, index) => <button type="button" className="wd-recent" key={item.id} style={{ '--index': index }} onClick={() => openItem(item.id)} title={item.title}><span className={'wd-recent-icon ' + item.type}><Icon name={item.type} /></span><span className="wd-recent-copy"><strong>{item.title}</strong><small>Ouvert le {new Date(item.last_opened_at).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</small></span><span className="wd-recent-arrow"><Icon name="arrow" size={18} /></span></button>)}</div> : <p className="wd-recent-status">Les documents ouverts par les membres du projet apparaîtront ici.</p>}
    </section>}
    <section className="wd-library" aria-label="Bibliothèque"><div className="wd-library-head"><h2 className="wd-library-title">Bibliothèque</h2><button type="button" className="wd-new" onClick={create} aria-label="Créer un contenu"><Icon name="plus" size={18} /><span>Nouveau</span></button></div>
      <div className="wd-reveal">
        <div className="wd-tools"><label className="wd-search"><Icon name="search" size={18} /><input aria-label="Rechercher dans la bibliothèque" placeholder="Rechercher un dossier, une page, un PDF…" value={query} onChange={e => setQuery(e.target.value)} />{query && <button type="button" onClick={() => setQuery('')} aria-label="Effacer la recherche">×</button>}</label><select aria-label="Trier les contenus" value={sort} onChange={e => setSort(e.target.value)}><option value="recent">Plus récents</option><option value="name">Nom A → Z</option></select></div>
        {(!rootsOnly || needle) && <div className={"wd-filters" + (['pages', 'pdf'].includes(section) ? " wd-filters-hidden" : "")} aria-label="Type de contenu">{[['all', 'Tout'], ['page', 'Pages'], ['folder', 'Dossiers'], ['pdf', 'PDF']].map(([value, label]) => <button type="button" key={value} aria-pressed={filter === value} className={filter === value ? 'selected' : ''} onClick={() => setFilter(value)}>{label}<span>{value === 'all' ? matches.length : matches.filter(i => i.type === value).length}</span></button>)}</div>}
        <div className="wd-section-title"><h2>{needle ? 'Résultats de recherche' : rootsOnly ? 'Vos dossiers' : filter === 'all' ? 'Tous les contenus' : { page: 'Vos pages', folder: 'Vos dossiers', pdf: 'Vos PDF' }[filter]}</h2><span role="status">{visible.length} {needle || !rootsOnly ? 'résultat' : 'dossier'}{visible.length > 1 ? 's' : ''}</span></div>
        {visible.length ? <div className="wd-grid" key={`${filter}-${sort}-${needle}`}>{visible.map((item, index) => tile(item, index, item.type === 'folder'))}</div> : <div className="wd-empty"><span className="wd-empty-icon"><Icon name={needle ? 'search' : 'spark'} size={28} /></span><h3>{needle ? 'Aucun résultat' : rootsOnly ? 'Aucun dossier principal' : 'Aucun contenu'}</h3><button type="button" className="wd-create" onClick={needle ? () => { setQuery(''); setFilter(section === 'pages' ? 'page' : section === 'pdf' ? 'pdf' : 'all') } : create}>{needle ? 'Réinitialiser la recherche' : 'Nouveau contenu'}<Icon name={needle ? 'arrow' : 'plus'} size={17} /></button></div>}
      </div>
    </section>

  </div>
}
