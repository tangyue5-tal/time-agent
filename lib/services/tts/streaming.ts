// 流式TTS服务接口
import type { TTSService } from './types'

export interface StreamingTTSService {
  /**
   * 合成文本为音频（流式，立即返回）
   * @param text 文本片段
   * @returns Promise<ArrayBuffer> 音频数据
   */
  synthesizeStream(text: string): Promise<ArrayBuffer>
  
  /**
   * 获取音频URL（流式）
   * @param text 文本片段
   * @returns Promise<string> 音频URL
   */
  getAudioUrlStream(text: string): Promise<string>
}

/**
 * 基于现有TTS服务实现的流式TTS服务
 * 每次调用都立即合成，不等待累积
 */
export class StreamingTTSServiceAdapter implements StreamingTTSService {
  private ttsService: TTSService

  constructor(ttsService: TTSService) {
    this.ttsService = ttsService
  }

  async synthesizeStream(text: string): Promise<ArrayBuffer> {
    // 直接调用现有的synthesize方法
    return await this.ttsService.synthesize(text)
  }

  async getAudioUrlStream(text: string): Promise<string> {
    // 直接调用现有的getAudioUrl方法
    return await this.ttsService.getAudioUrl(text)
  }
}


