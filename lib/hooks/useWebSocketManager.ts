import useWebSocket from 'react-use-websocket'
import { useCallback, useEffect } from 'react'
import { useAppStore } from '@/lib/store/appStore'
import type { ChatMessage } from '@/lib/store/appStore'

interface UseWebSocketManagerOptions {
  url: string
  enabled?: boolean
  onAudioData?: (audioData: string) => void  // 收到音频数据时回调
  onTaskPlan?: (taskPlan: string) => void  // 收到任务计划时回调
  onPlanConfirm?: (planConfirm: string) => void  // 收到计划确认时回调
}

export function useWebSocketManager({
  url,
  enabled = true,
  onAudioData,
  onTaskPlan,
  onPlanConfirm
}: UseWebSocketManagerOptions) {
  const {
    setConnected,
    setConnectionStatus,
    setTaskPlan,
    setCurrentTaskPlan,
    setError,
  } = useAppStore()

  const { sendMessage, lastMessage, readyState, getWebSocket } = useWebSocket(
    enabled ? url : null,
    {
      onOpen: () => {
        console.log('WebSocket connected to:', url)
        setConnected(true)
        setConnectionStatus('connected')
        setError(null)
      },

      onClose: () => {
        console.log('WebSocket disconnected from:', url)
        setConnected(false)
        setConnectionStatus('disconnected')
      },

      onMessage: (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data)
          // 处理不同类型的消息
          console.log('data----->', data)
          handleIncomingMessage(data)
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
          setError('消息格式错误')
        }
      },

      onError: (error: Event) => {
        console.error('WebSocket error:', error)
        setConnectionStatus('error')
        setError('连接错误')
      },

      // 自动重连配置
      shouldReconnect: (closeEvent: CloseEvent) => {
        // 避免在开发环境中无限重连
        return process.env.NODE_ENV === 'production' || closeEvent.code !== 1000
      },
      reconnectAttempts: 10,
      reconnectInterval: (attemptNumber: number) =>
        Math.min(1000 * 2 ** attemptNumber, 30000), // 指数退避，最多30秒
    },
    enabled
  )

  // 处理接收到的消息
  const handleIncomingMessage = useCallback((data: any) => {
    // 处理服务器推送的音频事件
    if (data.type === 'tts_text_push') {
      // 收到传递音频数据事件，调用音频播放器播放
      console.log('Received tts_text_push', data)
      if (onAudioData && data.data.text) {
        onAudioData(data.data.text)
      }
    }

    if (data.type === 'task_plan') {
      // 收到任务计划事件，设置任务计划
      console.log('Received task plan event')
      if (onTaskPlan) {
        setCurrentTaskPlan(data.data)
        setTaskPlan(data.data)
        onTaskPlan(data.data)
      }
    }
    if (data.type === 'plan_confirm') {
      // 收到计划确认事件，调用计划确认回调
      console.log('Received plan confirm event')
      if (onPlanConfirm) {
        onPlanConfirm(data.data)
      }
    }


    // 可以在这里添加更多消息类型的处理逻辑
    switch (data.type) {
      case 'audio':
        // 处理音频消息
        // console.log('Received audio message:', message)
        break
      case 'system':
        // 处理系统消息
        // console.log('Received system message:', message)
        break
      default:
        // console.log('Received chat message:', message)
    }
  }, [setTaskPlan, onAudioData, onTaskPlan, onPlanConfirm])

  // 发送音频数据
  const sendAudioData = useCallback((base64AudioData: string) => {
    try {
      const audioUploadMessage = {
          type: "audio_chunk_upload",
          sessionId: "sess_123456",
          timestamp: Date.now(),
          sequence: 16,
          priority: 0,
          data: {
            audioId: "audio_456",        // 音频片段唯一ID（同audio_text_upload的audioId）
            chunkSeq: 3,                 // 分片序号（从0开始）
            totalChunks: 8,             // 该音频的总分片数
            audioFormat: "pcm",         // 音频编码格式（pcm/opus/mp3）
            audioBitrate: 16000,         // 比特率（16kbps）
            chunk_data: base64AudioData  // 音频分片数据（二进制帧可直接传，JSON用base64）
          }
        }
      console.log('audioUploadMessage----->', audioUploadMessage)
      // 对于二进制数据，可以直接发送Blob
      sendMessage(JSON.stringify(audioUploadMessage))
    } catch (error) {
      console.error('Failed to send audio data:', error)
      setError('发送音频失败')
    }
  }, [sendMessage, setError])

  // 发送用户停止说话消息（静音1秒后）
  const sendUserSpeechEnd = useCallback((data: any) => {
    const message = {
      type: 'audio_end',
      sessionId: 'current_session', // 可以从store获取实际sessionId
      timestamp: Date.now(),
      sequence: 1,                    // 重连后重置序号，服务端识别
      priority: 1,
      data: {
        ...data,
      }
    }
    try {
      sendMessage(JSON.stringify(message))
      console.log('发送用户停止说话消息:', message)
    } catch (error) {
      console.error('Failed to send user_speech_end:', error)
      setError('发送用户停止说话消息失败')
    }
  }, [sendMessage, setError])

  // 发送用户开始说话消息（静音后首次讲话）
  const sendUserSpeechStart = useCallback(() => {
    const message = {
      type: 'audio_start',
      sessionId: 'current_session', // 可以从store获取实际sessionId
      timestamp: Date.now(),
      sequence: 1,                    // 重连后重置序号，服务端识别
      priority: 1,
      data: {
        lastPlanId: '',       // 最后处理的规划ID
        lastPhaseId: '',     // 最后执行的阶段ID
      }
    }
    try {
      sendMessage(JSON.stringify(message))
      console.log('发送用户开始说话消息:', message)
    } catch (error) {
      console.error('Failed to send user_speech_start:', error)
      setError('发送用户开始说话消息失败')
    }
  }, [sendMessage, setError])

  // 发送基础信息配置
  const sendBasicInfo = useCallback((basicInfo: {
    baby_name: string
    grade: string
    xiguan: string
    chengji: string
    time_range: string
  }) => {
    const message = {
      type: 'up_basic_info',
      sessionId: 'sess_123456',
      timestamp: Date.now(),
      sequence: 1,
      priority: 1,
      data: basicInfo
    }
    try {
      sendMessage(JSON.stringify(message))
      console.log('发送基础信息配置:', message)
    } catch (error) {
      console.error('Failed to send basic info:', error)
      setError('发送基础信息配置失败')
    }
  }, [sendMessage, setError])

  // 手动重连
  const reconnect = useCallback(() => {
    const ws = getWebSocket()
    if (ws && ws.readyState === WebSocket.CLOSED) {
      setConnectionStatus('connecting')
      // WebSocket会自动重连
    }
  }, [getWebSocket, setConnectionStatus])

  // 获取连接状态
  const connectionStatus = readyState === WebSocket.CONNECTING ? 'connecting' :
                          readyState === WebSocket.OPEN ? 'connected' :
                          readyState === WebSocket.CLOSING ? 'connecting' :
                          'disconnected'

  // 更新store中的连接状态
  useEffect(() => {
    setConnectionStatus(connectionStatus as any)
  }, [connectionStatus, setConnectionStatus])

  return {
    // 状态
    isConnected: readyState === WebSocket.OPEN,
    connectionStatus,
    lastMessage,
    readyState,

    // 方法
    sendAudioData,
    sendUserSpeechEnd,
    sendUserSpeechStart,
    sendBasicInfo,
    reconnect,

    // WebSocket实例（高级用法）
    webSocket: getWebSocket(),
  }
}
