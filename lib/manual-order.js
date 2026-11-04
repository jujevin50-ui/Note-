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
