/**
 * 报告数据存储工具
 * 用于管理学习时间、提问次数、休息时间等统计数据
 */

const STORAGE_KEY = 'time-agent-report-data'

export interface ReportData {
  studyTime: number // 学习时间（秒）
  restTime: number // 休息时间（秒）
  questionCount: number // 提问次数
  lastUpdateTime: number // 最后更新时间
}

/**
 * 获取报告数据
 */
export function getReportData(): ReportData {
  if (typeof window === 'undefined') {
    return {
      studyTime: 0,
      restTime: 0,
      questionCount: 0,
      lastUpdateTime: Date.now(),
    }
  }

  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (data) {
      return JSON.parse(data)
    }
  } catch (error) {
    console.error('Failed to get report data from localStorage:', error)
  }

  return {
    studyTime: 0,
    restTime: 0,
    questionCount: 0,
    lastUpdateTime: Date.now(),
  }
}

/**
 * 保存报告数据
 */
export function saveReportData(data: Partial<ReportData>): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    const currentData = getReportData()
    const newData: ReportData = {
      ...currentData,
      ...data,
      lastUpdateTime: Date.now(),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newData))
  } catch (error) {
    console.error('Failed to save report data to localStorage:', error)
  }
}

/**
 * 增加学习时间（秒）
 */
export function addStudyTime(seconds: number): void {
  const currentData = getReportData()
  saveReportData({
    studyTime: currentData.studyTime + seconds,
  })
}

/**
 * 增加休息时间（秒）
 */
export function addRestTime(seconds: number): void {
  const currentData = getReportData()
  saveReportData({
    restTime: currentData.restTime + seconds,
  })
}

/**
 * 增加提问次数
 */
export function addQuestionCount(count: number = 1): void {
  const currentData = getReportData()
  saveReportData({
    questionCount: currentData.questionCount + count,
  })
}

/**
 * 重置报告数据
 */
export function resetReportData(): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.error('Failed to reset report data:', error)
  }
}

/**
 * 格式化时间为分钟显示，不足1分钟时显示秒
 */
export function formatTimeToMinutes(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}秒`
  }
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (remainingSeconds > 0) {
    return `${minutes}分钟${remainingSeconds}秒`
  }
  return `${minutes}分钟`
}

/**
 * 格式化时间为小时和分钟显示
 */
export function formatTimeToHoursAndMinutes(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  
  if (hours > 0) {
    return `${hours}小时${minutes}分钟`
  }
  return `${minutes}分钟`
}
