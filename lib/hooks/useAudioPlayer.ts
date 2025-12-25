import { useRef, useState } from 'react';
import { Player } from '../classServices/player';

const SAMPLE_RATE = 24000; // 采样率

export default function useAudioPlayer() {
  const audioPlayer = useRef<Player>(null); // 音频播放器
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null); // 媒体录制器

  const reset = async () => {
    audioPlayer.current = new Player(); // 创建音频播放器
    await audioPlayer.current.init(SAMPLE_RATE); // 初始化音频播放器  
    setMediaRecorder(audioPlayer.current.mediaRecorder); // 设置媒体录制器
  };

  const play = (base64Audio: string) => {
    const binary = atob(base64Audio); // base64 转二进制  
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const pcmData = new Int16Array(bytes.buffer); // 转换为 PCM 数据

    audioPlayer.current?.play(pcmData); // 播放 PCM 数据
  };

  const stop = () => {
    audioPlayer.current?.stop(); // 停止音频播放
  };

  const clear = () => {
    stop(); // 停止音频播放
    audioPlayer.current = null;

    if (mediaRecorder) mediaRecorder.stop(); // 停止媒体录制器
    setMediaRecorder(null); // 设置媒体录制器为 null
  };

  return { reset, play, stop, clear, mediaRecorder }; // 返回音频播放器
}
