'use client'
import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export default function useFolderNameHint() {
  const [hint, setHint] = useState(null)
  const timer = useRef(null)
  const id = useId()
  const hide = () => { clearTimeout(timer.current); setHint(null) }
  const show = target => {
    const button = target.closest?.('[data-folder-name]')
    clearTimeout(timer.current)
    if (!button) { setHint(null); return }
    timer.current = setTimeout(() => {
      const rect = button.getBoundingClientRect()
      setHint({ text: button.dataset.folderName, top: Math.max(12, Math.min(rect.top, window.innerHeight - 100)), left: Math.max(12, Math.min(rect.right + 10, window.innerWidth - Math.min(280, window.innerWidth - 24) - 12)) })
    }, 120)
  }
  useEffect(() => {
    window.addEventListener('resize', hide)
    return () => { clearTimeout(timer.current); window.removeEventListener('resize', hide) }
  }, [])
  return {
    events: {
      onPointerOver: e => { if (e.pointerType !== 'touch' && !e.target.closest?.('[data-folder-name]')?.contains(e.relatedTarget)) show(e.target) },
      onPointerOut: e => { const button = e.target.closest?.('[data-folder-name]'); if (button && !button.contains(e.relatedTarget)) hide() },
      onFocusCapture: e => show(e.target),
      onBlurCapture: hide,
      onScrollCapture: hide,
      onClickCapture: hide,
      onDragStartCapture: hide,
      onKeyDownCapture: e => { if (e.key === 'Escape') hide() },
    },
    descriptionId: id,
    tooltip: hint ? createPortal(<div id={id} role="tooltip" className="sn-folder-hint" style={{ top: hint.top, left: hint.left }}>{hint.text}</div>, document.body) : null,
  }
}
