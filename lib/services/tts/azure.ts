// Azure Cognitive Services TTS 实现
import type { TTSService } from './types'

interface AzureConfig {
  apiKey: string
  region: string
  voice?: string // 例如: zh-CN-XiaoxiaoNeural (女声), zh-CN-YunxiNeural (男声)
}

export class AzureTTSService implements TTSService {
  private config: AzureConfig

  constructor(config: AzureConfig) {
    this.config = config
  }

  async synthesize(text: string): Promise<ArrayBuffer> {
    const voice = this.config.voice || 'zh-CN-XiaoxiaoNeural'
    const url = `https://${this.config.region}.tts.speech.microsoft.com/cognitiveservices/v1`

    const ssml = `
      <speak version='1.0' xml:lang='zh-CN'>
        <voice xml:lang='zh-CN' name='${voice}'>
          <prosody rate='1.0' pitch='+20%'>
            ${text}
          </prosody>
        </voice>
      </speak>
    `

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': this.config.apiKey,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
      },
      body: ssml,
    })

    if (!response.ok) {
      throw new Error(`Azure TTS 请求失败: ${response.statusText}`)
    }

    return await response.arrayBuffer()
  }

  async getAudioUrl(text: string): Promise<string> {
    const audioBuffer = await this.synthesize(text)
    const blob = new Blob([audioBuffer], { type: 'audio/mpeg' })
    return URL.createObjectURL(blob)
  }
}

