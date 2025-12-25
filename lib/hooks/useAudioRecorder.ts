import { useRef, useState, useCallback } from 'react';
import { Recorder } from '../classServices/recorder';

// 缓冲区大小
const BUFFER_SIZE = 100000

// VAD 配置
const SILENCE_THRESHOLD = 0.01      // 静音阈值（RMS值）
const SILENCE_DURATION = 3000       // 静音持续时间（毫秒）
const SPEECH_THRESHOLD = 0.1       // 语音阈值（高于此值认为有声音）

type UseAudioRecorderParams = {
  onAudioRecorded: (base64: string) => void;
  onSilence?: () => void;           // 静音1秒后回调
  onNonSilence?: () => void;        // 静音后首次讲话回调
};

export default function useAudioRecorder({ 
  onAudioRecorded,
  onSilence,
  onNonSilence 
}: UseAudioRecorderParams) {
  const audioRecorder = useRef<Recorder | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  // VAD 状态管理
  const silenceStartTimeRef = useRef<number | null>(null);
  const isSilentRef = useRef<boolean>(true);  // 初始状态为静音
  const lastVADCheckTimeRef = useRef<number>(0);
  const VAD_CHECK_INTERVAL = 100;  // VAD检测间隔（毫秒），避免过于频繁

  let buffer = new Uint8Array();

  const appendToBuffer = (newData: Uint8Array) => {
    const newBuffer = new Uint8Array(buffer.length + newData.length);
    newBuffer.set(buffer);
    newBuffer.set(newData, buffer.length);
    buffer = newBuffer;
  };

  // 计算音频能量（RMS - Root Mean Square）
  const calculateRMS = useCallback((audioData: Int16Array): number => {
    if (audioData.length === 0) return 0;
    
    let sum = 0;
    for (let i = 0; i < audioData.length; i++) {
      const normalized = audioData[i] / 32768.0;  // 归一化到 [-1, 1]
      sum += normalized * normalized;
    }
    return Math.sqrt(sum / audioData.length);
  }, []);

  const handleAudioData = (data: Iterable<number>) => {
    const uint8Array = new Uint8Array(data);
    const now = Date.now();

    // VAD 检测（限制检测频率）
    if (now - lastVADCheckTimeRef.current >= VAD_CHECK_INTERVAL) {
      lastVADCheckTimeRef.current = now;

      // 转换为 Int16Array 进行能量计算
      // 注意：数据是 Int16Array，但通过 Iterable<number> 传递，需要重新构造
      try {
        const int16Array = new Int16Array(
          uint8Array.buffer,
          uint8Array.byteOffset,
          uint8Array.length / 2
        );

        // 计算音频能量
        const rms = calculateRMS(int16Array);

        // VAD 检测逻辑
        if (rms < SILENCE_THRESHOLD) {
          // 检测到静音
          if (silenceStartTimeRef.current === null) {
            silenceStartTimeRef.current = now;
          } else {
            const silenceDuration = now - silenceStartTimeRef.current;
            if (silenceDuration >= SILENCE_DURATION && !isSilentRef.current) {
              // 静音超过1秒，且之前不是静音状态
              isSilentRef.current = true;
              console.log('检测到静音1秒，触发 onSilence 回调');
              onSilence?.();
            }
          }
        } else if (rms >= SPEECH_THRESHOLD) {
          // 检测到有声音（超过语音阈值）
          if (isSilentRef.current) {
            // 从静音状态转为有声音
            isSilentRef.current = false;
            console.log('检测到用户开始讲话，触发 onNonSilence 回调');
            onNonSilence?.();
          }
          silenceStartTimeRef.current = null;  // 重置静音计时
        }
      } catch (error) {
        // 如果数据长度不足，忽略VAD检测
        console.warn('VAD检测失败，数据可能不完整:', error);
      }
    }

    // 原有的音频数据处理逻辑
    appendToBuffer(uint8Array);

    if (buffer.length >= BUFFER_SIZE) {
      const toSend = new Uint8Array(buffer.slice(0, BUFFER_SIZE));
      buffer = new Uint8Array(buffer.slice(BUFFER_SIZE));

      const regularArray = String.fromCharCode(...toSend);
      const base64 = btoa(regularArray);

      onAudioRecorded(base64);
    }
  };

  const start = async () => {
    try {
    if (!audioRecorder.current) {
      audioRecorder.current = new Recorder(handleAudioData);
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    await audioRecorder.current.start(stream);
    setMediaRecorder(audioRecorder.current.mediaRecorder);
    } catch (error) {
      console.error('Failed to start audio recorder:', error);
      throw error;
    }
  };

  const stop = async () => {
    await audioRecorder.current?.stop();
    setMediaRecorder(null);
  };

  return { start, stop, mediaRecorder };
}
