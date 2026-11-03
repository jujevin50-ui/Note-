'use client'
import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export default function ToolbarPopover({ anchor, vertical, children, onClose }) {
  const ref = useRef(null)
  const [position, setPosition] = useState({ visibility: 'hidden' })
  useLayoutEffect(() => {
    const place = () => {
      if (!anchor || !ref.current) return
      const a = anchor.getBoundingClientRect(), box = ref.current.getBoundingClientRect()
      const gap = 10, edge = 12
      const left = vertical ? a.left - box.width - gap : a.left
      const top = vertical ? a.top : a.bottom + gap
      setPosition({ left: Math.max(edge, Math.min(left, window.innerWidth - box.width - edge)), top: Math.max(edge, Math.min(top, window.innerHeight - box.height - edge)), visibility: 'visible' })
    }
    place()
    const escape = e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose(); anchor?.focus() } }
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    document.addEventListener('keydown', escape)
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); document.removeEventListener('keydown', escape) }
  }, [anchor, vertical, onClose])
  return createPortal(<div className="paper toolbar-popover-root"><div ref={ref} className="bar tb-pop toolbar-popover" style={position} role="dialog" aria-label="Options de mise en forme" onMouseDown={e => { e.stopPropagation(); if (e.target.tagName !== 'INPUT') e.preventDefault() }}>{children}</div></div>, document.body)
}
