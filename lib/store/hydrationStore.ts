import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

// 处理Next.js SSR和客户端hydration状态同步
interface HydrationState {
  hydrated: boolean
  setHydrated: () => void
}

export const useHydrationStore = create<HydrationState>()(
  devtools(
    (set) => ({
      hydrated: false,
      setHydrated: () => set({ hydrated: true }),
    }),
    { name: 'hydration-store' }
  )
)
