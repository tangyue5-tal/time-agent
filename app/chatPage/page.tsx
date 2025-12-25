'use client'
import { useState, useEffect, useRef } from 'react'
import { usePlayAudio } from '@/lib/hooks/usePlayAudio'
import useAudioRecorder from '@/lib/hooks/useAudioRecorder'
import { useWebSocketManager } from '@/lib/hooks/useWebSocketManager'
import { useStreamingTTS } from '@/lib/hooks/useStreamingTTS'
import { usePhaseTask } from '@/lib/hooks/usePhaseTask'
import { useAppStore } from '@/lib/store'
import { mockTaskPlan } from '@/lib/mock/index'
import Image from 'next/image'
import styles from './chatPage.module.scss'
import chatBg from '../assets/images/chat-bg.png'
import personImg from '../assets/images/person.png'
import playingImg from '../assets/images/playing.png'
import arrowImg from '../assets/images/arrow.png'
import starImg from '../assets/images/star.png'
import treasureBoxImg from '../assets/images/treasure-box.png'
import boxOpenImg from '../assets/images/box-open.png'
import { voiceover } from '@/lib/utils/voiceover'
import { addStudyTime, addRestTime, addQuestionCount } from '@/lib/utils/reportStorage'

export default function ChatPage() {
  const [isSessionActive, setIsSessionActive] = useState(false)
  const [textContentnew, setTextContent] = useState('')
  const playAudio = usePlayAudio()
  const [messageContent, setMessageContent] = useState(voiceover.welcomeText)
  const [isBoxOpened, setIsBoxOpened] = useState(false)
  const [isSilence, setIsSilence] = useState(true)
  
  // 流式TTS播放（用于接收WebSocket文本片段）
  const streamingTTS = useStreamingTTS({
    enabled: isSessionActive,
    interruptOnRecording: true, // 检测到新录音时自动打断
  })

  // 获取 store 方法
  const { setTaskPlan, starCount, addStars, basicInfo, clearBasicInfo, taskPlan } = useAppStore()
  
  // 使用 ref 保存 showReward 方法引用，避免闭包问题
  const showRewardRef = useRef<(() => void) | null>(null)
  // 使用 ref 跟踪配置是否已发送，确保只发送一次
  const hasSentConfigRef = useRef(false)
  // 音频录制器
  const audioRecorder = useAudioRecorder({
    onAudioRecorded: (base64AudioData: string) => {
      // 将录制的音频数据发送到WebSocket
      // 使用 getIsPlaying() 获取实时状态，而不是 isPlaying state（可能有延迟）
      const isCurrentlyPlaying = streamingTTS.getIsPlaying()
      console.log('实时播放状态:', isCurrentlyPlaying, 'state状态:', isSilence)
      if(!isCurrentlyPlaying) {
        sendAudioData(base64AudioData)
      }
    },
    // 监听到静音1秒后，发送用户停止说话消息
    onSilence: () => {
      // 使用 getCurrentPhase() 和 getRemainingTime() 获取实时的值，避免闭包问题
      const currentPhase = phaseTask.getCurrentPhase()
      const remainingTime = phaseTask.getRemainingTime()
      console.log('检测到静音1秒，发送用户停止说话消息', currentPhase, remainingTime)
      setIsSilence(true)
      sendUserSpeechEnd({
        name: currentPhase?.name,
        duration: currentPhase?.duration,
        type: currentPhase?.type,
        desc: currentPhase?.desc,
        remainingTime: remainingTime,
      })
      // 记录提问次数
      addQuestionCount(1)
    },
    // 监听到静音后首次讲话，发送用户开始说话消息，并打断TTS播放
    onNonSilence: () => {
      console.log('检测到用户开始讲话，发送用户开始说话消息，打断TTS播放')
      sendUserSpeechStart()
      setIsSilence(false)
      // 打断流式TTS播放（清空队列和文本）
      streamingTTS.interrupt()
    },
  })
  // 阶段任务管理
  const phaseTask = usePhaseTask({
    phases: taskPlan?.phases || [],
    onPhaseStart: async (phase, index) => {
      // 阶段开始：播放 startText
      setMessageContent(phase.startText)
      streamingTTS.interrupt()
      setTimeout(async () => {
        await playAudio.play({ type: 'text', content: phase.startText })
      }, 2000)
    },
    onPhaseEnd: async (phase, index) => {
      // 阶段结束：播放 endText，然后显示奖励
      setMessageContent(phase.endText)
      streamingTTS.interrupt()
      await playAudio.play({ type: 'text', content: phase.endText })
      
      // 记录阶段时间到localStorage
      // type === 1 是学习时间，type === 2 是休息时间
      if (phase.type === 1) {
        addStudyTime(phase.duration)
      } else if (phase.type === 2) {
        addRestTime(phase.duration)
      }
      
      // 等待播放完成后显示奖励页面
      setTimeout(() => {
        if (showRewardRef.current) {
          showRewardRef.current()
        }
        setIsBoxOpened(false)
      }, 1000)
    },
    onPhaseComplete: (phase, index) => {
      // 阶段完成（点击宝箱后）：增加星星
      const isLastPhase = index === mockTaskPlan.phases.length - 1
      addStars(isLastPhase ? 5 : 1)
    },
    onAllPhasesComplete: async () => {
      // 所有阶段完成
      await audioRecorder.stop();
      console.log('所有阶段任务完成！')
    },
  })
  
  // 保存 showReward 方法引用
  useEffect(() => {
    showRewardRef.current = phaseTask.showReward
  }, [phaseTask.showReward])

  // WebSocket管理（页面加载时即连接，用于发送配置数据）
  const { 
    sendAudioData, 
    sendUserSpeechEnd, 
    sendUserSpeechStart,
    sendBasicInfo,
    isConnected 
  } = useWebSocketManager({
    url: process.env.NEXT_PUBLIC_WS_URL || '', // 替换为你的WebSocket服务器地址
    enabled: !!process.env.NEXT_PUBLIC_WS_URL, // 页面加载时即连接
    onAudioData: async (textContent: string) => {
      // 接收到模型文本数据，使用流式TTS播放
      // 拼接文本
      // if (textContentnew) return;
      setTextContent(prev => prev + textContent)
      console.log('playAudio.getIsPlaying()', playAudio.getIsPlaying(),textContentnew)
      if (!playAudio.getIsPlaying()) {
        streamingTTS.addText(textContent)
      }
      // streamingTTS.interrupt();
      
    },
    onTaskPlan: async (taskPlan: any) => {
      if (phaseTask.getIsStarted()) return
      console.log('onTaskPlan12345', taskPlan)
      taskPlan.phases.forEach((phase: any) => {
        phase.duration = 10
      })
      setTaskPlan(taskPlan)
      const phasesText = taskPlan?.phases
        ?.map((phase: any) => {
          // duration 是秒数，转换为分钟，不足1分钟时显示秒
          const minutes = Math.floor(phase.duration / 60)
          const seconds = phase.duration % 60
          let timeText = ''
          if (minutes > 0) {
            timeText = seconds > 0 ? `${minutes}分钟${seconds}秒` : `${minutes}分钟`
          } else {
            timeText = `${seconds}秒`
          }
          return `${phase.name}：${timeText}`
        })
        .join('\n')
        const playPhasesText = taskPlan?.phases
        ?.map((phase: any, index: number) => {
          // duration 是秒数，转换为分钟，不足1分钟时显示秒
          const minutes = Math.floor(phase.duration / 60)
          const seconds = phase.duration % 60
          let timeText = ''
          if (minutes > 0) {
            timeText = seconds > 0 ? `${minutes}分钟${seconds}秒` : `${minutes}分钟`
          } else {
            timeText = `${seconds}秒`
          }
          
          // 口语化表达：添加序号和自然语序
          const phaseIndex = index + 1
          const phaseNames = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十']
          const indexText = phaseIndex <= 10 ? `第${phaseNames[phaseIndex - 1]}个任务` : `第${phaseIndex}个任务`
          
          // 更口语化的表达："第一个任务，学习任务，需要2秒"
          return `${indexText}，${phase.name}，需要${timeText}`
        })
        .join('。') + '。'
      
      // 3. 调用 setMessageContent 设置消息内容
      setMessageContent(phasesText)
      streamingTTS.interrupt()
      console.log('4567890', phasesText)
      // play 方法内部会自动等待 TTS 服务初始化完成
      setTimeout(async () => {
      await playAudio.play({ type: 'text', content: playPhasesText })
      await playAudio.play({ type: 'text', content: '请问需要调整吗？' })
      }, 2000)
      // 2. 提取 phases 数组中的 desc 和 duration，拼接成指定格式
    },
    onPlanConfirm: async (planConfirm: any) => {
      // console.log('onPlanConfirm12345', planConfirm)
      // const phasesText = taskPlan?.phases
      //   ?.map((phase: any) => {
      //     // duration 是秒数，转换为分钟，不足1分钟时显示秒
      //     const minutes = Math.floor(phase.duration / 60)
      //     const seconds = phase.duration % 60
      //     let timeText = ''
      //     if (minutes > 0) {
      //       timeText = seconds > 0 ? `${minutes}分钟${seconds}秒` : `${minutes}分钟`
      //     } else {
      //       timeText = `${seconds}秒`
      //     }
      //     return `${phase.desc}：${timeText}`
      //   })
      //   .join('\n')
      
      // // 3. 调用 setMessageContent 设置消息内容
      // setMessageContent(phasesText)
      // streamingTTS.interrupt()
      // console.log('4567890', phasesText)
      // await playAudio.play({ type: 'text', content: phasesText })
      if (!phaseTask.getIsStarted()) {
        phaseTask.startPhase(0)
      }
    }
  })

  // 当WebSocket连接建立且有配置数据时，发送配置数据（只执行一次）
  useEffect(() => {
    if (isConnected && basicInfo && !hasSentConfigRef.current) {
      hasSentConfigRef.current = true
      const sendConfig = async () => {
        setIsSessionActive(true)
        streamingTTS.interrupt()
        setTimeout(async () => {
          streamingTTS.interrupt()
          await playAudio.play({ type: 'text', content: messageContent })
          sendBasicInfo(basicInfo)
          await audioRecorder.start()
        }, 1000)
        // 发送后清除配置数据，避免重复发送
        clearBasicInfo()
      }
      sendConfig()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, basicInfo])


  // 开始会话
  const handleStartSession = async () => {
    try {
      // await playAudio.play({ type: 'text', content: '开始会话' })
      setIsSessionActive(true)
      await audioRecorder.start()
    } catch (error) {
      console.error('Failed to start session:', error)
    }
  }

  // 结束会话
  const handleEndSession = async () => {
    try {
      await audioRecorder.stop()
      await playAudio.stop()
      streamingTTS.stop() // 停止流式TTS播放
      setIsSessionActive(false)
    } catch (error) {
      console.error('Failed to end session:', error)
    }
  }
  // 点击宝箱
  const handleTreasureBoxClick = () => {
    if (!isBoxOpened) {
      setIsBoxOpened(true)
      // 点击后完成奖励，触发下一阶段
      setTimeout(() => {
        phaseTask.completeReward()
      }, 500)
    }
  }

  const handleClick = () => {
    console.log(textContentnew)
  }

  // 计算总时长（用于进度条）
  const totalDuration = mockTaskPlan.phases.reduce((sum, phase) => sum + phase.duration, 0)
  
  // 计算已完成阶段的时长
  const completedDuration = phaseTask.currentPhaseIndex >= 0
    ? mockTaskPlan.phases
        .slice(0, phaseTask.currentPhaseIndex)
        .reduce((sum, phase) => sum + phase.duration, 0) +
      (phaseTask.currentPhase ? phaseTask.currentPhase.duration - phaseTask.remainingTime : 0)
    : 0

  return (
    <div className={styles.chatPage} onClick={handleClick}>
      {/* 背景图 */}
      <Image
        src={chatBg}
        alt="背景"
        fill
        className={styles.background}
        priority
        style={{ objectFit: 'cover' }}
      />
      
      {/* 左上角星星 */}
      {phaseTask.currentPhaseIndex >= 0 && (
        <div className={styles.starContainer}>
          <span className={styles.starCount}>{starCount}</span>
          <Image
            src={starImg}
            alt="星星"
            width={35}
            height={35}
            className={styles.star}
          />
        </div>
      )}
      
      {/* 顶部进度条 */}
      {phaseTask.currentPhaseIndex >= 0 && (
        <div className={styles.progressBarContainer}>
          {mockTaskPlan.phases.map((phase, index) => {
            const isActive = index === phaseTask.currentPhaseIndex
            const isCompleted = index < phaseTask.currentPhaseIndex
            const phaseProgress = isActive ? phaseTask.progress : isCompleted ? 1 : 0
            
            return (
              <div
                key={phase.id}
                className={styles.progressBarItem}
                style={{
                  flex: phase.duration / totalDuration,
                }}
              >
                <div
                  className={`${styles.progressBar} ${
                    isActive ? styles.active : isCompleted ? styles.completed : ''
                  }`}
                  style={{
                    width: `${phaseProgress * 100}%`,
                  }}
                />
              </div>
            )
          })}
        </div>
      )}
      
      {/* 消息展示区域 */}
      {!phaseTask.isRewardPhase && (
        <div className={styles.messageContainer}>
          <div className={styles.messageBubble}>
            <p className={styles.messageText}>{messageContent}</p>
          </div>
          {(
            <div className={styles.messageArrow}>
              <Image
                src={arrowImg}
                alt="箭头"
                width={24}
                height={24}
                className={styles.arrowImage}
              />
            </div>
          )}
        </div>
      )}
      
      {/* 内容区域 */}
      <div className={styles.content}>
        {/* 奖励阶段：显示宝箱 */}
        {phaseTask.isRewardPhase ? (
          <div className={styles.rewardContainer}>
            <button
              className={styles.treasureBoxButton}
              onClick={handleTreasureBoxClick}
              disabled={isBoxOpened}
            >
              <Image
                src={isBoxOpened ? boxOpenImg : treasureBoxImg}
                alt={isBoxOpened ? '打开的宝箱' : '宝箱'}
                width={200}
                height={200}
                className={styles.treasureBox}
                priority
              />
            </button>
          </div>
        ) : (
          /* 正常阶段：显示小人 */
          <Image
            src={personImg}
            alt="时间代理人"
            width={200}
            height={200}
            className={styles.personImage}
            priority
          />
        )}
      </div>
      
      {/* 底部按钮区域 */}
      {!phaseTask.isRewardPhase && (
        <div className={styles.buttonContainer}>
          {/* 播放按钮 */}
          <button 
            className={styles.playButton}
            onClick={handleStartSession}
            disabled={isSessionActive}
          >
            <Image
              src={playingImg}
              alt="开始"
              width={120}
              height={120}
              priority
            />
          </button>
          
          {/* 箭头指示 */}
          {!isSessionActive && (
            <div className={styles.arrowContainer}>
              <Image
                src={arrowImg}
                alt="向下箭头"
                width={24}
                height={24}
                className={styles.arrowImage}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
