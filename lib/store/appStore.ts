import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { mockTaskPlan } from '../mock'

// 定义状态接口
interface AppState {
  // 用户偏好设置
  preferences: {
    autoplay: boolean
    volume: number
  }
  updatePreferences: (preferences: Partial<AppState['preferences']>) => void

  // WebSocket相关状态
  isConnected: boolean
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error'
  error: string | null

  // WebSocket操作
  setConnected: (connected: boolean) => void
  setConnectionStatus: (status: AppState['connectionStatus']) => void
  setError: (error: string | null) => void
  taskPlan: typeof mockTaskPlan
  currentTaskPlan: any
  setTaskPlan: (taskPlan: any) => void
  setCurrentTaskPlan: (currentTaskPlan: any) => void
  
  // 星星数量
  starCount: number
  setStarCount: (count: number) => void
  addStars: (count: number) => void
  
  // 配置数据
  basicInfo: {
    baby_name: string
    grade: string
    xiguan: string
    chengji: string
    time_range: string
  } | null
  setBasicInfo: (info: AppState['basicInfo']) => void
  clearBasicInfo: () => void
}

// 聊天消息接口
export interface ChatMessage {
  id: string
  content: string
  sender: string
  timestamp: number
  type?: 'text' | 'audio' | 'system'
}

// 创建store
export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set, get) => ({
        // 用户偏好设置
        preferences: {
          autoplay: false,
          volume: 0.8,
        },
        updatePreferences: (newPreferences) =>
          set((state) => ({
            preferences: { ...state.preferences, ...newPreferences }
          })),

        // WebSocket状态初始化
        isConnected: false,
        connectionStatus: 'disconnected' as const,
        error: null,
        taskPlan: mockTaskPlan,
        currentTaskPlan: mockTaskPlan.phases[0],
        setTaskPlan: (taskPlan) => set({ taskPlan }),
        setCurrentTaskPlan: (currentTaskPlan) => set({ currentTaskPlan }),
        
        // 星星数量
        starCount: 0,
        setStarCount: (count) => set({ starCount: count }),
        addStars: (count) => set((state) => ({ starCount: state.starCount + count })),
        
        // 配置数据
        basicInfo: null,
        setBasicInfo: (info) => set({ basicInfo: info }),
        clearBasicInfo: () => set({ basicInfo: null }),

        // report 数据
        reportData: [],
        
        // WebSocket操作方法
        setConnected: (connected) => set({
          isConnected: connected,
          connectionStatus: connected ? 'connected' : 'disconnected'
        }),

        setConnectionStatus: (status) => set({ connectionStatus: status }),


        setError: (error) => set((state) => ({
          error,
          connectionStatus: error ? 'error' : state.connectionStatus
        })),

      }),
      {
        name: 'app-store', // localStorage key
        partialize: (state) => ({
          preferences: state.preferences,
          // 不持久化WebSocket状态，只持久化用户偏好
        }), // 只持久化这些状态
      }
    ),
    {
      name: 'app-store', // devtools名称
    }
  )
)

// 导出便捷的hooks
export const usePreferences = () => useAppStore((state) => state.preferences)

// WebSocket相关的便捷hooks
export const useWebSocketStatus = () => useAppStore((state) => ({
  isConnected: state.isConnected,
  connectionStatus: state.connectionStatus,
  error: state.error,
}))

export const useTaskPlan = () => useAppStore((state) => state.taskPlan)
export const useCurrentTaskPlan = () => useAppStore((state) => state.currentTaskPlan)