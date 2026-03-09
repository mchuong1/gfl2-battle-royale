import { create } from 'zustand';
import { Bot, createBots } from '../simulation/engine';

export type SimulationStatus = 'idle' | 'running' | 'paused' | 'finished';

interface SimulationState {
  bots: Bot[];
  botCount: number;
  status: SimulationStatus;
  winner: Bot | null;
  setBotCount: (count: number) => void;
  setBots: (bots: Bot[]) => void;
  setStatus: (status: SimulationStatus) => void;
  setWinner: (winner: Bot | null) => void;
  reset: () => void;
}

export const useSimulationStore = create<SimulationState>((set, get) => ({
  bots: [],
  botCount: 5,
  status: 'idle',
  winner: null,
  setBotCount: (count) => set({ botCount: count }),
  setBots: (bots) => set({ bots }),
  setStatus: (status) => set({ status }),
  setWinner: (winner) => set({ winner }),
  reset: () => {
    const { botCount } = get();
    set({
      bots: createBots(botCount),
      status: 'idle',
      winner: null,
    });
  },
}));
