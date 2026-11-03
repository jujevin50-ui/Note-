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

/* Folder (React Bits) — dossier animé : le rabat s'ouvre et les feuilles sortent */
const darken = (hex, k = 0.25) => {
  let c = String(hex || '#3b82f6').replace('#', '')
  if (c.length === 3) c = c.split('').map(x => x + x).join('')
  if (!/^[0-9a-f]{6}$/i.test(c)) return '#2b5fc4'
  const n = parseInt(c, 16)
  const f = v => Math.max(0, Math.min(255, Math.floor(v * (1 - k))))
  return '#' + ((1 << 24) + (f((n >> 16) & 255) << 16) + (f((n >> 8) & 255) << 8) + f(n & 255)).toString(16).slice(1)
}
export function FolderBits({ color = '#3b82f6', size = 0.5, open = false, className = '' }) {
  return (
    <span className={'rbf-box ' + className} style={{ '--s': size }} aria-hidden>
      <span className={'rbf' + (open ? ' open' : '')} style={{ '--fc': color, '--fb': darken(color) }}>
        <span className="rbf-back">
          <i className="rbf-paper p1" /><i className="rbf-paper p2" /><i className="rbf-paper p3" />
          <i className="rbf-front" /><i className="rbf-front right" />
        </span>
      </span>
    </span>
  )
}

/* Gradient Waves (React Bits · Backgrounds) — vagues satinées blanches, éclairées par une lumière qui suit le curseur
   et gonfle au clic. Shader WebGL2 sans dépendance (pas besoin d'OGL). */
const WAVES_FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;
uniform float uSwell;
out vec4 fragColor;

float hgt(vec2 p, float t) {
  float h = 0.0;
  h += sin(p.x * 1.3 + p.y * 0.9 + t * 0.7) * 0.50;
  h += sin(p.x * 2.1 - p.y * 1.4 + t * 1.0) * 0.28;
  h += sin(p.x * 0.7 + p.y * 2.3 - t * 0.55) * 0.35;
  h += sin(p.x * 3.7 + p.y * 2.9 + t * 1.5) * 0.07;
  return h;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float hor = 0.80;
  float dy = hor - uv.y;
  float depth = 1.0 / (max(dy, 0.0) * 3.0 + 0.14);
  vec2 p = vec2((uv.x - 0.5) * depth * 6.0, depth * 3.2) * 1.9;
  float e = 0.06;
  float h0 = hgt(p, uTime);
  float hx = hgt(p + vec2(e, 0.0), uTime);
  float hz = hgt(p + vec2(0.0, e), uTime);
  vec3 n = normalize(vec3(-(hx - h0) / e * 0.34, 1.0, -(hz - h0) / e * 0.34));

  vec3 L = normalize(vec3((uMouse.x - 0.5) * 2.2, 0.55 + uMouse.y * 0.6, 0.55));
  vec3 V = normalize(vec3(0.0, 0.55, 1.0));
  float diff = clamp(dot(n, L), 0.0, 1.0);
  vec3 H = normalize(L + V);
  float spec = pow(clamp(dot(n, H), 0.0, 1.0), 38.0);

  vec2 d2 = vec2((uv.x - uMouse.x) * (uRes.x / uRes.y), uv.y - uMouse.y);
  float glow = exp(-dot(d2, d2) * 5.0) * (0.6 + uSwell * 1.4);

  vec3 shadow = vec3(0.83, 0.85, 0.92);
  vec3 lit = vec3(1.0);
  vec3 col = mix(shadow, lit, diff * 0.85 + 0.15);
  col += vec3(0.03, 0.0, 0.06) * n.x;
  col += vec3(1.0) * spec * 0.55 + vec3(0.9, 0.93, 1.0) * glow * 0.25;

  vec3 haze = vec3(1.0);
  float f = smoothstep(0.0, 0.42, dy);
  col = mix(haze, col, f);
  vec3 sky = mix(vec3(1.0), vec3(0.93, 0.95, 1.0), smoothstep(0.0, 0.2, -dy));
  col = mix(col, sky, step(dy, 0.0));
  fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`
export function GradientWaves({ speed = 1, quality = 0.75, className = '' }) {
  const ref = useRef(null)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    const gl = c.getContext('webgl2', { alpha: false, antialias: false })
    if (!gl) { c.style.display = 'none'; return }
    const mk = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null }
    const vs = mk(gl.VERTEX_SHADER, '#version 300 es\nin vec2 position;\nvoid main(){gl_Position=vec4(position,0.0,1.0);}')
    const fs = mk(gl.FRAGMENT_SHADER, WAVES_FRAG)
    if (!vs || !fs) { c.style.display = 'none'; return }
    const prog = gl.createProgram()
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { c.style.display = 'none'; return }
    gl.useProgram(prog)
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, 'position')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    const u = n => gl.getUniformLocation(prog, n)
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5) * quality
    const resize = () => {
      const w = Math.max(2, Math.round(c.clientWidth * dpr)), h = Math.max(2, Math.round(c.clientHeight * dpr))
      if (c.width !== w || c.height !== h) { c.width = w; c.height = h }
      gl.viewport(0, 0, c.width, c.height)
      gl.uniform2f(u('uRes'), c.width, c.height)
    }
    resize()
    const ro = new ResizeObserver(resize); ro.observe(c)
    // lumière : suit le curseur (lissé), dérive doucement quand il est ailleurs, gonfle au clic
    const m = { x: 0.5, y: 0.35 }, target = { x: 0.5, y: 0.35 }
    let swell = 0, hovering = false
    const rel = e => { const r = c.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width, y: 1 - (e.clientY - r.top) / r.height, inside: e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom } }
    const move = e => { const q = rel(e); hovering = q.inside; if (q.inside) { target.x = q.x; target.y = q.y } }
    const down = e => { if (rel(e).inside) swell = 1 }
    addEventListener('pointermove', move, { passive: true })
    addEventListener('pointerdown', down, { passive: true })
    let raf = 0
    const t0 = performance.now()
    const draw = now => {
      const t = (now - t0) * 0.001
      if (!hovering) { target.x = 0.5 + Math.sin(t * 0.35) * 0.32; target.y = 0.32 + Math.cos(t * 0.27) * 0.2 }
      m.x += (target.x - m.x) * 0.06; m.y += (target.y - m.y) * 0.06
      swell *= 0.94
      gl.uniform1f(u('uTime'), t * speed)
      gl.uniform2f(u('uMouse'), m.x, m.y)
      gl.uniform1f(u('uSwell'), swell)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      if (!reduce) raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(raf); ro.disconnect()
      removeEventListener('pointermove', move); removeEventListener('pointerdown', down)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    }
  }, [speed, quality])
  return <canvas ref={ref} className={'plasma ' + className} aria-hidden />
}
