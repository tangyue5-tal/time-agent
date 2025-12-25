import { useState, useRef, useCallback, useEffect } from 'react'
import { createTTSService, getDefaultTTSConfig } from '@/lib/services/tts'
import { StreamingTTSServiceAdapter } from '@/lib/services/tts/streaming'
import type { StreamingTTSService } from '@/lib/services/tts/streaming'
import type { TTSService } from '@/lib/services/tts/types'

export interface UseStreamingTTSOptions {
  /**
   * 是否启用流式TTS（默认true）
   */
  enabled?: boolean
  
  /**
   * 是否在检测到新录音时自动打断播放（默认true）
   */
  interruptOnRecording?: boolean
}

export interface UseStreamingTTSReturn {
  /**
   * 是否正在播放（React state，可能有延迟）
   */
  isPlaying: boolean
  
  /**
   * 获取实时播放状态（基于 ref，立即返回最新值）
   */
  getIsPlaying: () => boolean
  
  /**
   * 队列中待播放的音频数量
   */
  queueLength: number
  
  /**
   * 错误信息
   */
  error: string | null
  
  /**
   * 是否已初始化
   */
  isInitialized: boolean
  
  /**
   * 添加文本片段到播放队列（立即合成并加入队列）
   */
  addText: (text: string) => Promise<void>
  
  /**
   * 停止播放并清空队列
   */
  stop: () => void
  
  /**
   * 清空文本缓冲区和音频队列
   */
  clear: () => void
  
  /**
   * 打断当前播放（用于检测到新录音时）
   */
  interrupt: () => void
}

// 音频队列项
interface AudioQueueItem {
  audio: HTMLAudioElement
  url: string
  id: string
}

/**
 * 流式TTS播放Hook
 * 功能：
 * 1. 接收文本片段，立即合成并加入播放队列
 * 2. 队列顺序播放，不中断
 * 3. 支持打断机制（清空队列和文本）
 * 4. 检测到新录音时自动打断
 */
