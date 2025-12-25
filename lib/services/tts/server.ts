// 通过服务端代理调用 TTS 服务
import type { TTSService } from './types'

interface ServerTTSConfig {
  serverUrl?: string // 服务端地址，默认使用 Next.js API Routes
  provider?: 'baidu' | 'azure' | 'xunfei' | 'aliyun'
  apiKey: string
  secretKey?: string
  voice?: string
  speed?: number
  pitch?: number
  volume?: number
}

export class ServerTTSService implements TTSService {
  private config: ServerTTSConfig
  private serverUrl: string

  constructor(config: ServerTTSConfig) {
    this.config = config
    // Next.js API Routes 默认路径
    this.serverUrl = config.serverUrl || '/api/tts'
  }

  async synthesize(text: string): Promise<ArrayBuffer> {
    // 如果 apiKey 是 'server-side'，则不传递（服务端会使用环境变量）
    const body: any = {
      text,
      provider: this.config.provider || 'baidu',
      voice: this.config.voice,
      speed: this.config.speed,
      pitch: this.config.pitch,
      volume: this.config.volume,
    }
    
    // 只有在不是 'server-side' 占位符时才传递密钥
    if (this.config.apiKey && this.config.apiKey !== 'server-side') {
      body.apiKey = this.config.apiKey
    }
    if (this.config.secretKey && this.config.secretKey !== 'server-side') {
      body.secretKey = this.config.secretKey
    }

    const response = await fetch(`${this.serverUrl}/synthesize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }))
      throw new Error(error.error || `TTS 请求失败: ${response.statusText}`)
    }

    return await response.arrayBuffer()
  }

  async getAudioUrl(text: string): Promise<string> {
    const audioBuffer = await this.synthesize(text)
    const blob = new Blob([audioBuffer], { type: 'audio/mpeg' })
    return URL.createObjectURL(blob)
  }
}

