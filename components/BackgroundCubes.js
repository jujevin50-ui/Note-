'use client'
import { useEffect, useRef } from 'react'

export default function BackgroundCubes() {
  const canvasRef = useRef(null)
  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!context) return
    const motion = matchMedia('(prefers-reduced-motion: reduce)')
    let width = 0, height = 0, cubes = [], frame = 0, previousTime = 0
    let pointer = null
    const colors = ['139,92,246','99,102,241','56,189,248','168,85,247']
    const face = (points, fill) => {
      context.beginPath()
      points.forEach(([x,y],index) => index ? context.lineTo(x,y) : context.moveTo(x,y))
      context.closePath(); context.fillStyle = fill; context.fill(); context.stroke()
    }
    const draw = time => {
      frame = 0
      if (document.hidden) return
      const delta = previousTime ? Math.min(64,time - previousTime) : 16
      previousTime = time
      context.clearRect(0,0,width,height)
      context.lineWidth = .7
      let animating = false
      for (const cube of cubes) {
        const distance = pointer ? Math.hypot(cube.x-pointer.x,cube.y-pointer.y) : Infinity
        const target = distance < 110 ? (1-distance/110)*.6 : 0
        cube.glow = motion.matches ? 0 : cube.glow + (target-cube.glow)*Math.min(1,delta/120)
        if (Math.abs(cube.glow-target) > .005) animating = true
        const {x,y,glow,color} = cube
        context.strokeStyle = `rgba(130,122,164,${.13+glow*.35})`
        face([[x,y-32],[x+28,y-16],[x,y],[x-28,y-16]],glow>.005?`rgba(${color},${.025+glow*.4})`:'rgba(126,112,175,.025)')
        face([[x,y],[x+28,y-16],[x+28,y+16],[x,y+32]],glow>.005?`rgba(${color},${glow*.23})`:'rgba(90,80,132,.018)')
        face([[x-28,y-16],[x,y],[x,y+32],[x-28,y+16]],glow>.005?`rgba(${color},${glow*.12})`:'rgba(50,46,75,.025)')
      }
      if (animating && !motion.matches) frame = requestAnimationFrame(draw)
    }
    const requestDraw = () => { if (!frame && !document.hidden) frame=requestAnimationFrame(draw) }
    const resize = () => {
      width = window.innerWidth; height = window.innerHeight
      const ratio = Math.min(window.devicePixelRatio || 1,1.5)
      canvas.width = Math.ceil(width*ratio); canvas.height = Math.ceil(height*ratio)
      context.setTransform(ratio,0,0,ratio,0,0)
      cubes=[]
      for(let row=-1;row<Math.ceil(height/48)+1;row++)for(let col=-1;col<Math.ceil(width/56)+1;col++)cubes.push({x:col*56+(row%2?28:0),y:row*48,glow:0,color:colors[Math.abs(row*7+col)%colors.length]})
      requestDraw()
    }
    const move = event => { if (motion.matches || event.pointerType==='touch') return; pointer={x:event.clientX,y:event.clientY};requestDraw() }
    const leave = () => { pointer=null;requestDraw() }
    const visibility = () => { if(document.hidden){cancelAnimationFrame(frame);frame=0;previousTime=0}else requestDraw() }
    const reduced = () => { pointer=null;requestDraw() }
    resize()
    window.addEventListener('resize',resize)
    window.addEventListener('pointermove',move,{passive:true})
    document.documentElement.addEventListener('pointerleave',leave)
    document.addEventListener('visibilitychange',visibility)
    motion.addEventListener('change',reduced)
    return () => { cancelAnimationFrame(frame);window.removeEventListener('resize',resize);window.removeEventListener('pointermove',move);document.documentElement.removeEventListener('pointerleave',leave);document.removeEventListener('visibilitychange',visibility);motion.removeEventListener('change',reduced) }
  },[])
  return <canvas ref={canvasRef} className="background-cubes" aria-hidden="true"/>
}
