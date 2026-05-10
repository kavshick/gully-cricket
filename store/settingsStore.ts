import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { MatchRules, TeamBalance, MatchSetupState } from '@/types'

const DEFAULT_RULES: MatchRules = {
  roof_catch_enabled: false,
  caught_behind_enabled: false,
  one_tip_one_hand_enabled: true,
  bounce_rule_enabled: true,
  direct_six_out_enabled: false,
  free_hit_enabled: true,
  powerplay_enabled: false,
  max_overs: 6,
  max_players: 6,
  ball_type: 'tennis',
  ground_type: 'street',
  retirement_mode: 'returnable',
  retirement_score_limit: 30,
}

interface SettingsStoreState {
  defaultRules: MatchRules
  theme: 'dark' | 'light' | 'system'
  soundEnabled: boolean

  updateDefaultRules: (rules: Partial<MatchRules>) => void
  setTheme: (theme: 'dark' | 'light' | 'system') => void
  toggleSound: () => void
}

export const useSettingsStore = create<SettingsStoreState>()(
  persist(
    (set) => ({
      defaultRules: DEFAULT_RULES,
      theme: 'dark',
      soundEnabled: true,

      updateDefaultRules: (rules) =>
        set(state => ({ defaultRules: { ...state.defaultRules, ...rules } })),

      setTheme: (theme) => set({ theme }),

      toggleSound: () => set(state => ({ soundEnabled: !state.soundEnabled })),
    }),
    { name: 'gully-cricket-settings' }
  )
)

// ============================================================
// MATCH SETUP STORE (ephemeral — not persisted)
// ============================================================
interface MatchSetupStoreState extends MatchSetupState {
  setTeamBalance: (balance: TeamBalance) => void
  updateRules: (rules: Partial<MatchRules>) => void
  setSelectedPlayers: (ids: string[]) => void
  setCommonPlayer: (id?: string) => void
  reset: () => void
}

export const useMatchSetupStore = create<MatchSetupStoreState>()((set, get) => ({
  team_balance: null,
  rules: DEFAULT_RULES,
  selected_players: [],
  common_player_id: undefined,

  setTeamBalance: (balance) => set({ team_balance: balance }),
  updateRules: (rules) =>
    set(state => ({ rules: { ...state.rules, ...rules } })),
  setSelectedPlayers: (ids) => set({ selected_players: ids }),
  setCommonPlayer: (id) => set({ common_player_id: id }),
  reset: () => set({
    team_balance: null,
    rules: DEFAULT_RULES,
    selected_players: [],
    common_player_id: undefined,
  }),
}))
