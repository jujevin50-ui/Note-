'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function useRecentDocuments(projectId, space) {
  const [state, setState] = useState({ key: '', rows: [], status: 'loading' })
  const key = projectId + ':' + space
  const current = useRef(key)
  current.current = key
  const sequence = useRef(0)
  const refresh = useCallback(async () => {
    if (!projectId) return
    const request = ++sequence.current
    const { data, error } = await supabase.rpc('recent_documents', { p_project_id: projectId, p_space: space })
    if (current.current === key && request === sequence.current) setState({ key, rows: data || [], status: error ? 'error' : 'ready' })
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
    const { error } = await supabase.rpc('record_document_open', { p_item_id: item.id })
    if (current.current !== key) return
    if (error) setState({ key, rows: [], status: 'error' })
    else refresh()
  }
  return { recent: state.key === key ? state.rows : [], recentStatus: state.key === key ? state.status : 'loading', recordOpen }
}
