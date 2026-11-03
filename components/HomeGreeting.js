'use client'
import { useEffect, useState } from 'react'
import './home-greeting.css'

export default function HomeGreeting({ name }) {
  const [greeting, setGreeting] = useState('Bonjour')
  useEffect(() => {
    const update = () => {
      const hour = Number(new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', hourCycle: 'h23', timeZone: 'Europe/Paris' }).formatToParts(new Date()).find(part => part.type === 'hour').value)
      setGreeting(hour >= 18 || hour < 6 ? 'Bonsoir' : 'Bonjour')
    }
    update()
    const timer = setInterval(update, 60000)
    return () => clearInterval(timer)
  }, [])
  return <div className="home-greeting"><h1>{greeting} {name}.</h1></div>
}
