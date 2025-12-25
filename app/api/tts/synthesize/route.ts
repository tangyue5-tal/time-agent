import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { text, provider = 'baidu', apiKey, secretKey, voice, speed, pitch, volume } = body

    if (!text) {
      return NextResponse.json({ error: '缺少 text 参数' }, { status: 400 })
    }

    // 百度 TTS 字符限制：免费版 1024 字符，付费版 2048 字符
    // 这里使用 1024 作为默认限制，如果用户是付费版可以调整
    const BAIDU_MAX_LENGTH = 1024
    if (text.length > BAIDU_MAX_LENGTH) {
      return NextResponse.json(
        { 
          error: `文本长度超过限制（${BAIDU_MAX_LENGTH} 字符），当前长度：${text.length}。请分段输入或缩短文本。`,
          errorCode: 'TEXT_TOO_LONG',
          maxLength: BAIDU_MAX_LENGTH,
          currentLength: text.length
        },
        { status: 400 }
      )
    }

    // 优先使用环境变量中的配置
    const finalProvider = provider || process.env.TTS_PROVIDER || 'baidu'
    const finalApiKey = apiKey || process.env.TTS_API_KEY
    const finalSecretKey = secretKey || process.env.TTS_API_SECRET
    const finalVoice = voice || process.env.TTS_VOICE || '4'

    if (finalProvider === 'baidu') {
      if (!finalApiKey || !finalSecretKey) {
        return NextResponse.json(
          { error: '百度 TTS 需要 apiKey 和 secretKey' },
          { status: 400 }
        )
      }

      // 1. 获取 token
      const tokenUrl = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${finalApiKey}&client_secret=${finalSecretKey}`
      const tokenResponse = await fetch(tokenUrl, { method: 'POST' })
      
      if (!tokenResponse.ok) {
        throw new Error('获取访问令牌失败')
      }

      const tokenData = await tokenResponse.json()
      if (tokenData.error) {
        throw new Error(tokenData.error_description || '获取 Token 失败')
      }

      const token = tokenData.access_token

      // 2. 合成语音
      const params = new URLSearchParams({
        tex: text,
        tok: token,
        cuid: 'time-agent',
        ctp: '1',
        lan: 'zh',
        spd: String(speed || 5),
        pit: String(pitch || 8), // 提高音调，模拟多啦A梦
        vol: String(volume || 5),
        per: String(finalVoice), // 度丫丫，音色较可爱
      })

      const ttsUrl = `https://tsn.baidu.com/text2audio?${params.toString()}`
      const ttsResponse = await fetch(ttsUrl, { method: 'POST' })

      if (!ttsResponse.ok) {
        throw new Error(`百度 TTS 请求失败: ${ttsResponse.statusText}`)
      }

      // 检查返回的是否是错误JSON
      const contentType = ttsResponse.headers.get('content-type')
      if (contentType?.includes('application/json')) {
        const error = await ttsResponse.json()
        // 处理百度 TTS 常见错误
        let errorMessage = error.err_msg || 'TTS 合成失败'
        let errorCode = error.err_no || 'UNKNOWN_ERROR'
        
        // 错误码映射
        const errorMessages: Record<string, string> = {
          '16': '文本长度超过限制（最多 1024 个字符），请缩短文本或分段输入',
          '17': '请求频率过快，请稍后再试',
          '18': '请求参数错误',
          '19': '服务端错误，请稍后重试',
          '100': '参数错误',
          '101': 'API Key 或 Secret Key 错误',
          '102': 'Token 无效或已过期',
        }
        
        if (errorMessages[error.err_no]) {
          errorMessage = errorMessages[error.err_no]
        }
        
        return NextResponse.json(
          { 
            error: errorMessage,
            errorCode: errorCode,
            errNo: error.err_no,
            errMsg: error.err_msg
          },
          { status: 400 }
        )
      }

      // 返回音频流
      const audioBuffer = await ttsResponse.arrayBuffer()
      return new NextResponse(audioBuffer, {
        headers: {
          'Content-Type': 'audio/mpeg',
        },
      })
    } else if (finalProvider === 'azure') {
      const finalRegion = process.env.TTS_REGION
      if (!finalApiKey || !finalRegion) {
        return NextResponse.json(
          { error: 'Azure TTS 需要 apiKey 和 region' },
          { status: 400 }
        )
      }

      const azureVoice = finalVoice || 'zh-CN-XiaoxiaoNeural'
      const url = `https://${finalRegion}.tts.speech.microsoft.com/cognitiveservices/v1`

      const ssml = `
        <speak version='1.0' xml:lang='zh-CN'>
          <voice xml:lang='zh-CN' name='${azureVoice}'>
            <prosody rate='1.0' pitch='+20%'>
              ${text}
            </prosody>
          </voice>
        </speak>
      `

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': finalApiKey,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
        },
        body: ssml,
      })

      if (!response.ok) {
        throw new Error(`Azure TTS 请求失败: ${response.statusText}`)
      }

      const audioBuffer = await response.arrayBuffer()
      return new NextResponse(audioBuffer, {
        headers: {
          'Content-Type': 'audio/mpeg',
        },
      })
    } else {
      return NextResponse.json(
        { error: `不支持的 TTS 服务提供商: ${finalProvider}` },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('TTS 合成失败:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'TTS 合成失败' },
      { status: 500 }
    )
  }
}

