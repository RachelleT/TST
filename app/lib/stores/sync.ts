import { create } from 'zustand';

type SyncStatus = 'idle' | 'syncing' | 'error';

interface SyncState {
  status: SyncStatus;
  lastSyncedAt: string | null;
  errorMessage: string | null;
  setSyncing: () => void;
  setSuccess: () => void;
  setError: (message: string) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  status: 'idle',
  lastSyncedAt: null,
  errorMessage: null,
  setSyncing: () => set({ status: 'syncing', errorMessage: null }),
  setSuccess: () =>
    set({ status: 'idle', lastSyncedAt: new Date().toISOString(), errorMessage: null }),
  setError: (message) => set({ status: 'error', errorMessage: message }),
}));
