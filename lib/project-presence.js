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
  let channel, disposed = false, subscribed = false, payload = initial
  const publish = async () => {
    if (!subscribed || disposed) return
    try {
      const result = await channel.track({ ...payload, updated_at: Date.now() })
      if (!disposed && subscribed) onStatus(result === 'ok' ? 'connected' : 'reconnecting')
    } catch {
      if (!disposed) onStatus('reconnecting')
    }
  }
  onChange([])
  onStatus('connecting')
  const started = previous.catch(() => {}).then(() => {
    if (disposed) return
    channel = client.channel(topic, { config: { presence: { key: initial.id, enabled: true } } })
    const sync = () => { if (!disposed && subscribed) onChange(presenceMembers(channel.presenceState())) }
    channel.on('presence', { event: 'sync' }, sync)
      .on('presence', { event: 'join' }, sync)
      .on('presence', { event: 'leave' }, sync)
      .subscribe(status => {
        if (disposed) return
        subscribed = status === 'SUBSCRIBED'
        if (subscribed) { sync(); publish() }
        else { onChange([]); onStatus('reconnecting') }
      })
  }).catch(() => { if (!disposed) onStatus('reconnecting') })
  return {
    update(next) { if (next) payload = next; return publish() },
    dispose() {
      disposed = true
      subscribed = false
      const leaving = started.then(() => channel ? client.removeChannel(channel) : undefined).catch(() => {})
      leaves.set(topic, leaving)
      leaving.finally(() => { if (leaves.get(topic) === leaving) leaves.delete(topic) })
      return leaving
    },
  }
}
