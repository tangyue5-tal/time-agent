# Time Agent - 多啦A梦语音播放 (Next.js 版本)

一个使用 Next.js + TypeScript + Sass 构建的语音播放应用，支持多啦A梦风格的语音合成。

## 功能特性

- 🎤 文本转语音（TTS）
- 🎭 多啦A梦风格音色
- 🌐 支持多种 TTS 服务（百度、Azure等）
- 🎨 现代化 UI 设计
- ⚡ Next.js App Router
- 🔒 服务端 API Routes（更安全）

## 快速开始

### 1. 安装依赖

```bash
npm install
# 或
pnpm install
# 或
yarn install
```

### 2. 配置 TTS 服务

复制 `.env.example` 为 `.env.local` 并填入你的 API 密钥：

```bash
cp .env.example .env.local
```

编辑 `.env.local` 文件：

```env
# TTS 服务提供商: baidu | azure
TTS_PROVIDER=baidu

# 百度 TTS 配置
TTS_API_KEY=your_baidu_api_key
TTS_API_SECRET=your_baidu_secret_key

# Azure TTS 配置
TTS_REGION=your_azure_region
TTS_VOICE=zh-CN-XiaoxiaoNeural
```

### 3. 启动开发服务器

```bash
npm run dev
```

应用将在 `http://localhost:3000` 启动。

### 4. 构建生产版本

```bash
npm run build
npm start
```

## 使用说明

1. 访问 `http://localhost:3000/playSound`
2. 在输入框中输入要播放的文本
3. 点击"开始播放"按钮
4. 享受多啦A梦风格的语音播放！

## 项目结构

```
time-agent-next/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   └── tts/          # TTS API 端点
│   ├── about/            # About 页面
│   ├── playSound/        # 语音播放页面
│   ├── layout.tsx        # 根布局
│   └── page.tsx          # 首页
├── lib/                   # 共享库
│   └── services/        # 服务层
│       └── tts/         # TTS 服务
└── package.json
```

## TTS 服务配置

### 百度语音合成

1. 访问 [百度智能云](https://cloud.baidu.com/)
2. 创建应用，获取 API Key 和 Secret Key
3. 在 `.env.local` 文件中配置

### Azure 语音服务

1. 访问 [Azure Portal](https://portal.azure.com/)
2. 创建语音服务资源
3. 获取 API Key 和 Region
4. 在 `.env.local` 文件中配置

## 技术栈

- **框架**: Next.js 15 (App Router)
- **前端**: React 19 + TypeScript + Sass
- **API**: Next.js API Routes
- **构建工具**: Next.js (内置)

## 开发

```bash
# 开发模式
npm run dev

# 构建
npm run build

# 生产模式
npm start

# 代码检查
npm run lint
```

## 与 Vite 版本的区别

- ✅ 使用 Next.js App Router 替代 React Router
- ✅ 使用 Next.js API Routes 替代独立的 Express 服务器
- ✅ 环境变量使用 `NEXT_PUBLIC_` 前缀（如果需要客户端访问）
- ✅ 服务端 API 更安全（密钥不暴露给客户端）
- ✅ 更好的 SEO 支持
- ✅ 内置的代码分割和优化

## 注意事项

- 🔐 API 密钥存储在服务端（`.env.local`），更安全
- 🎯 推荐使用百度 TTS 的"度丫丫"音色（voice: 4），音色较可爱，适合多啦A梦风格
- ⚠️ `.env.local` 文件不应提交到版本控制

## License

MIT

