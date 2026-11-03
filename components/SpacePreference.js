'use client'
import './space-preference.css'

export default function SpacePreference({ value, onChange }) {
  return <fieldset className="space-preference"><legend>Espace actif</legend><div className="space-preference-options">
    {[
      ['notes', 'Notes', <><path d="M14 3H5v18h14V8Z M14 3v5h5M8 12h8M8 16h5" /></>],
      ['invest', 'Invest', <><path d="M4 3v17h17M7 14l5-5 4 3 5-7M16 5h5v5" /></>],
    ].map(([id, label, icon]) => <label key={id} className={'space-preference-card' + (value === id ? ' is-selected' : '')}>
      <input type="radio" name="active-space" value={id} checked={value === id} onChange={() => onChange(id)} />
      <span className="space-preference-icon" aria-hidden="true"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{icon}</svg></span>
      <span>{label}</span><span className="space-preference-check" aria-hidden="true">{value === id && '✓'}</span>
    </label>)}
  </div></fieldset>
}
