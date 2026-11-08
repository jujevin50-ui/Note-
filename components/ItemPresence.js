'use client'
import { createContext, useContext, useMemo } from 'react'
import './item-presence.css'

const ViewingContext = createContext({ byItem: new Map(), me: null })
const initials = name => (name || 'Membre').trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => Array.from(part)[0]).join('').toLocaleUpperCase('fr') || '?'
export function ItemPresenceProvider({ members, me, children }) {
  const value = useMemo(() => {
    const byItem = new Map()
    for (const member of members) {
      if (!member.item) continue
      if (!byItem.has(member.item)) byItem.set(member.item, new Map())
      byItem.get(member.item).set(member.id, member)
    }
    return { byItem, me }
  }, [members, me])
  return <ViewingContext.Provider value={value}>{children}</ViewingContext.Provider>
}
export default function ItemPresence({ itemId, compact = false }) {
  const { byItem, me } = useContext(ViewingContext)
  const viewers = [...(byItem.get(itemId)?.values() || [])].sort((a,b) => a.id.localeCompare(b.id))
  if (!viewers.length) return null
  const limit = compact ? 1 : 3
  const nameOf = member => (member.name || 'Membre') + (member.id === me ? ' (vous)' : '')
  const names = viewers.map(nameOf).join(', ')
  return <span className={'item-presence' + (compact ? ' compact' : '')} role="group" aria-label={'Consulté par ' + names} title={'Consulté par ' + names}>
    {viewers.slice(0, limit).map(member => <span key={member.id} className="item-viewer" style={{ '--viewer-color': member.color || '#7765b5' }} title={nameOf(member)}>{initials(member.name)}</span>)}
    {viewers.length > limit && <span className="item-viewer item-viewer-more">+{viewers.length - limit}</span>}
  </span>
}
