// 百度语音合成 TTS 实现
import type { TTSService } from './types'

interface BaiduConfig {
  apiKey: string
  secretKey: string
  voice?: string // 0-女声, 1-男声, 3-情感合成-度逍遥, 4-情感合成-度丫丫
  speed?: number // 语速，0-15，默认5
  pitch?: number // 音调，0-15，默认5
  volume?: number // 音量，0-15，默认5
}

export class BaiduTTSService implements TTSService {
  private config: BaiduConfig
  private accessToken: string | null = null
  private tokenExpireTime: number = 0

  constructor(config: BaiduConfig) {
    this.config = config
  }

  // 获取访问令牌
  private async getAccessToken(): Promise<string> {
    const now = Date.now()
    // 如果 token 还有效，直接返回
    if (this.accessToken && now < this.tokenExpireTime) {
      return this.accessToken
    }

    const url = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${this.config.apiKey}&client_secret=${this.config.secretKey}`
    
    const response = await fetch(url, {
      method: 'POST',
    })

    if (!response.ok) {
      throw new Error('获取百度访问令牌失败')
    }

    const data = await response.json()
    if (!data.access_token) {
      throw new Error('获取访问令牌失败: 未返回 access_token')
    }
    
    const token = data.access_token as string
    this.accessToken = token
    this.tokenExpireTime = now + (data.expires_in - 300) * 1000 // 提前5分钟刷新

    return token
  }

  async synthesize(text: string): Promise<ArrayBuffer> {
    const token = await this.getAccessToken()
    const url = `https://tsn.baidu.com/text2audio`

    const params = new URLSearchParams({
      tex: text,
      tok: token || '',
      cuid: 'time-agent',
      ctp: '1',
      lan: 'zh',
      spd: String(this.config.speed || 5),
      pit: String(this.config.pitch || 8), // 提高音调，模拟多啦A梦
      vol: String(this.config.volume || 5),
      per: String(this.config.voice || 4), // 度丫丫，音色较可爱
    })

    const response = await fetch(`${url}?${params.toString()}`, {
      method: 'POST',
    })

    if (!response.ok) {
      throw new Error(`百度 TTS 请求失败: ${response.statusText}`)
    }

    // 检查返回的是否是错误JSON
    const contentType = response.headers.get('content-type')
    if (contentType?.includes('application/json')) {
      const error = await response.json()
      throw new Error(`百度 TTS 错误: ${error.err_msg || '未知错误'}`)
    }

    return await response.arrayBuffer()
  }

  async getAudioUrl(text: string): Promise<string> {
    const audioBuffer = await this.synthesize(text)
    const blob = new Blob([audioBuffer], { type: 'audio/mpeg' })
    return URL.createObjectURL(blob)
  }
}

