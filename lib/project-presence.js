// Wait for an old channel to leave before reusing its topic (including Strict Mode).
const pendingLeaves = new WeakMap()

export function presenceMembers(state) {
  const members = new Map()
  for (const sessions of Object.values(state || {})) {
    for (const session of sessions || []) {
      if (!session?.id) continue
      const previous = members.get(session.id)
      if (!previous || (session.updated_at || 0) >= (previous.updated_at || 0)) members.set(session.id, session)
    }
  }
  return [...members.values()]
}

export function connectProjectPresence(client, projectId, initial, onChange, onStatus) {
  const topic = 'presence:' + projectId
  let leaves = pendingLeaves.get(client)
  if (!leaves) { leaves = new Map(); pendingLeaves.set(client, leaves) }
  const previous = leaves.get(topic) || Promise.resolve()
  let channel, disposed = false, subscribed = false, payload = initial, publishing = false, queued = false, retry, reconnectTimer, wasConnected = false, reconnectRetry, generation = 0, attempts = 0, failures = 0, work
  const publish = async () => {
    if (!subscribed || disposed) return
    if (publishing) { queued = true; return }
    publishing = true
    const current = channel, version = generation
    clearTimeout(retry)
    try {
      do {
        queued = false
        let result
        try { result = await current.track({ ...payload, updated_at: Date.now() }) } catch { result = 'error' }
        if (disposed || !subscribed || version !== generation) return
        // A delayed presence acknowledgement does not mean that document saving is offline.
        onStatus(result === 'ok' ? 'connected' : 'syncing')
        if (result !== 'ok') { if (++failures >= 3) restart(); else retry = setTimeout(publish, 2000); break }
        failures = 0
      } while (queued && !disposed && subscribed)
    } finally { if (version === generation) publishing = false }
  }
  onChange([])
  onStatus('connecting')
  const scheduleReconnect = () => {
    if (disposed || reconnectRetry) return
    reconnectRetry = setTimeout(() => { reconnectRetry = null; restart() }, Math.min(15000, 2000 * 2 ** Math.min(attempts, 3)))
  }
  const open = () => {
    if (disposed) return
    const version = ++generation
    const current = client.channel(topic, { config: { presence: { key: initial.id, enabled: true } } })
    channel = current
    const sync = () => { if (!disposed && subscribed && version === generation) onChange(presenceMembers(current.presenceState())) }
    current.on('presence', { event: 'sync' }, sync)
      .on('presence', { event: 'join' }, sync)
      .on('presence', { event: 'leave' }, sync)
      .subscribe(status => {
        if (disposed || version !== generation) return
        subscribed = status === 'SUBSCRIBED'
        if (subscribed) {
          clearTimeout(reconnectTimer); reconnectTimer = null
          clearTimeout(reconnectRetry); reconnectRetry = null
          attempts = 0; failures = 0; wasConnected = true
          onStatus('connected'); sync(); publish()
        } else {
          scheduleReconnect()
          if (!wasConnected) { onChange([]); onStatus('reconnecting') }
          else if (!reconnectTimer) reconnectTimer = setTimeout(() => {
            reconnectTimer = null
            if (!disposed && !subscribed) { onChange([]); onStatus('reconnecting') }
          }, 1500)
        }
      })
  }
  const restart = () => {
    if (disposed) return
    clearTimeout(retry); clearTimeout(reconnectRetry); reconnectRetry = null
    subscribed = false; publishing = false; generation++; attempts++
    work = work.catch(() => {}).then(async () => {
      if (disposed) return
      const old = channel; channel = null
      if (old) await client.removeChannel(old)
      open()
    }).catch(() => { if (!disposed) { onChange([]); onStatus('reconnecting'); scheduleReconnect() } })
    return work
  }
  work = previous.catch(() => {}).then(open).catch(() => { if (!disposed) { onStatus('reconnecting'); scheduleReconnect() } })
  return {
    update(next) { if (next) payload = next; if (!subscribed) { scheduleReconnect(); return } return publish() },
    dispose() {
      clearTimeout(retry)
      clearTimeout(reconnectRetry)
      clearTimeout(reconnectTimer)
      disposed = true
      subscribed = false
      const leaving = work.then(() => channel ? client.removeChannel(channel) : undefined).catch(() => {})
      leaves.set(topic, leaving)
      leaving.finally(() => { if (leaves.get(topic) === leaving) leaves.delete(topic) })
      return leaving
    },
  }
}
