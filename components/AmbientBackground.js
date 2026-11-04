import Aurora from './vendor/react-bits/Aurora'

export default function AmbientBackground() {
  return <div className="ambient-background" aria-hidden="true">
    <Aurora colorStops={['#6438b5','#2585ad','#29a58e','#8350be']} height={0.68} amplitude={1.8} blend={0.6} glow={0.7} layers={3} brightness={0.8} speed={0.85} intro={false} mouseInteraction={false} dpr={1}/>
    <div className="ambient-vignette"/>
  </div>
}
