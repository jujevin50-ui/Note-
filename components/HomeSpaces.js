'use client'
import './home-spaces.css'

export default function HomeSpaces({ onOpen }) {
  return <div className="home-spaces" aria-label="Espaces">
    {[
      ['notes', 'Notes', <><path d="M14 3H5v18h14V8Z M14 3v5h5M8 12h8M8 16h5" /></>],
      ['invest', 'Invest', <><path d="M4 3v17h17M7 14l5-5 4 3 5-7M16 5h5v5" /></>],
    ].map(([id,label,icon],index) => <button type="button" key={id} className={'home-space '+id} style={{'--space-index':index}} onClick={() => onOpen(id)}>
      <span className="home-space-orbit" aria-hidden="true" /><span className="home-space-icon"><svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icon}</svg></span>
      <span className="home-space-name">{label}</span><span className="home-space-arrow" aria-hidden="true">↗</span>
    </button>)}
  </div>
}