export function useStreamingTTS(
  options: UseStreamingTTSOptions = {}
): UseStreamingTTSReturn {
  const { enabled = true, interruptOnRecording = true } = options

  const [isPlaying, setIsPlaying] = useState(false)
  const [queueLength, setQueueLength] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // TTS服务引用
  const streamingTTSServiceRef = useRef<StreamingTTSService | null>(null)
  const ttsServiceRef = useRef<TTSService | null>(null)

  // 音频队列
  const audioQueueRef = useRef<AudioQueueItem[]>([])
  const currentAudioRef = useRef<HTMLAudioElement | null>(null)
  const isPlayingRef = useRef(false)
  const isInterruptedRef = useRef(false)
  const consecutiveErrorsRef = useRef(0) // 连续错误计数
  const MAX_CONSECUTIVE_ERRORS = 5 // 最大连续错误次数
  const isPlayingNextRef = useRef(false) // 防止并发调用playNext

  // 初始化TTS服务
  useEffect(() => {
    if (!enabled) {
      setIsInitialized(true)
      return
    }

    let isMounted = true

    const initTTSService = async () => {
      try {
        const config = await getDefaultTTSConfig()
        if (config.hasConfig) {
          // 创建TTS服务
          ttsServiceRef.current = createTTSService({
            ...config,
            apiKey: 'server-side',
            apiSecret: 'server-side',
          })
          
          // 创建流式TTS适配器
          streamingTTSServiceRef.current = new StreamingTTSServiceAdapter(
            ttsServiceRef.current
          )

          if (isMounted) {
            setIsInitialized(true)
          }
        } else {
          console.warn('未配置 TTS API 密钥，流式TTS将不可用')
          if (isMounted) {
            setIsInitialized(true)
          }
        }
      } catch (error) {
        console.error('流式TTS服务初始化失败:', error)
        if (isMounted) {
          setError('TTS服务初始化失败')
          setIsInitialized(true)
        }
      }
    }

    initTTSService()

    return () => {
      isMounted = false
    }
  }, [enabled])

  // 清理音频资源
  const cleanupAudio = useCallback((item: AudioQueueItem) => {
    try {
      if (item.audio) {
        item.audio.pause()
        item.audio.src = ''
        item.audio.load()
      }
      if (item.url) {
        URL.revokeObjectURL(item.url)
      }
    } catch (error) {
      console.warn('清理音频资源失败:', error)
    }
  }, [])

  // 播放队列中的下一个音频
  const playNext = useCallback(async () => {
    // 防止并发调用
    if (isPlayingNextRef.current) {
      return
    }

    // 如果被中断，清空队列
    if (isInterruptedRef.current) {
      isPlayingNextRef.current = true
      // 清空队列中的所有音频
      while (audioQueueRef.current.length > 0) {
        const item = audioQueueRef.current.shift()
        if (item) {
          cleanupAudio(item)
        }
      }
      setQueueLength(0)
      isInterruptedRef.current = false
      isPlayingRef.current = false
      setIsPlaying(false)
      currentAudioRef.current = null
      consecutiveErrorsRef.current = 0 // 重置错误计数
      isPlayingNextRef.current = false
      return
    }

    // 如果队列为空，停止播放
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false
      setIsPlaying(false)
      currentAudioRef.current = null
      consecutiveErrorsRef.current = 0 // 重置错误计数
      return
    }

    // 检查连续错误次数
    // if (consecutiveErrorsRef.current >= MAX_CONSECUTIVE_ERRORS) {
      // console.error(`连续错误次数超过限制(${MAX_CONSECUTIVE_ERRORS})，停止播放`)
      // setError(`连续播放错误过多，已停止播放`)
      // // 清空队列
      // while (audioQueueRef.current.length > 0) {
      //   const item = audioQueueRef.current.shift()
      //   if (item) {
      //     cleanupAudio(item)
      //   }
      // }
      // setQueueLength(0)
      // isPlayingRef.current = false
      // setIsPlaying(false)
      // currentAudioRef.current = null
      // consecutiveErrorsRef.current = 0
      // return
    // }

    isPlayingNextRef.current = true

    // 取出队列中的第一个音频
    const item = audioQueueRef.current.shift()
    if (!item) {
      isPlayingNextRef.current = false
      // 使用 setTimeout 避免同步递归
      setTimeout(() => {
        playNext()
      }, 0)
      return
    }

    setQueueLength(audioQueueRef.current.length)
    isPlayingRef.current = true
    setIsPlaying(true)
    currentAudioRef.current = item.audio

    try {
      // 播放音频
      await item.audio.play()
      console.log('item.audio.play')
      
      // 播放成功，重置错误计数
      consecutiveErrorsRef.current = 0

      // 监听播放结束
      item.audio.onended = () => {
        cleanupAudio(item)
        currentAudioRef.current = null
        isPlayingNextRef.current = false
        // 使用 setTimeout 避免同步递归
        setTimeout(() => {
          playNext()
        }, 0)
      }

      // 监听播放错误
      item.audio.onerror = (error) => {
        // console.error('音频播放错误:', error, item.id)
        consecutiveErrorsRef.current++
        cleanupAudio(item)
        currentAudioRef.current = null
        isPlayingNextRef.current = false
        // 使用 setTimeout 避免同步递归，并添加延迟避免快速循环
        setTimeout(() => {
          // playNext()
        }, 100)
      }
    } catch (error) {
      console.error('播放音频失败:', error, item.id)
      consecutiveErrorsRef.current++
      cleanupAudio(item)
      currentAudioRef.current = null
      isPlayingNextRef.current = false
      // 使用 setTimeout 避免同步递归，并添加延迟避免快速循环
      setTimeout(() => {
        playNext()
      }, 100)
    }
  }, [cleanupAudio])

  // 添加文本片段到播放队列
  const addText = useCallback(
    async (text: string) => {
      if (!enabled || !streamingTTSServiceRef.current || !text.trim()) {
        return
      }

      try {
        setError(null)

        // 立即合成音频
        const audioUrl = await streamingTTSServiceRef.current.getAudioUrlStream(text)

        // 验证音频URL
        if (!audioUrl || typeof audioUrl !== 'string') {
          throw new Error('音频URL无效')
        }
       

        // 创建音频元素
        const audio = new Audio(audioUrl)
        
        // 等待音频加载完成，只有成功加载才加入队列
        try {
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              cleanupListeners()
              reject(new Error('音频加载超时'))
            }, 5000) // 5秒超时

            const cleanupListeners = () => {
              clearTimeout(timeout)
              audio.removeEventListener('loadedmetadata', onLoadedMetadata)
              audio.removeEventListener('error', onError)
            }

            const onLoadedMetadata = () => {
              cleanupListeners()
              resolve()
            }

            const onError = (e: Event) => {
              cleanupListeners()
              // 输出详细错误信息
              const errorInfo: any = {
                audioUrl: audioUrl.substring(0, 100),
                text: text.substring(0, 50),
                networkState: audio.networkState,
                readyState: audio.readyState,
              }

              if (audio.error) {
                const errorCode = audio.error.code
                const errorMessage = audio.error.message
                const errorCodeMap: Record<number, string> = {
                  1: 'MEDIA_ERR_ABORTED - 用户中止',
                  2: 'MEDIA_ERR_NETWORK - 网络错误',
                  3: 'MEDIA_ERR_DECODE - 解码错误（音频格式不支持或数据损坏）',
                  4: 'MEDIA_ERR_SRC_NOT_SUPPORTED - 音频源不支持',
                }
                
                errorInfo.error = {
                  code: errorCode,
                  message: errorMessage,
                  description: errorCodeMap[errorCode] || '未知错误',
                }
              }

              console.error('音频元素创建时出错:', e, errorInfo)
              reject(new Error(`音频加载失败: ${audio.error?.message || '未知错误'}`))
            }

            audio.addEventListener('loadedmetadata', onLoadedMetadata)
            audio.addEventListener('error', onError)
            
            // 开始加载
            audio.preload = 'metadata'
          })

          // 音频加载成功，加入队列
          const queueItem: AudioQueueItem = {
            audio,
            url: audioUrl,
            id: `audio-${Date.now()}-${Math.random()}`,
          }

          audioQueueRef.current.push(queueItem)
          setQueueLength(audioQueueRef.current.length)

          // 如果当前没有播放，开始播放
          if (!isPlayingRef.current && !isPlayingNextRef.current) {
            playNext()
          }
        } catch (loadError) {
          // 音频加载失败，清理资源
          console.error('音频加载失败，不加入队列:', loadError)
          audio.pause()
          audio.src = ''
          audio.load()
          URL.revokeObjectURL(audioUrl)
          // 不抛出错误，只是跳过这个音频
        }
      } catch (error) {
        // console.error('流式TTS合成失败:', error)
        const errorMessage =
          error instanceof Error ? error.message : 'TTS合成失败'
        setError(errorMessage)
        // 合成失败不计入播放错误计数
      }
    },
    [enabled, playNext]
  )

  // 停止播放并清空队列
  const stop = useCallback(() => {
    // 停止当前播放的音频
    if (currentAudioRef.current) {
      currentAudioRef.current.pause()
      currentAudioRef.current = null
    }

    // 清空队列
    while (audioQueueRef.current.length > 0) {
      const item = audioQueueRef.current.shift()
      if (item) {
        cleanupAudio(item)
      }
    }

    isPlayingRef.current = false
    setIsPlaying(false)
    setQueueLength(0)
    isInterruptedRef.current = false
    consecutiveErrorsRef.current = 0 // 重置错误计数
    isPlayingNextRef.current = false // 重置播放状态
  }, [cleanupAudio])

  // 清空文本缓冲区和音频队列
  const clear = useCallback(() => {
    stop()
  }, [stop])

  // 打断当前播放（用于检测到新录音时）
  const interrupt = useCallback(() => {
    console.log('流式TTS被打断，清空队列')
    isInterruptedRef.current = true
    
    // 停止当前播放
    if (currentAudioRef.current) {
      currentAudioRef.current.pause()
      currentAudioRef.current = null
    }

    // 清空队列
    while (audioQueueRef.current.length > 0) {
      const item = audioQueueRef.current.shift()
      if (item) {
        cleanupAudio(item)
      }
    }

    isPlayingRef.current = false
    setIsPlaying(false)
    setQueueLength(0)
    consecutiveErrorsRef.current = 0 // 重置错误计数
    isPlayingNextRef.current = false // 重置播放状态
  }, [cleanupAudio])

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      stop()
    }
  }, [stop])

  // 获取实时播放状态的函数（基于 ref，立即返回最新值）
  const getIsPlaying = useCallback(() => {
    return isPlayingRef.current
  }, [])

  return {
    isPlaying,
    getIsPlaying,
    queueLength,
    error,
    isInitialized,
    addText,
    stop,
    clear,
    interrupt,
  }
}

