import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Player } from '@/types'

interface PlayerStoreState {
  players: Player[]
  isLoading: boolean
  error: string | null
  lastFetchAt: string | null

  fetchPlayers: () => Promise<void>
  addPlayer: (player: Omit<Player, 'id' | 'created_at' | 'updated_at'>) => Promise<Player>
  updatePlayer: (id: string, updates: Partial<Player>) => Promise<void>
  deletePlayer: (id: string) => Promise<void>
  getPlayerById: (id: string) => Player | undefined
  refreshPlayer: (id: string) => Promise<void>
}

export const usePlayerStore = create<PlayerStoreState>()(
  persist(
    (set, get) => ({
      players: [],
      isLoading: false,
      error: null,
      lastFetchAt: null,

      fetchPlayers: async () => {
        set({ isLoading: true, error: null })
        try {
          const response = await fetch('/api/players')
          if (!response.ok) throw new Error('Failed to fetch players')
          const data = await response.json()
          set({ players: data, lastFetchAt: new Date().toISOString() })
        } catch (err: any) {
          set({ error: err.message })
        } finally {
          set({ isLoading: false })
        }
      },

      addPlayer: async (player) => {
        set({ isLoading: true, error: null })
        try {
          const response = await fetch('/api/players', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(player),
          })
          if (!response.ok) throw new Error('Failed to add player')
          const newPlayer: Player = await response.json()
          set(state => ({ players: [...state.players, newPlayer] }))
          return newPlayer
        } catch (err: any) {
          set({ error: err.message })
          throw err
        } finally {
          set({ isLoading: false })
        }
      },

      updatePlayer: async (id, updates) => {
        try {
          const response = await fetch(`/api/players/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
          })
          if (!response.ok) throw new Error('Failed to update player')
          const updated: Player = await response.json()
          set(state => ({
            players: state.players.map(p => p.id === id ? updated : p),
          }))
        } catch (err: any) {
          set({ error: err.message })
          throw err
        }
      },

      deletePlayer: async (id) => {
        try {
          const response = await fetch(`/api/players/${id}`, { method: 'DELETE' })
          if (!response.ok) throw new Error('Failed to delete player')
          set(state => ({ players: state.players.filter(p => p.id !== id) }))
        } catch (err: any) {
          set({ error: err.message })
          throw err
        }
      },

      getPlayerById: (id) => {
        return get().players.find(p => p.id === id)
      },

      refreshPlayer: async (id) => {
        try {
          const response = await fetch(`/api/players/${id}`)
          if (!response.ok) return
          const updated: Player = await response.json()
          set(state => ({
            players: state.players.map(p => p.id === id ? updated : p),
          }))
        } catch {}
      },
    }),
    {
      name: 'gully-cricket-players',
      partialize: (state) => ({ players: state.players, lastFetchAt: state.lastFetchAt }),
    }
  )
)
