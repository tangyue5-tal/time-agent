// 将 PCM 数据转换为 WAV 格式
export function pcmToWav(pcmData: Uint8Array, sampleRate: number = 24000): Blob {
  const numChannels = 1  // 单声道
  const bitsPerSample = 16
  const byteRate = sampleRate * numChannels * bitsPerSample / 8
  const blockAlign = numChannels * bitsPerSample / 8
  const dataSize = pcmData.length
  const fileSize = 36 + dataSize

  // WAV 文件头
  const header = new ArrayBuffer(44)
  const view = new DataView(header)

  // RIFF chunk descriptor
  view.setUint8(0, 'R'.charCodeAt(0))
  view.setUint8(1, 'I'.charCodeAt(0))
  view.setUint8(2, 'F'.charCodeAt(0))
  view.setUint8(3, 'F'.charCodeAt(0))
  view.setUint32(4, fileSize, true)
  view.setUint8(8, 'W'.charCodeAt(0))
  view.setUint8(9, 'A'.charCodeAt(0))
  view.setUint8(10, 'V'.charCodeAt(0))
  view.setUint8(11, 'E'.charCodeAt(0))

  // fmt sub-chunk
  view.setUint8(12, 'f'.charCodeAt(0))
  view.setUint8(13, 'm'.charCodeAt(0))
  view.setUint8(14, 't'.charCodeAt(0))
  view.setUint8(15, ' '.charCodeAt(0))
  view.setUint32(16, 16, true)  // Subchunk1Size
  view.setUint16(20, 1, true)    // AudioFormat (PCM)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, byteRate, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bitsPerSample, true)

  // data sub-chunk
  view.setUint8(36, 'd'.charCodeAt(0))
  view.setUint8(37, 'a'.charCodeAt(0))
  view.setUint8(38, 't'.charCodeAt(0))
  view.setUint8(39, 'a'.charCodeAt(0))
  view.setUint32(40, dataSize, true)

  // 合并头部和数据
  const wavBlob = new Blob([header, new Uint8Array(pcmData)], { type: 'audio/wav' })
  return wavBlob
}

// pcm base64 转 wav url
export function base64ToWavUrl(base64AudioData: string): string {
  const binaryString = atob(base64AudioData)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  const wavBlob = pcmToWav(bytes, 24000)
  const url = URL.createObjectURL(wavBlob)
  return url
}
