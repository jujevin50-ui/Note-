'use client'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

export default function PageOutline({ editor }) {
  const [headings, setHeadings] = useState([])
  const [active, setActive] = useState(null)
  const [bounds, setBounds] = useState(null)
  useEffect(() => {
    if (!editor || editor.isDestroyed) return
    const main = editor.view.dom.closest('main')
    if (!main) return
    let frame
    const refresh = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        if (editor.isDestroyed) return
        const entries = []
        editor.state.doc.descendants((node, pos) => {
          if (node.type.name === 'heading') entries.push({ pos, level: node.attrs.level, title: node.textContent.trim() || 'Titre sans texte' })
        })
        setHeadings(entries)
        const rect = main.getBoundingClientRect(), content = editor.view.dom.getBoundingClientRect()
        const rail = main.querySelector('.toolbar-rail')
        const threshold = Math.max(rect.top + 24, rail && rail.getBoundingClientRect().width > 100 ? rail.getBoundingClientRect().bottom + 16 : rect.top + 24)
        let current = entries[0]?.pos ?? null
        for (const entry of entries) {
          const element = editor.view.nodeDOM(entry.pos)
          if (element?.getBoundingClientRect().top <= threshold + 8) current = entry.pos
        }
        setActive(current)
        const top = rect.top + Math.min(140, rect.height * .22)
        setBounds({ top, right: Math.max(12, window.innerWidth - content.right + 4), maxHeight: Math.max(80, rect.bottom - top - 20) })
      })
    }
    refresh()
    editor.on('update', refresh)
    main.addEventListener('scroll', refresh, { passive: true })
    window.addEventListener('resize', refresh)
    const observer = new ResizeObserver(refresh)
    observer.observe(main); observer.observe(editor.view.dom)
    return () => {
      cancelAnimationFrame(frame); editor.off('update', refresh)
      main.removeEventListener('scroll', refresh); window.removeEventListener('resize', refresh)
      observer.disconnect()
    }
  }, [editor])
  if (!headings.length || !bounds) return null
  const navigate = entry => {
    const element = editor.view.nodeDOM(entry.pos)
    const main = element?.closest('main')
    if (!element || !main) return
    const rail = main.querySelector('.toolbar-rail')
    const offset = rail && rail.getBoundingClientRect().width > 100 ? rail.getBoundingClientRect().height + 32 : 32
    main.scrollTo({ top: main.scrollTop + element.getBoundingClientRect().top - main.getBoundingClientRect().top - offset, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
    setActive(entry.pos)
  }
  return createPortal(<nav className="page-outline" style={bounds} aria-label="Sommaire de la page" onKeyDown={e => { if (e.key === 'Escape') e.target.blur() }}>
    <div className="outline-entries">{headings.map(entry => <button type="button" key={entry.pos} className={'outline-entry' + (active === entry.pos ? ' active' : '')} style={{ '--heading-level': entry.level }} aria-current={active === entry.pos ? 'location' : undefined} aria-label={entry.title} title={entry.title} onClick={() => navigate(entry)}><span className="outline-bar" aria-hidden="true"/><span className="outline-label">{entry.title}</span></button>)}</div>
  </nav>, document.body)
}
