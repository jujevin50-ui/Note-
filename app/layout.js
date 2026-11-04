import './globals.css'
import './sidebar-slider.css'
import './aceternity.css'
import './redesign.css'
import './ambient-background.css'
import AmbientBackground from '../components/AmbientBackground'
import {Plus_Jakarta_Sans,Bricolage_Grotesque} from 'next/font/google'
const sans=Plus_Jakarta_Sans({subsets:['latin'],variable:'--font-sans',display:'swap'})
const display=Bricolage_Grotesque({subsets:['latin'],variable:'--font-display-face',display:'swap'})
export const metadata={title:'Notes'}
export default function L({children}){return <html lang="fr" data-theme="dark" suppressHydrationWarning className={sans.variable+' '+display.variable}><body>
<AmbientBackground/>
{/* SVG filter for liquid-glass refraction (Chromium / Edge / Arc). Safari & Firefox fall back to frosted blur. */}
<svg aria-hidden style={{position:'absolute',width:0,height:0,overflow:'hidden'}}>
  <defs>
    <filter id="liquid-glass-filter" x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.015 0.04" numOctaves="2" seed="2" result="noise"/>
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="12" xChannelSelector="R" yChannelSelector="G"/>
      <feGaussianBlur stdDeviation="0.4"/>
    </filter>
  </defs>
</svg>
{children}</body></html>}
