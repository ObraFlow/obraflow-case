import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { setActorHeader } from '../api/client'

// Simula a sessão: escolher "quem está atuando" substitui o login no desafio.
const KEY = 'obraflow.actor'

const read = () => {
  try {
    return Number(localStorage.getItem(KEY)) || null
  } catch {
    return null
  }
}

const ActorContext = createContext<{ actorId: number | null; setActorId: (id: number) => void }>({
  actorId: null,
  setActorId: () => {},
})

export function ActorProvider({ children }: { children: ReactNode }) {
  const [actorId, setActorId] = useState<number | null>(() => {
    const saved = read()
    setActorHeader(saved)
    return saved
  })

  useEffect(() => {
    setActorHeader(actorId)
    try {
      if (actorId) localStorage.setItem(KEY, String(actorId))
    } catch {
      /* sem storage: só não lembra na próxima visita */
    }
  }, [actorId])

  const change = (id: number) => {
    setActorHeader(id) // antes do re-render, para as próximas queries já irem com o header novo
    setActorId(id)
  }

  return <ActorContext.Provider value={{ actorId, setActorId: change }}>{children}</ActorContext.Provider>
}

export const useActor = () => useContext(ActorContext)
