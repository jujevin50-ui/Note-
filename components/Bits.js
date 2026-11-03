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

/* Plasma (React Bits · Backgrounds) — shader WebGL2 en plein écran, sans dépendance (pas besoin d'OGL) */
const PLASMA_FRAG = `#version 300 es
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
uniform float uSpeed;
uniform float uScale;
uniform float uOpacity;
uniform vec3 uColor;
uniform float uUseColor;
out vec4 fragColor;

void main() {
  vec2 C = gl_FragCoord.xy;
  vec2 r = iResolution.xy;
  vec2 center = r * 0.5;
  C = (C - center) / uScale + center;
  float T = iTime * uSpeed;
  float d = 0.0, z = 0.0;
  vec3 O = vec3(0.0), p = vec3(0.0), S = vec3(0.0);
  vec4 o = vec4(0.0);
  for (float i = 1.0; i < 60.0; i++) {
    p = z * normalize(vec3(C - 0.5 * r, r.y));
    p.z -= 4.0;
    S = p;
    d = p.y - T;
    p.x += 0.4 * (1.0 + p.y) * sin(d + p.x * 0.1) * cos(0.34 * d + p.x * 0.05);
    mat2 m = mat2(cos(p.y + vec4(0.0, 11.0, 33.0, 0.0) - T));
    p.xz = p.xz * m;
    vec2 Q = p.xz;
    d = abs(sqrt(length(Q * Q)) - 0.25 * (5.0 + S.y)) / 3.0 + 8e-4;
    z += d;
    o = 1.0 + sin(S.y + p.z * 0.5 + S.z - length(S - p) + vec4(2.0, 1.0, 0.0, 8.0));
    O += o.w / d * o.xyz;
  }
  vec3 rgb = tanh(O / 1e4);
  if (any(isnan(rgb)) || any(isinf(rgb))) rgb = vec3(0.0);
  float k = (rgb.r + rgb.g + rgb.b) / 3.0;
  vec3 col = mix(rgb, k * uColor, step(0.5, uUseColor));
  fragColor = vec4(col, clamp(length(rgb) * uOpacity, 0.0, 1.0));
}
`
const hex3 = h => { const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h || ''); return m ? [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255] : [1, 1, 1] }
export function PlasmaBg({ speed = 0.5, scale = 1.1, opacity = 0.95, color = '', quality = 0.7, className = '' }) {
  const ref = useRef(null)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    const gl = c.getContext('webgl2', { alpha: true, premultipliedAlpha: false, antialias: false })
    if (!gl) { c.style.display = 'none'; return }
    const mk = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null }
    const vs = mk(gl.VERTEX_SHADER, '#version 300 es\nin vec2 position;\nvoid main(){gl_Position=vec4(position,0.0,1.0);}')
    const fs = mk(gl.FRAGMENT_SHADER, PLASMA_FRAG)
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
    const col = hex3(color)
    gl.uniform1f(u('uSpeed'), speed); gl.uniform1f(u('uScale'), scale); gl.uniform1f(u('uOpacity'), opacity)
    gl.uniform3f(u('uColor'), col[0], col[1], col[2]); gl.uniform1f(u('uUseColor'), color ? 1 : 0)
    gl.clearColor(0, 0, 0, 0)
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5) * quality
    const resize = () => {
      const w = Math.max(2, Math.round(c.clientWidth * dpr)), h = Math.max(2, Math.round(c.clientHeight * dpr))
      if (c.width !== w || c.height !== h) { c.width = w; c.height = h }
      gl.viewport(0, 0, c.width, c.height)
      gl.uniform2f(u('iResolution'), c.width, c.height)
    }
    resize()
    const ro = new ResizeObserver(resize); ro.observe(c)
    let raf = 0
    const t0 = performance.now()
    const draw = now => {
      gl.uniform1f(u('iTime'), (now - t0) * 0.001)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      if (!reduce) raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(raf); ro.disconnect()
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    }
  }, [speed, scale, opacity, color, quality])
  return <canvas ref={ref} className={'plasma ' + className} aria-hidden />
}
