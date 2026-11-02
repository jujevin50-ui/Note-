'use client'
/* Composants inspirés de React Bits (https://reactbits.dev) — React + CSS, sans dépendance :
   - LiquidBackground : fond canvas (orbes qui dérivent + particules reliées, réagit à la souris)
   - SquishSwitch     : interrupteur clair / sombre dont la pastille s'écrase au clic
   - BlurText         : texte qui apparaît mot par mot (flou → net)
   - ShinyText        : reflet qui traverse le texte
   - GradientText     : dégradé animé
   - Presence         : pile d'avatars « en ligne » avec panneau de détail */
import { useEffect, useRef, useState, useCallback } from 'react'

export function useTheme() {
  const [t, setT] = useState('light')
  useEffect(() => {
    const read = () => setT(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light')
    read()
    const mo = new MutationObserver(read)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => mo.disconnect()
  }, [])
  const set = useCallback(v => {
    document.documentElement.dataset.theme = v
    try { localStorage.setItem('theme', v) } catch {}
  }, [])
  return [t, set]
}

export function LiquidBackground({ className = '' }) {
  const ref = useRef(null)
  const [theme] = useTheme()
  useEffect(() => {
    const c = ref.current
    if (!c) return
    const ctx = c.getContext('2d')
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    const dark = theme === 'dark'
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const cols = dark
      ? ['99,102,241', '14,165,233', '168,85,247', '236,72,153']
      : ['99,102,241', '56,189,248', '192,132,252', '251,146,60']
    const orbs = cols.map((col, i) => ({ col, a: Math.random() * 6.28, s: 0.00011 + i * 0.00004, r: 0.3 + Math.random() * 0.12 }))
    const pts = []
    let w = 0, h = 0, raf = 0, mx = -999, my = -999
    const resize = () => {
      const r = c.getBoundingClientRect()
      w = r.width; h = r.height
      c.width = w * dpr; c.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const n = Math.round(Math.min(64, (w * h) / 14000))
      pts.length = 0
      for (let i = 0; i < n; i++) pts.push({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3 })
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(c)
    const move = e => { const r = c.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top }
    addEventListener('pointermove', move, { passive: true })
    const line = dark ? '255,255,255' : '70,70,130'
    const draw = t => {
      ctx.clearRect(0, 0, w, h)
      for (const o of orbs) {
        const x = (0.5 + Math.cos(t * o.s * 6 + o.a) * 0.4) * w
        const y = (0.5 + Math.sin(t * o.s * 5 + o.a * 1.3) * 0.36) * h
        const rad = Math.max(w, h) * o.r
        const g = ctx.createRadialGradient(x, y, 0, x, y, rad)
        g.addColorStop(0, `rgba(${o.col},${dark ? 0.34 : 0.3})`)
        g.addColorStop(1, `rgba(${o.col},0)`)
        ctx.fillStyle = g
        ctx.fillRect(0, 0, w, h)
      }
      for (const p of pts) {
        const dx = p.x - mx, dy = p.y - my, d2 = dx * dx + dy * dy
        if (d2 < 16000) { const f = (1 - d2 / 16000) * 0.6; p.vx += (dx / 40) * f * 0.05; p.vy += (dy / 40) * f * 0.05 }
        p.vx *= 0.995; p.vy *= 0.995
        p.x += p.vx; p.y += p.vy
        if (p.x < 0) p.x = w; if (p.x > w) p.x = 0
        if (p.y < 0) p.y = h; if (p.y > h) p.y = 0
      }
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i]
        ctx.fillStyle = `rgba(${line},${dark ? 0.5 : 0.4})`
        ctx.beginPath(); ctx.arc(a.x, a.y, 1.3, 0, 6.283); ctx.fill()
        for (let j = i + 1; j < pts.length; j++) {
          const b = pts[j], d = Math.hypot(a.x - b.x, a.y - b.y)
          if (d < 110) { ctx.strokeStyle = `rgba(${line},${(1 - d / 110) * (dark ? 0.2 : 0.16)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke() }
        }
      }
      if (!reduce) raf = requestAnimationFrame(draw)
    }
    if (reduce) draw(0); else raf = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(raf); ro.disconnect(); removeEventListener('pointermove', move) }
  }, [theme])
  return <canvas ref={ref} className={'lbg ' + className} aria-hidden />
}

export function SquishSwitch() {
  const [t, set] = useTheme()
  const [press, setPress] = useState(false)
  const dark = t === 'dark'
  return (
    <button type="button" role="switch" aria-checked={dark} aria-label="Mode sombre"
      title={dark ? 'Passer en mode clair' : 'Passer en mode sombre'}
      className={'sq' + (dark ? ' dark' : '') + (press ? ' press' : '')}
      onClick={() => set(dark ? 'light' : 'dark')}
      onPointerDown={() => setPress(true)} onPointerUp={() => setPress(false)} onPointerLeave={() => setPress(false)} onPointerCancel={() => setPress(false)}>
      <span className="sq-ico sq-sun" aria-hidden>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
      </span>
      <span className="sq-ico sq-moon" aria-hidden>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
      </span>
      <span className="sq-thumb" aria-hidden />
    </button>
  )
}

export function BlurText({ text, step = 90, className = '' }) {
  const words = String(text || '').split(/\s+/).filter(Boolean)
  return (
    <span className={'bt ' + className} key={text} aria-label={text}>
      {words.map((w, i) => <span aria-hidden key={i} style={{ '--d': i * step + 'ms' }}>{w}{i < words.length - 1 ? '\u00a0' : ''}</span>)}
    </span>
  )
}

export const ShinyText = ({ children, className = '' }) => <span className={'shiny ' + className}>{children}</span>
export const GradientText = ({ children, className = '' }) => <span className={'grad-text ' + className}>{children}</span>

export function Presence({ online, me, titleOf }) {
  const [open, setOpen] = useState(false)
  const box = useRef(null)
  useEffect(() => {
    if (!open) return
    const f = e => { if (box.current && !box.current.contains(e.target)) setOpen(false) }
    const k = e => e.key === 'Escape' && setOpen(false)
    addEventListener('pointerdown', f); addEventListener('keydown', k)
    return () => { removeEventListener('pointerdown', f); removeEventListener('keydown', k) }
  }, [open])
  const list = [...online].sort((a, b) => (a.id === me ? -1 : b.id === me ? 1 : 0))
  const shown = list.slice(0, 4), extra = list.length - shown.length
  if (!list.length) return null
  return (
    <div className="prs" ref={box}>
      <button type="button" className={'prs-btn' + (open ? ' on' : '')} onClick={() => setOpen(o => !o)} aria-expanded={open} title="Personnes en ligne">
        <span className="prs-live" aria-hidden />
        <span className="prs-stack">
          {shown.map(u => <i key={u.id} style={{ background: u.color }}>{(u.name || '?')[0].toUpperCase()}</i>)}
          {extra > 0 && <i className="prs-more">+{extra}</i>}
        </span>
        <span className="prs-count">{list.length} en ligne</span>
      </button>
      {open && (
        <div className="prs-pop" role="dialog" aria-label="Personnes en ligne">
          <div className="prs-hd">En ligne maintenant</div>
          {list.map(u => {
            const where = u.item && titleOf(u.item)
            return (
              <div className="prs-row" key={u.id}>
                <span className="prs-av" style={{ background: u.color }}>{(u.name || '?')[0].toUpperCase()}<b /></span>
                <span className="prs-txt">
                  <strong>{u.name || 'Membre'}{u.id === me && <em>toi</em>}</strong>
                  <small>{where ? 'Sur « ' + where + ' »' : "Sur l'accueil"}</small>
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
