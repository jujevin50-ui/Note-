'use client'
import { useEffect, useRef, useState } from 'react'

export const DEFAULT_TIMER = { mode: 'timer', seconds: 25 * 60 }
export function normalizeTimer(value) {
  return {
    mode: value?.mode === 'stopwatch' ? 'stopwatch' : 'timer',
    seconds: Number.isInteger(value?.seconds) && value.seconds >= 1 && value.seconds <= 86400 ? value.seconds : DEFAULT_TIMER.seconds,
  }
}
export function formatTime(seconds) {
  const total = Math.max(0, Math.floor(seconds))
  const h = Math.floor(total / 3600)
  const m = Math.floor(total % 3600 / 60)
  const s = total % 60
  return (h ? String(h).padStart(2, '0') + ':' : '') + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0')
}

export function TimerSettings({ value, onChange }) {
  const minutes = Math.floor(value.seconds / 60)
  const seconds = value.seconds % 60
  const duration = (m, s) => onChange({ ...value, seconds: Math.max(1, Math.min(86400, m * 60 + s)) })
  return <>
    <h2>Minuteur et chronomètre</h2>
    <div className="st-field"><label htmlFor="timer-mode">Mode affiché à côté des paramètres</label>
      <select id="timer-mode" value={value.mode} onChange={e => onChange({ ...value, mode: e.target.value })}>
        <option value="timer">Minuteur</option><option value="stopwatch">Chronomètre</option>
      </select>
    </div>
    {value.mode === 'timer' && <div className="st-field">
      <label>Durée du minuteur</label>
      <div className="timer-duration">
        <label>Minutes<input type="number" min="0" max="1440" value={minutes} onChange={e => duration(Math.max(0, Math.min(1440, Math.floor(Number(e.target.value) || 0))), seconds)} /></label>
        <label>Secondes<input type="number" min="0" max="59" value={seconds} onChange={e => duration(minutes, Math.max(0, Math.min(59, Math.floor(Number(e.target.value) || 0))))} /></label>
      </div>
    </div>}
    <p className="muted">Démarre, mets en pause ou réinitialise depuis la barre du haut. Modifier le mode ou la durée réinitialise le compteur. Les réglages sont enregistrés sur cet appareil.</p>
  </>
}

export default function FocusTimer({ config }) {
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(false)
  const origin = useRef(0)
  const accumulated = useRef(0)
  const countdown = config.mode === 'timer'
  const finished = countdown && elapsed >= config.seconds * 1000
  const sample = () => accumulated.current + Date.now() - origin.current
  useEffect(() => {
    if (!running) return
    const tick = () => {
      const next = sample()
      setElapsed(countdown ? Math.min(next, config.seconds * 1000) : next)
      if (countdown && next >= config.seconds * 1000) {
        accumulated.current = config.seconds * 1000
        setRunning(false)
      }
    }
    tick()
    const interval = setInterval(tick, 200)
    return () => clearInterval(interval)
  }, [running, countdown, config.seconds])
  const toggle = () => {
    if (running) {
      accumulated.current = sample()
      setElapsed(accumulated.current)
      setRunning(false)
    } else {
      if (finished) { accumulated.current = 0; setElapsed(0) }
      origin.current = Date.now()
      setRunning(true)
    }
  }
  const reset = () => { setRunning(false); accumulated.current = 0; setElapsed(0) }
  const display = countdown ? Math.ceil(Math.max(0, config.seconds * 1000 - elapsed) / 1000) : Math.floor(elapsed / 1000)
  const label = countdown ? 'Minuteur' : 'Chronomètre'
  return <div className={'focus-timer' + (finished ? ' finished' : '')} role="group" aria-label={label}>
    <span className="focus-timer-time" role="timer" aria-label={label + ' : ' + formatTime(display)} title={label}>{formatTime(display)}</span>
    <button type="button" onClick={toggle} aria-label={running ? 'Mettre en pause' : finished ? 'Relancer le minuteur' : 'Démarrer le ' + label.toLowerCase()} title={running ? 'Pause' : 'Démarrer'}>{running ? 'Ⅱ' : '▶'}</button>
    <button type="button" onClick={reset} aria-label="Réinitialiser le compteur" title="Réinitialiser">↺</button>
    <span className="timer-announcement" role="status">{finished ? 'Minuteur terminé' : ''}</span>
  </div>
}
