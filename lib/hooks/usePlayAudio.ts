import { useState, useRef, useEffect, useCallback } from 'react'
import { createTTSService, getDefaultTTSConfig } from '@/lib/services/tts'
import type { TTSService } from '@/lib/services/tts/types'

// 输入类型定义
export type AudioInput =
  | { type: 'text'; content: string }
  | { type: 'base64Audio'; content: string }
  | { type: 'mp3Url'; content: string }

// Hooks 返回值类型
export interface UseAudioPlayerReturn {
  isPlaying: boolean
  hasTTSService: boolean
  error: string
  play: (input: AudioInput) => Promise<void>
  getIsPlaying: () => boolean
  stop: () => void
  isInitialized: boolean
}

// 播放状态
export interface PlayState {
  isPlaying: boolean
  currentInput: AudioInput | null
  audioElement: HTMLAudioElement | null
  speechSynthesis: SpeechSynthesisUtterance | null
}

/**
 * 音频播放 hooks
 * 支持文本、base64音频、MP3 URL 等多种输入类型
 * 优先使用第三方TTS服务，否则使用浏览器语音合成
 */
export function usePlayAudio(): UseAudioPlayerReturn {
  const [isPlaying, setIsPlaying] = useState(false)
  const [hasTTSService, setHasTTSService] = useState(false)
  const [error, setError] = useState('')
  const [isInitialized, setIsInitialized] = useState(false)

  const ttsServiceRef = useRef<TTSService | null>(null)
  const isInitializedRef = useRef(false) // 用于在异步回调中获取实时状态
  const playStateRef = useRef<PlayState>({
    isPlaying: false,
    currentInput: null,
    audioElement: null,
    speechSynthesis: null,
  })

  // 初始化 TTS 服务
  useEffect(() => {
    let isMounted = true

    const initTTSService = async () => {
      try {
        const config = await getDefaultTTSConfig()
        if (config.hasConfig) {
          // 创建服务，但不需要传递真实的 apiKey（服务端会自动使用环境变量）
          ttsServiceRef.current = createTTSService({
            ...config,
            apiKey: 'server-side', // 占位符，服务端会使用环境变量
            apiSecret: 'server-side',
          })
          console.log()
          // if (isMounted) {
            setHasTTSService(true)
          // }
        } else {
          console.warn('未配置 TTS API 密钥，将使用浏览器默认语音')
          if (isMounted) {
            // setHasTTSService(false)
          }
        }
      } catch (error) {
        console.error('TTS 服务初始化失败:', error)
        if (isMounted) {
          // setHasTTSService(false)
        }
      } finally {
        console.log('TTS 服务初始化完成', isInitializedRef.current)
        if (isMounted) {
          setIsInitialized(true)
          isInitializedRef.current = true
        }
      }
    }

    initTTSService()

    return () => {
      isMounted = false
    }
  }, [])

  // 清理播放资源
  const cleanup = useCallback(() => {
    const state = playStateRef.current

    if (state.audioElement) {
      state.audioElement.pause()
      state.audioElement = null
    }

    if (state.speechSynthesis && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      state.speechSynthesis = null
    }

    state.currentInput = null
    state.isPlaying = false
    setIsPlaying(false)
  }, [])

  // 使用第三方 TTS 服务播放文本
  const playWithTTS = useCallback(async (text: string) => {
    if (!ttsServiceRef.current) {
      throw new Error('TTS 服务未初始化')
    }

    try {
      // 获取音频URL
      const audioUrl = await ttsServiceRef.current.getAudioUrl(text)

      // 创建音频元素并播放
      const audio = new Audio(audioUrl)
      playStateRef.current.audioElement = audio

      return new Promise<void>((resolve, reject) => {
        audio.onended = () => {
          cleanup()
          resolve()
        }

        audio.onerror = (error) => {
          console.error('音频播放错误:', error)
          cleanup()
          reject(new Error('音频播放失败'))
        }

        audio.play().catch(reject)
      })
    } catch (error) {
      console.error('TTS 合成失败:', error)
      throw error
    }
  }, [cleanup])

  // 使用浏览器语音合成播放文本
  const playWithBrowserSpeech = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) {
      throw new Error('浏览器不支持语音合成功能')
    }

    const synth = window.speechSynthesis
    const utterance = new SpeechSynthesisUtterance(text)

    // 设置语音参数
    utterance.rate = 1.0
    utterance.pitch = 1.2 // 较高音调
    utterance.volume = 1.0
    utterance.lang = 'zh-CN'

    playStateRef.current.speechSynthesis = utterance

    return new Promise<void>((resolve, reject) => {
      utterance.onstart = () => {
        setIsPlaying(true)
        playStateRef.current.isPlaying = true
      }

      utterance.onend = () => {
        cleanup()
        resolve()
      }

      utterance.onerror = (error) => {
        console.error('语音播放错误:', error)
        cleanup()
        reject(new Error('语音播放失败'))
      }

      synth.speak(utterance)
    })
  }, [cleanup])

  // 播放 base64 音频
  const playBase64Audio = useCallback(async (base64Data: string) => {
    try {
      // 将 base64 转换为 ArrayBuffer
      const binaryString = atob(base64Data)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }

      // 创建 blob URL
      const blob = new Blob([bytes], { type: 'audio/mpeg' })
      const audioUrl = URL.createObjectURL(blob)

      // 创建音频元素并播放
      const audio = new Audio(audioUrl)
      playStateRef.current.audioElement = audio

      return new Promise<void>((resolve, reject) => {
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl)
          cleanup()
          resolve()
        }

        audio.onerror = (error) => {
          console.error('base64 音频播放错误:', error)
          URL.revokeObjectURL(audioUrl)
          cleanup()
          reject(new Error('base64 音频播放失败'))
        }

        audio.play().catch(reject)
      })
    } catch (error) {
      console.error('base64 音频处理失败:', error)
      throw new Error('base64 音频格式无效')
    }
  }, [cleanup])

  // 播放 MP3 URL
  const playMp3Url = useCallback(async (url: string) => {
    try {
      const audio = new Audio(url)
      playStateRef.current.audioElement = audio

      return new Promise<void>((resolve, reject) => {
        audio.onended = () => {
          cleanup()
          resolve()
        }

        audio.onerror = (error) => {
          console.error('MP3 URL 播放错误:', error)
          cleanup()
          reject(new Error('MP3 URL 播放失败'))
        }

        audio.play().catch(reject)
      })
    } catch (error) {
      console.error('MP3 URL 处理失败:', error)
      throw new Error('MP3 URL 无效')
    }
  }, [cleanup])

  // 停止播放
  const stop = useCallback(() => {
    cleanup()
  }, [cleanup])

  // 主要的播放方法
  const play = useCallback(async (input: AudioInput) => {
    // 等待 TTS 服务初始化完成（最多等待 10 秒）
    // 使用 ref 获取实时状态，避免闭包问题
    if (!isInitializedRef.current) {
      const maxWaitTime = 10000
      const startTime = Date.now()
      while (!isInitializedRef.current && Date.now() - startTime < maxWaitTime) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      if (!isInitializedRef.current) {
        console.warn('TTS 服务初始化超时，将使用浏览器语音合成')
      }
    }

    // 如果正在播放，先停止
    if (isPlaying) {
      stop()
      await new Promise(resolve => setTimeout(resolve, 100)) // 短暂延迟确保清理完成
    }

    setError('')
    playStateRef.current.currentInput = input

    try {
      setIsPlaying(true)
      playStateRef.current.isPlaying = true

      switch (input.type) {
        case 'text':
          // 优先使用 TTS 服务
          console.log('hasTTSService', hasTTSService, ttsServiceRef.current)
          if (ttsServiceRef.current) {
            console.log('使用 TTS 服务播放文本', input.content)
            await playWithTTS(input.content)
          } else {
            console.log('使用浏览器语音合成播放文本', input.content)
            await playWithBrowserSpeech(input.content)
          }
          break

        case 'base64Audio':
          await playBase64Audio(input.content)
          break

        case 'mp3Url':
          await playMp3Url(input.content)
          break

        default:
          throw new Error('不支持的输入类型')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      setError(errorMessage)
      cleanup()
      throw error
    }
  }, [isInitialized, isPlaying, hasTTSService, playWithTTS, playWithBrowserSpeech, playBase64Audio, playMp3Url, cleanup, stop])
  // 实时的播放状态
  const getIsPlaying = useCallback(() => {
    return isPlaying
  }, [isPlaying])

  return {
    getIsPlaying,
    isPlaying,
    hasTTSService,
    error,
    play,
    stop,
    isInitialized,
  }
}
