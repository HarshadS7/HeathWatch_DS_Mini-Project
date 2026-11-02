import { create } from 'zustand'

interface UiState {
  stationId: string
  setStation: (id: string) => void
  hoverStation: string | null
  setHover: (id: string | null) => void
  dsPanelOpen: boolean
  toggleDsPanel: () => void
}

export const useUi = create<UiState>((set) => ({
  stationId: 'DEL',
  setStation: (stationId) => set({ stationId }),
  hoverStation: null,
  setHover: (hoverStation) => set({ hoverStation }),
  dsPanelOpen: false,
  toggleDsPanel: () => set((s) => ({ dsPanelOpen: !s.dsPanelOpen })),
}))
