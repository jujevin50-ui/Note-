const missingFunction = error => error?.code === 'PGRST202' || error?.code === '42883'
export function recentErrorStatus(error) {
  return error?.code === '42703' || error?.code === 'PGRST204' || missingFunction(error) ? 'setup-required' : 'error'
}

export async function loadRecentDocuments(client, projectId, space) {
  const result = await client.rpc('recent_documents', { p_project_id: projectId, p_space: space })
  if (!missingFunction(result.error)) return result
  // Older databases may have the column but not the RPC or an updated schema cache.
  let query = client.from('items').select('id,last_opened_at').eq('project_id', projectId)
    .in('type', ['page', 'pdf']).not('last_opened_at', 'is', null)
  query = space === 'notes' ? query.or('space.eq.notes,space.is.null') : query.eq('space', space)
  return query.order('last_opened_at', { ascending: false }).order('id').limit(3)
}

export async function recordDocumentOpen(client, itemId) {
  const result = await client.rpc('record_document_open', { p_item_id: itemId })
  if (!missingFunction(result.error)) return result
  return client.from('items').update({ last_opened_at: new Date().toISOString() }).eq('id', itemId).in('type', ['page', 'pdf'])
}
