'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useAppStore } from '@/lib/store'
import styles from './parentSettingPage.module.scss'
import firstTitle from '../assets/images/first-title.png'
import loginBtn from '../assets/images/login-btn.png'
import { resetReportData } from '@/lib/utils/reportStorage'

const grades = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级']
const habitOptions = ['一般', '较好', '非常好']
const scoreOptions = ['一般', '较好', '非常好']

export default function ParentSettingPage() {
  const router = useRouter()
  const { setBasicInfo } = useAppStore()
  
  const [grade, setGrade] = useState('')
  const [xiguan, setXiguan] = useState('')
  const [chengji, setChengji] = useState('')
  const [isGradeDropdownOpen, setIsGradeDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // 点击外部区域关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsGradeDropdownOpen(false)
      }
    }

    if (isGradeDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isGradeDropdownOpen])

  // 生成时间范围（默认当天下午4点到5点）
  const getTimeRange = () => {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    return `${year}-${month}-${day} 16:00~${year}-${month}-${day} 17:00`
  }

  const handleSubmit = () => {
    // 验证必填项
    if (!grade || !xiguan || !chengji) {
      alert('请完成所有必填项')
      return
    }

    // 构建配置数据
    const basicInfo = {
      baby_name: '可乐', // 暂时写死
      grade,
      xiguan,
      chengji,
      time_range: getTimeRange()
    }
    resetReportData()

    // 保存到store
    setBasicInfo(basicInfo)
    
    // 跳转到chatPage
    router.push('/chatPage')
  }

  return (
    <div className={styles.settingPage}>
      {/* 标题图片 */}
      <div className={styles.titleContainer}>
        <Image
          src={firstTitle}
          alt="AI时间小主人"
          width={221}
          height={51}
          className={styles.titleImage}
          priority
        />
      </div>

      {/* 配置表单 */}
      <div className={styles.formContainer}>
        {/* 年级选择 */}
        <div className={styles.formItem}>
          <label className={styles.label}>
            <span className={styles.required}>*</span>选择年级
          </label>
          <div className={styles.dropdownWrapper} ref={dropdownRef}>
            <div
              className={styles.dropdown}
              onClick={() => setIsGradeDropdownOpen(!isGradeDropdownOpen)}
            >
              <span className={grade ? styles.selectedValue : styles.placeholder}>
                {grade || '请选择年级'}
              </span>
              <svg
                className={`${styles.dropdownIcon} ${isGradeDropdownOpen ? styles.open : ''}`}
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
              >
                <path
                  d="M4 6L8 10L12 6"
                  stroke="#D8D8D8"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            {isGradeDropdownOpen && (
              <div className={styles.dropdownMenu}>
                {grades.map((g) => (
                  <div
                    key={g}
                    className={styles.dropdownItem}
                    onClick={() => {
                      setGrade(g)
                      setIsGradeDropdownOpen(false)
                    }}
                  >
                    {g}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 学习习惯 */}
        <div className={styles.formItem}>
          <label className={styles.label}>学习习惯</label>
          <div className={styles.radioGroup}>
            {habitOptions.map((option) => (
              <label key={option} className={styles.radioItem}>
                <input
                  type="radio"
                  name="xiguan"
                  value={option}
                  checked={xiguan === option}
                  onChange={(e) => setXiguan(e.target.value)}
                  className={styles.radioInput}
                />
                <span className={styles.radioLabel}>{option}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 学习成绩 */}
        <div className={styles.formItem}>
          <label className={styles.label}>学习成绩</label>
          <div className={styles.radioGroup}>
            {scoreOptions.map((option) => (
              <label key={option} className={styles.radioItem}>
                <input
                  type="radio"
                  name="chengji"
                  value={option}
                  checked={chengji === option}
                  onChange={(e) => setChengji(e.target.value)}
                  className={styles.radioInput}
                />
                <span className={styles.radioLabel}>{option}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 空闲时间 */}
        <div className={styles.formItem}>
          <label className={styles.label}>
            <span className={styles.required}>*</span>空闲时间
          </label>
          <div className={styles.timeDisplay}>
            <span className={styles.timeText}>16:00 - 17:00</span>
            <svg
              className={styles.timeIcon}
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
            >
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
              <path d="M8 4V8L11 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </div>

      {/* 配置完成按钮 */}
      <div className={styles.buttonContainer}>
        <button className={styles.submitButton} onClick={handleSubmit}>
          <Image
            src={loginBtn}
            alt="配置完成"
            width={212}
            height={62}
            className={styles.buttonImage}
            priority
          />
        </button>
      </div>
    </div>
  )
}
