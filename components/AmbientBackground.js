import Aurora from './vendor/react-bits/Aurora'

export default function AmbientBackground() {
  return <div className="ambient-background" aria-hidden="true">
    <Aurora direction="bottom" colorStops={['#6438b5','#2585ad','#29a58e','#8350be']} height={0.43} amplitude={2.5} blend={1} glow={0} layers={3} brightness={0.8} speed={3} intro={false} mouseInteraction={false} dpr={1}/>
    <div className="ambient-vignette"/>
  </div>
}
