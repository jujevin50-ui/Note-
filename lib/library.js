export function selectLibraryItems(items, { query = '', filter = 'all', sort = 'recent', rootsOnly = true } = {}) {
  const needle = query.trim().toLocaleLowerCase('fr')
  return items.filter(item => {
    if (!needle && rootsOnly) return item.type === 'folder' && !item.parent_id
    return (!needle || (item.title || '').toLocaleLowerCase('fr').includes(needle)) && (filter === 'all' || item.type === filter)
  }).sort((a, b) => sort === 'name'
    ? (a.title || '').localeCompare(b.title || '', 'fr')
    : new Date(b.created_at || 0) - new Date(a.created_at || 0))
}
