'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { getReportData, formatTimeToMinutes } from '@/lib/utils/reportStorage'
import styles from './report.module.scss'
import parentBg from '../assets/images/parent-bg.png'
import reportImage from '../assets/images/report-image.png'
import threeTitle from '../assets/images/three-title.png'

export default function ReportPage() {
  const [reportData, setReportData] = useState({
    studyTime: 0,
    restTime: 0,
    questionCount: 0,
  })

  useEffect(() => {
    // 从localStorage读取数据
    const data = getReportData()
    setReportData({
      studyTime: data.studyTime,
      restTime: data.restTime,
      questionCount: data.questionCount,
    })
  }, [])

  return (
    <div className={styles.reportPage}>
      {/* 背景图 */}
      <Image
        src={parentBg}
        alt="背景"
        fill
        className={styles.background}
        priority
        style={{ objectFit: 'cover' }}
      />
      
      {/* 内容区域 */}
      <div className={styles.content}>
        {/* 标题图片 */}
        <div className={styles.titleContainer}>
          <Image
            src={threeTitle}
            alt="主理人情报"
            width={200}
            height={60}
            className={styles.titleImage}
            priority
          />
        </div>
        
        {/* 中间图片 */}
        <div className={styles.imageContainer}>
          <Image
            src={reportImage}
            alt="报告图片"
            width={300}
            height={300}
            className={styles.reportImage}
            priority
          />
        </div>

        {/* 数据展示区域 */}
        <div className={styles.dataContainer}>
          {/* 学习时间 */}
          <div className={styles.dataItem}>
            <div className={styles.dataLabel}>学习时间</div>
            <div className={styles.dataValue}>
              {formatTimeToMinutes(reportData.studyTime)}
            </div>
          </div>

          {/* 提问次数 */}
          <div className={styles.dataItem}>
            <div className={styles.dataLabel}>提问次数</div>
            <div className={styles.dataValue}>
              {reportData.questionCount}次
            </div>
          </div>

          {/* 休息时间 */}
          <div className={styles.dataItem}>
            <div className={styles.dataLabel}>休息时间</div>
            <div className={styles.dataValue}>
              {formatTimeToMinutes(reportData.restTime)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
