export const itemPosition = item => Number.isFinite(item.pos) ? item.pos : (Date.parse(item.created_at) || 0)
export const compareItems = (a, b) => itemPosition(a) - itemPosition(b) || a.id.localeCompare(b.id)
export function reorderItems(items, draggedId, targetId, after = false) {
  const dragged = items.find(i => i.id === draggedId), target = items.find(i => i.id === targetId)
  if (!dragged || !target || draggedId === targetId || (dragged.parent_id || null) !== (target.parent_id || null) || (dragged.space || 'notes') !== (target.space || 'notes')) return []
  const siblings = items.filter(i => (i.parent_id || null) === (target.parent_id || null) && (i.space || 'notes') === (target.space || 'notes')).sort(compareItems)
  const ordered = siblings.filter(i => i.id !== draggedId)
  ordered.splice(ordered.findIndex(i => i.id === targetId) + (after ? 1 : 0), 0, dragged)
  if (ordered.every((item, index) => item.id === siblings[index].id)) return []
  const index = ordered.findIndex(i => i.id === draggedId)
  const before = index ? itemPosition(ordered[index - 1]) : itemPosition(ordered[index + 1]) - 2048
  const next = index < ordered.length - 1 ? itemPosition(ordered[index + 1]) : before + 2048
  const position = Math.floor(before + (next - before) / 2)
  return next > before && position > before && position < next ? [{ id: draggedId, pos: position }] : ordered.map((item, i) => ({ id: item.id, pos: (i + 1) * 1024 }))
}

// Moving a folder changes only its parent; its descendants stay attached to it.
export function moveIntoFolder(items, draggedId, parentId) {
  const dragged = items.find(item => item.id === draggedId)
  const parent = parentId == null ? null : items.find(item => item.id === parentId)
  if (!dragged || (parentId != null && parent?.type !== 'folder') || (dragged.parent_id || null) === (parentId || null)) return []
  if (parent && (parent.space || 'notes') !== (dragged.space || 'notes')) return []
  const seen = new Set()
  let ancestor = parent
  while (ancestor) {
    if (ancestor.id === draggedId || seen.has(ancestor.id)) return []
    seen.add(ancestor.id)
    ancestor = items.find(item => item.id === ancestor.parent_id)
  }
  const siblings = items.filter(item => item.id !== draggedId && (item.parent_id || null) === (parentId || null) && (item.space || 'notes') === (dragged.space || 'notes')).sort(compareItems)
  const last = siblings.length ? itemPosition(siblings[siblings.length - 1]) : 0
  const next = Math.floor(last + 1024)
  if (Number.isSafeInteger(next) && next > last) return [{ id: draggedId, parent_id: parentId || null, pos: next }]
  return [...siblings.map((item,index) => ({id:item.id,pos:(index+1)*1024})), {id:draggedId,parent_id:parentId||null,pos:(siblings.length+1)*1024}]
}

export function dropItems(items, draggedId, targetId, zone) {
  if (zone === 'inside') return moveIntoFolder(items, draggedId, targetId)
  const target = items.find(item => item.id === targetId)
  const dragged = items.find(item => item.id === draggedId)
  if (!target || !dragged || draggedId === targetId) return []
  if ((dragged.parent_id || null) === (target.parent_id || null)) return reorderItems(items, draggedId, targetId, zone === 'after')
  const moved = moveIntoFolder(items, draggedId, target.parent_id)
  if (!moved.length) return []
  const staged = items.map(item => ({ ...item, ...moved.find(update => update.id === item.id) }))
  const ordered = reorderItems(staged, draggedId, targetId, zone === 'after')
  const changes = new Map(moved.map(update => [update.id,update]))
  ordered.forEach(update => changes.set(update.id,{...changes.get(update.id),...update}))
  return [...changes.values()]
}
