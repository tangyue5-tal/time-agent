import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.scss'
import './app.scss'

export const metadata: Metadata = {
  title: 'Time Agent - 多啦A梦语音播放',
  description: '一个使用 Next.js 构建的语音播放应用，支持多啦A梦风格的语音合成',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body>
        <div className="app">
          {/* <nav className="nav">
            <Link href="/">Home</Link>
            <Link href="/about">About</Link>
            <Link href="/playSound">多啦A梦语音播放</Link>
          </nav> */}
          <main className="main">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}

