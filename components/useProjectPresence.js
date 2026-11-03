'use client'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { colorOf } from '../lib/provider'
import { connectProjectPresence } from '../lib/project-presence'

export default function useProjectPresence(projectId, user, item) {
  const [online, setOnline] = useState([])
  const [status, setStatus] = useState('connecting')
  const connection = useRef(null)
  const name = user.user_metadata?.name || user.email?.split('@')[0] || 'Membre'
  const latest = useRef(null)
  latest.current = { id: user.id, name, color: colorOf(user.email || user.id), item }
  useEffect(() => {
    if (!projectId) { setOnline([]); return }
    const current = connectProjectPresence(supabase, projectId, latest.current, setOnline, setStatus)
    connection.current = current
    const refresh = () => current.update(latest.current)
    const visible = () => { if (document.visibilityState === 'visible') refresh() }
    const interval = setInterval(refresh, 20000)
    window.addEventListener('online', refresh)
    document.addEventListener('visibilitychange', visible)
    return () => {
      connection.current = null
      clearInterval(interval)
      window.removeEventListener('online', refresh)
      document.removeEventListener('visibilitychange', visible)
      current.dispose()
    }
  }, [projectId, user.id])
  useEffect(() => { connection.current?.update(latest.current) }, [name, item, user.email])
  return { online, status }
}
