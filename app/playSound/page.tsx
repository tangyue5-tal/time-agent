'use client'

import { useState } from 'react'
import './playSound.scss'
import { usePlayAudio } from '@/lib/hooks/usePlayAudio'
import { useAppStore } from '@/lib/store'
import { pcmToWav, base64ToWavUrl } from '@/lib/utils/pcmToWav'
import { pcmData } from '@/lib/mock/pcm'

export default function PlaySound() {
  const [text, setText] = useState('')
  const { isPlaying, hasTTSService, error, play, stop, isInitialized } = usePlayAudio()

  const handlePlay = async () => {
    if (!text.trim()) {
      alert('请输入要播放的文本')
      return
    }
    // 如果正在播放，则停止
    if (isPlaying) {
      stop()
      return
    }

    try {
      // 使用 hooks 的 play 方法，传入文本输入
      // await play({ type: 'text', content: text })
      // const wavData = pcmToWav(pcmData)
      console.log('pcmData', pcmData)
      const base64WavUrl = base64ToWavUrl(pcmData)
      // console.log('wavData', wavData)
      play({ type: 'mp3Url', content: base64WavUrl })
    } catch (error) {
      // 错误已经在 hooks 中处理，这里不需要额外处理
      console.error('播放失败:', error)
    }
  }

  const handleStop = () => {
    stop()
  }

  return (
    <div className="play-sound-container">
      <h1>多啦A梦语音播放</h1>
      <div className="input-section">
        <label htmlFor="text-input">输入要播放的文本：</label>
        <textarea
          id="text-input"
          className="text-input"
          value={text}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setText(e.target.value)}
          placeholder="请输入要播放的文本..."
          rows={6}
          disabled={isPlaying}
        />
      </div>

      <div className="button-section">
        <button
          className="play-button"
          onClick={handlePlay}
          disabled={!text.trim()}
        >
          {isPlaying ? '播放中...' : '开始播放'}
        </button>
        
        {isPlaying && (
          <button
            className="stop-button"
            onClick={handleStop}
          >
            停止播放
          </button>
        )}
      </div>

      <div className="tips">
        <p>💡 提示：</p>
        <ul>
          <li>支持中文文本、Base64音频、MP3 URL播放</li>
          <li>
            {hasTTSService ? (
              <>使用第三方 TTS 服务，音色更真实（多啦A梦风格）</>
            ) : (
              <>使用浏览器默认语音（请在 .env 文件中配置 TTS API 密钥以使用更真实的音色）</>
            )}
          </li>
          <li>配置 TTS 服务：复制 .env.example 为 .env 并填入 API 密钥</li>
          <li>支持的 TTS 服务：百度、Azure、讯飞、阿里云</li>
          {error && <li style={{ color: 'red' }}>错误：{error}</li>}
        </ul>
      </div>
    </div>
  )
}

