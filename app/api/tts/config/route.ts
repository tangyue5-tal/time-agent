import { NextResponse } from 'next/server'

export async function GET() {
  // 返回 TTS 配置（不包含敏感信息）
  // 客户端只需要知道 provider 和 voice，实际 API 调用通过服务端完成
  const provider = process.env.TTS_PROVIDER || 'baidu'
  const hasConfig = !!(process.env.TTS_API_KEY && (
    provider === 'baidu' ? process.env.TTS_API_SECRET : true
  ))

  return NextResponse.json({
    provider,
    voice: process.env.TTS_VOICE || '4',
    hasConfig, // 指示是否配置了 API 密钥
    // 不返回 apiKey 和 secretKey，这些在服务端使用
  })
}

