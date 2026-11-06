'use client'
import { useEffect, useState } from 'react'
import { compareItems, dropItems } from '../lib/manual-order'
const TYPE = 'application/x-note-item'
let draggedItem = null
const finishDrag = () => { draggedItem = null; window.dispatchEvent(new Event('note-drag-end')) }
export default function useManualSort(items, onReorder) {
  const [over, setOver] = useState(null)
  useEffect(() => {
    const clear = () => setOver(null)
    window.addEventListener('note-drag-end', clear)
    return () => window.removeEventListener('note-drag-end', clear)
  }, [])
  return (item, { destinationOnly = false } = {}) => {
    const zoneAt = e => {
      if (destinationOnly) return 'inside'
      const rect = e.currentTarget.getBoundingClientRect()
      const ratio = (e.clientY - rect.top) / rect.height
      return item.type === 'folder' && ratio >= .25 && ratio <= .75 ? 'inside' : ratio > .5 ? 'after' : 'before'
    }
    return {
      draggable: !destinationOnly && Boolean(onReorder),
      'data-sort-id': item.id || 'project-root',
      'data-drop': over?.id === item.id ? over.zone : undefined,
      onDragStart: destinationOnly ? undefined : e => { e.stopPropagation(); draggedItem = item.id; e.dataTransfer.setData(TYPE, item.id); e.dataTransfer.effectAllowed = 'move' },
      onDragOver: e => {
        if (!onReorder || !Array.from(e.dataTransfer.types).includes(TYPE)) return
        e.stopPropagation()
        const zone = zoneAt(e)
        if (!dropItems(items, draggedItem, item.id, zone).length) { e.dataTransfer.dropEffect = 'none'; setOver(null); return }
        e.preventDefault(); e.dataTransfer.dropEffect = 'move'
        setOver({ id: item.id, zone })
      },
      onDragLeave: e => { if (!e.currentTarget.contains(e.relatedTarget)) setOver(null) },
      onDragEnd: finishDrag,
      onDrop: e => {
        const id = e.dataTransfer.getData(TYPE)
        if (!id) return
        e.preventDefault(); e.stopPropagation()
        const zone = zoneAt(e)
        if (dropItems(items, id, item.id, zone).length) onReorder?.(id, item.id, zone)
        finishDrag(); setOver(null)
      },
      onKeyDown: destinationOnly ? undefined : e => {
        if (!onReorder || !e.altKey || !['ArrowUp', 'ArrowDown'].includes(e.key)) return
        e.preventDefault()
        const siblings = items.filter(i => (i.parent_id || null) === (item.parent_id || null) && (i.space || 'notes') === (item.space || 'notes')).sort(compareItems)
        const target = siblings[siblings.findIndex(i => i.id === item.id) + (e.key === 'ArrowUp' ? -1 : 1)]
        if (target) onReorder(item.id, target.id, e.key === 'ArrowDown' ? 'after' : 'before')
      },
    }
  }
}
