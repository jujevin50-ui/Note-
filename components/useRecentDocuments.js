'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { loadRecentDocuments, recordDocumentOpen, recentErrorStatus } from '../lib/recent-documents'

export default function useRecentDocuments(projectId, space) {
  const [state, setState] = useState({ key: '', rows: [], status: 'loading' })
  const key = projectId + ':' + space
  const current = useRef(key)
  current.current = key
  const sequence = useRef(0)
  const refresh = useCallback(async () => {
    if (!projectId) return
    const request = ++sequence.current
    let data, error
    try { ({ data, error } = await loadRecentDocuments(supabase, projectId, space)) } catch (failure) { error = failure }
    if (current.current === key && request === sequence.current) setState({ key, rows: data || [], status: error ? recentErrorStatus(error) : 'ready' })
  }, [projectId, space, key])
  useEffect(() => {
    if (!projectId) return
    refresh()
    const channel = supabase.channel('recent-documents:' + key)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items', filter: 'project_id=eq.' + projectId }, refresh).subscribe()
    const interval = setInterval(refresh, 30000)
    const visible = () => { if (document.visibilityState === 'visible') refresh() }
    document.addEventListener('visibilitychange', visible)
    return () => { ++sequence.current; clearInterval(interval); document.removeEventListener('visibilitychange', visible); supabase.removeChannel(channel) }
  }, [refresh, key, projectId])
  const recordOpen = async item => {
    if (!item || !['page', 'pdf'].includes(item.type)) return
    let error
    try { ({ error } = await recordDocumentOpen(supabase, item.id)) } catch (failure) { error = failure }
    if (current.current !== key) return
    if (error) setState({ key, rows: [], status: recentErrorStatus(error) })
    else refresh()
  }
  return { refreshRecent: refresh, recent: state.key === key ? state.rows : [], recentStatus: state.key === key ? state.status : 'loading', recordOpen }
}
