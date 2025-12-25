import { useState, useRef, useCallback, useEffect } from 'react'

export interface PhaseTask {
  desc: string
  duration: number // 秒数
  endText: string
  id: string
  name: string
  startText: string
  type: number // 1 是专注 2 休息
}

export interface UsePhaseTaskOptions {
  phases: PhaseTask[]
  onPhaseStart?: (phase: PhaseTask, index: number) => void
  onPhaseEnd?: (phase: PhaseTask, index: number) => void
  onPhaseComplete?: (phase: PhaseTask, index: number) => void
  onAllPhasesComplete?: () => void
}

export interface UsePhaseTaskReturn {
  currentPhaseIndex: number
  currentPhase: PhaseTask | null
  isPhaseActive: boolean
  isRewardPhase: boolean // 是否在奖励阶段
  remainingTime: number // 剩余时间（秒）
  progress: number // 当前阶段进度 0-1
  getIsStarted: () => boolean // 是否已开始
  getCurrentPhase: () => PhaseTask | null // 获取实时的当前阶段
  getRemainingTime: () => number // 获取实时的剩余时间
  startPhase: (index: number) => void
  pausePhase: () => void
  resumePhase: () => void
  completeReward: () => void // 完成奖励（点击宝箱后）
  showReward: () => void // 显示奖励页面
}

/**
 * 阶段任务管理 Hook
 */
export function usePhaseTask(
  options: UsePhaseTaskOptions
): UsePhaseTaskReturn {
  const { phases, onPhaseStart, onPhaseEnd, onPhaseComplete, onAllPhasesComplete } = options

  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(-1)
  const [isPhaseActive, setIsPhaseActive] = useState(false)
  const [isRewardPhase, setIsRewardPhase] = useState(false)
  const [remainingTime, setRemainingTime] = useState(0)
  const [progress, setProgress] = useState(0)

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(0)
  const pausedTimeRef = useRef<number>(0)
  const isStartedRef = useRef<boolean>(false)
  const currentPhaseIndexRef = useRef<number>(-1)
  const remainingTimeRef = useRef<number>(0)

  const currentPhase = currentPhaseIndex >= 0 && currentPhaseIndex < phases.length
    ? phases[currentPhaseIndex]
    : null

  // 清理定时器
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])
  // 设置是否已开始
  const setIsStarted = useCallback((isStarted: boolean) => {
    isStartedRef.current = isStarted
  }, [])

  // 开始阶段
  const startPhase = useCallback((index: number) => {
    if (index < 0 || index >= phases.length) {
      return
    }
    setIsStarted(true)
    clearTimer()
    
    const phase = phases[index]
    setCurrentPhaseIndex(index)
    currentPhaseIndexRef.current = index // 更新 ref
    setIsPhaseActive(true)
    setIsRewardPhase(false)
    setRemainingTime(phase.duration)
    remainingTimeRef.current = phase.duration // 更新 ref
    setProgress(0)
    startTimeRef.current = Date.now()
    pausedTimeRef.current = 0

    // 触发阶段开始回调
    onPhaseStart?.(phase, index)

    // 开始倒计时
    timerRef.current = setInterval(() => {
      setRemainingTime((prev) => {
        if (prev <= 1) {
          // 阶段结束
          clearTimer()
          setIsPhaseActive(false)
          setRemainingTime(0)
          remainingTimeRef.current = 0 // 更新 ref
          setProgress(1)
          
          // 触发阶段结束回调
          onPhaseEnd?.(phase, index)
          
          return 0
        }
        
        const newRemaining = prev - 1
        remainingTimeRef.current = newRemaining // 更新 ref
        const elapsed = phase.duration - newRemaining
        const newProgress = elapsed / phase.duration
        setProgress(newProgress)
        
        return newRemaining
      })
    }, 1000)
  }, [phases, onPhaseStart, onPhaseEnd, clearTimer])

  // 暂停阶段
  const pausePhase = useCallback(() => {
    if (timerRef.current) {
      clearTimer()
      pausedTimeRef.current = remainingTimeRef.current
      setIsPhaseActive(false)
    }
  }, [clearTimer])

  // 恢复阶段
  const resumePhase = useCallback(() => {
    if (pausedTimeRef.current > 0 && currentPhase) {
      setRemainingTime(pausedTimeRef.current)
      remainingTimeRef.current = pausedTimeRef.current // 更新 ref
      setIsPhaseActive(true)
      
      timerRef.current = setInterval(() => {
        setRemainingTime((prev) => {
          if (prev <= 1) {
            clearTimer()
            setIsPhaseActive(false)
            setRemainingTime(0)
            remainingTimeRef.current = 0 // 更新 ref
            setProgress(1)
            onPhaseEnd?.(currentPhase, currentPhaseIndex)
            return 0
          }
          
          const newRemaining = prev - 1
          remainingTimeRef.current = newRemaining // 更新 ref
          const elapsed = currentPhase.duration - newRemaining
          const newProgress = elapsed / currentPhase.duration
          setProgress(newProgress)
          
          return newRemaining
        })
      }, 1000)
    }
  }, [currentPhase, currentPhaseIndex, onPhaseEnd, clearTimer])

  // 显示奖励页面
  const showReward = useCallback(() => {
    setIsRewardPhase(true)
  }, [])

  // 完成奖励（点击宝箱后）
  const completeReward = useCallback(() => {
    setIsRewardPhase(false)
    
    if (currentPhaseIndex >= 0) {
      // 触发阶段完成回调
      onPhaseComplete?.(phases[currentPhaseIndex], currentPhaseIndex)
      
      // 如果是最后一个阶段，触发全部完成回调
      if (currentPhaseIndex === phases.length - 1) {
        onAllPhasesComplete?.()
      } else {
        // 2秒后开始下一阶段
        setTimeout(() => {
          startPhase(currentPhaseIndex + 1)
        }, 2000)
      }
    }
  }, [currentPhaseIndex, phases, onPhaseComplete, onAllPhasesComplete, startPhase])

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      clearTimer()
    }
  }, [clearTimer])
  const getIsStarted = useCallback(() => {
    return isStartedRef.current
  }, [])

  // 获取实时的当前阶段（避免闭包问题）
  const getCurrentPhase = useCallback(() => {
    const index = currentPhaseIndexRef.current
    if (index >= 0 && index < phases.length) {
      return phases[index]
    }
    return null
  }, [phases])

  // 获取实时的剩余时间（避免闭包问题）
  const getRemainingTime = useCallback(() => {
    return remainingTimeRef.current
  }, [])

  // 同步 ref 和 state
  useEffect(() => {
    currentPhaseIndexRef.current = currentPhaseIndex
  }, [currentPhaseIndex])

  useEffect(() => {
    remainingTimeRef.current = remainingTime
  }, [remainingTime])

  return {
    getIsStarted,
    getCurrentPhase,
    getRemainingTime,
    currentPhaseIndex,
    currentPhase,
    isPhaseActive,
    isRewardPhase,
    remainingTime,
    progress,
    startPhase,
    pausePhase,
    resumePhase,
    completeReward,
    showReward,
  }
}

