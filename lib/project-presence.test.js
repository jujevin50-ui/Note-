import test from 'node:test'
import assert from 'node:assert/strict'
import { connectProjectPresence, presenceMembers } from './project-presence.js'

const flush = () => new Promise(resolve => setImmediate(resolve))
function realtime() {
  const channels = new Set()
  const sync = topic => { for (const ch of channels) if (ch.topic === topic && ch.ready) for (const fn of ch.listeners) fn() }
  return () => ({
    channels: [],
    channel(topic, options) {
      assert.equal(options.config.presence.enabled, true)
      const existing = this.channels.find(ch => ch.topic === topic)
      if (existing) return existing
      const ch = {
        topic, listeners: [], ready: false, payload: null,
        on(type, event, callback) { if (event.event === 'sync') this.listeners.push(callback); return this },
        subscribe(callback) { this.status = callback; this.ready = true; queueMicrotask(() => callback('SUBSCRIBED')); return this },
        async track(payload) { this.payload = payload; sync(topic); return 'ok' },
        presenceState() {
          const state = {}
          for (const other of channels) if (other.topic === topic && other.ready && other.payload) (state[other.payload.id] ||= []).push(other.payload)
          return state
        },
      }
      this.channels.push(ch); channels.add(ch)
      return ch
    },
    async removeChannel(ch) {
      await flush()
      this.channels = this.channels.filter(current => current !== ch)
      channels.delete(ch); ch.ready = false; sync(ch.topic)
    },
  })
}

test('all sessions are read and each member appears once with the latest activity', () => {
  assert.deepEqual(presenceMembers({ a: [{ id: 'a', item: 'old', updated_at: 1 }, { id: 'a', item: 'new', updated_at: 2 }], b: [{ id: 'b' }], broken: [{}] }), [{ id: 'a', item: 'new', updated_at: 2 }, { id: 'b' }])
})

test('two members see each other, navigation updates and departure is removed', async () => {
  const client = realtime(), a = client(), b = client()
  let first = [], second = [], status
  const one = connectProjectPresence(a, 'project', { id: 'a', name: 'Alice' }, users => { first = users }, value => { status = value })
  const two = connectProjectPresence(b, 'project', { id: 'b', name: 'Bob' }, users => { second = users }, () => {})
  await flush()
  assert.equal(status, 'connected')
  assert.deepEqual(first.map(u => u.id).sort(), ['a', 'b'])
  assert.deepEqual(second.map(u => u.id).sort(), ['a', 'b'])
  await two.update({ id: 'b', name: 'Bob', item: 'page-2' })
  assert.equal(first.find(u => u.id === 'b').item, 'page-2')
  await two.dispose()
  assert.deepEqual(first.map(u => u.id), ['a'])
  await one.dispose()
})

test('reconnection publishes the latest page and never leaks a previous project', async () => {
  const client = realtime(), a = client(), b = client()
  let first = [], isolated = [], status
  const one = connectProjectPresence(a, 'one', { id: 'a', item: null }, users => { first = users }, value => { status = value })
  const other = connectProjectPresence(b, 'two', { id: 'b' }, users => { isolated = users }, () => {})
  await flush()
  const ch = a.channels[0]
  ch.ready = false; ch.status('CHANNEL_ERROR')
  assert.equal(status, 'reconnecting'); assert.deepEqual(first, [])
  await one.update({ id: 'a', item: 'latest-page' })
  ch.ready = true; ch.status('SUBSCRIBED'); await flush()
  assert.equal(first[0].item, 'latest-page')
  assert.deepEqual(isolated.map(u => u.id), ['b'])
  await one.dispose(); await other.dispose()
})

test('quick remount waits for removal instead of reusing a closing channel', async () => {
  const client = realtime()(), statuses = []
  const old = connectProjectPresence(client, 'project', { id: 'a' }, () => {}, () => {})
  await flush()
  const leaving = old.dispose()
  const current = connectProjectPresence(client, 'project', { id: 'a' }, () => {}, value => statuses.push(value))
  await leaving; await flush()
  assert.equal(client.channels.length, 1)
  assert.equal(statuses.at(-1), 'connected')
  await current.dispose()
  const cancelled = connectProjectPresence(client, 'project', { id: 'a' }, () => {}, () => {})
  await cancelled.dispose()
  assert.equal(client.channels.length, 0)
})

test('a failed presence announcement is reported and can recover on refresh', async () => {
  const client = realtime()()
  let status
  const connection = connectProjectPresence(client, 'project', { id: 'a' }, () => {}, value => { status = value })
  await flush()
  const ch = client.channels[0], track = ch.track.bind(ch)
  ch.track = async () => 'timed out'
  await connection.update()
  assert.equal(status, 'reconnecting')
  ch.track = track
  await connection.update()
  assert.equal(status, 'connected')
  await connection.dispose()
})
