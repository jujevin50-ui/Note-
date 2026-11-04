'use client'
import { useState } from 'react'
import { compareItems } from '../lib/manual-order'
const TYPE = 'application/x-note-item'
export default function useManualSort(items, onReorder) {
  const [over, setOver] = useState(null)
  return item => ({
    draggable: Boolean(onReorder),
    'data-sort-id': item.id,
    'data-drop': over?.id === item.id ? over.after ? 'after' : 'before' : undefined,
    onDragStart: e => { e.stopPropagation(); e.dataTransfer.setData(TYPE, item.id); e.dataTransfer.effectAllowed = 'move' },
    onDragOver: e => {
      if (!onReorder || !Array.from(e.dataTransfer.types).includes(TYPE)) return
      e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'move'
      const rect = e.currentTarget.getBoundingClientRect()
      setOver({ id: item.id, after: e.clientY > rect.top + rect.height / 2 })
    },
    onDragLeave: e => { if (!e.currentTarget.contains(e.relatedTarget)) setOver(null) },
    onDragEnd: () => setOver(null),
    onDrop: e => { const id = e.dataTransfer.getData(TYPE); if (!id) return; e.preventDefault(); e.stopPropagation(); const rect = e.currentTarget.getBoundingClientRect(); onReorder?.(id, item.id, e.clientY > rect.top + rect.height / 2); setOver(null) },
    onKeyDown: e => {
      if (!onReorder || !e.altKey || !['ArrowUp', 'ArrowDown'].includes(e.key)) return
      e.preventDefault()
      const siblings = items.filter(i => (i.parent_id || null) === (item.parent_id || null)).sort(compareItems)
      const target = siblings[siblings.findIndex(i => i.id === item.id) + (e.key === 'ArrowUp' ? -1 : 1)]
      if (target) onReorder(item.id, target.id, e.key === 'ArrowDown')
    },
  })
}
