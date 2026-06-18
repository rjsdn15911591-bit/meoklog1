import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Group } from '@/types';

interface GroupState {
  currentGroupId: string | null;
  groups: Group[];
  setCurrentGroupId: (id: string | null) => void;
  setGroups: (groups: Group[]) => void;
}

export const useGroupStore = create<GroupState>()(
  persist(
    (set) => ({
      currentGroupId: null,
      groups: [],
      setCurrentGroupId: (currentGroupId) => set({ currentGroupId }),
      setGroups: (groups) => set({ groups }),
    }),
    {
      name: 'group-storage',
      partialize: (state) => ({ currentGroupId: state.currentGroupId }),
    }
  )
);
