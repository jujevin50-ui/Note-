import Aurora from './vendor/react-bits/Aurora'

export default function AmbientBackground() {
  return <div className="ambient-background" aria-hidden="true">
    <Aurora direction="bottom" colorStops={['#9b562d','#b58d43','#a36b38','#78442d']} height={0.43} amplitude={2.5} blend={1} glow={0} layers={3} brightness={0.72} speed={0.8} intro={false} mouseInteraction={false} dpr={1}/>
    <div className="ambient-vignette"/>
  </div>
}
