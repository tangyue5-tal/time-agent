// TTS 服务工厂
import type { TTSConfig } from './types'
import { AzureTTSService } from './azure'
import { BaiduTTSService } from './baidu'
import { ServerTTSService } from './server'

export function createTTSService(config: TTSConfig) {
  // Next.js 中优先使用服务端代理（解决 CORS 问题）
  const useServer = true

  if (useServer) {
    switch (config.provider) {
      case 'baidu':
        if (!config.apiKey || !config.apiSecret) {
          throw new Error('百度 TTS 需要 apiKey 和 apiSecret 配置')
        }
        return new ServerTTSService({
          provider: 'baidu',
          apiKey: config.apiKey,
          secretKey: config.apiSecret,
          voice: '5976', // 度丫丫
          pitch: 8, // 提高音调，模拟多啦A梦
        })

      case 'azure':
        // Azure 也可以使用服务端代理
        if (!config.apiKey || !config.region) {
          throw new Error('Azure TTS 需要 apiKey 和 region 配置')
        }
        return new ServerTTSService({
          provider: 'azure',
          apiKey: config.apiKey,
          voice: config.voice,
        })

      default:
        throw new Error(`不支持的 TTS 服务提供商: ${config.provider}`)
    }
  }

  // 降级到直接调用（可能遇到 CORS 问题）
  switch (config.provider) {
    case 'azure':
      if (!config.apiKey || !config.region) {
        throw new Error('Azure TTS 需要 apiKey 和 region 配置')
      }
      return new AzureTTSService({
        apiKey: config.apiKey,
        region: config.region,
        voice: config.voice,
      })

    case 'baidu':
      if (!config.apiKey || !config.apiSecret) {
        throw new Error('百度 TTS 需要 apiKey 和 apiSecret 配置')
      }
      return new BaiduTTSService({
        apiKey: config.apiKey,
        secretKey: config.apiSecret,
        voice: config.voice,
        pitch: 8, // 提高音调，模拟多啦A梦
      })

    default:
      throw new Error(`不支持的 TTS 服务提供商: ${config.provider}`)
  }
}

// 默认配置（从环境变量读取，在客户端需要从 API 获取）
export async function getDefaultTTSConfig(): Promise<TTSConfig & { hasConfig?: boolean }> {
  // 在客户端，我们需要从 API 获取配置（不暴露密钥）
  try {
    const response = await fetch('/api/tts/config')
    if (response.ok) {
      const config = await response.json()
      // 返回配置，但 apiKey 和 secretKey 由服务端处理
      return {
        provider: config.provider || 'baidu',
        voice: config.voice || '4',
        hasConfig: config.hasConfig || false,
        // apiKey 和 secretKey 不需要在客户端，服务端 API 会自动使用环境变量
        apiKey: config.hasConfig ? 'server-side' : '', // 占位符，实际由服务端处理
        apiSecret: config.hasConfig ? 'server-side' : '',
      }
    }
  } catch (error) {
    console.warn('无法获取 TTS 配置:', error)
  }

  // 降级：返回空配置
  return {
    provider: 'baidu',
    apiKey: '',
    apiSecret: '',
    region: '',
    voice: '',
    hasConfig: false,
  }
}

