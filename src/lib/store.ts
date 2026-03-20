import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AppStore {
  projectId: string | null;
  setProjectId: (id: string) => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      projectId: null,
      setProjectId: (id) => set({ projectId: id }),
    }),
    { name: "homi-store" }
  )
);
