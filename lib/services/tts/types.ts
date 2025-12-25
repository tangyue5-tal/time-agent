// TTS 服务接口定义
export interface TTSService {
  synthesize(text: string): Promise<ArrayBuffer>
  getAudioUrl(text: string): Promise<string>
}

export interface TTSConfig {
  provider: 'azure' | 'baidu' | 'xunfei' | 'aliyun' | 'local'
  apiKey?: string
  apiSecret?: string
  region?: string
  voice?: string
  language?: string
}

