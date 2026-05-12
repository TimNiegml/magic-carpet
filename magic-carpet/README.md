# 🪄 魔毯冥想旅程 — 部署指南

## 第一步：申请火山引擎 TTS API Key

1. 打开 https://www.volcengine.com 注册账号（支持微信/手机号）

2. 进入控制台 → 搜索「语音合成」→ 开通服务

3. 创建应用：
   - 控制台左侧 → 语音技术 → 语音合成 → 应用管理 → 新建应用
   - 记录下：**AppID** 和 **AccessToken**

4. 确认 Cluster 为：`volcano_tts`（默认）

5. 推荐选用的声音：

   | 声音代码 | 说明 | 适合场景 |
   |---|---|---|
   | `zh_female_cancan_mars_bigtts` | 灿灿·温柔女声 ⭐ 推荐 | 冥想引导 |
   | `zh_female_yangtian_moon_bigtts` | 扬天·清澈女声 | 冥想引导 |
   | `zh_male_qingcang_mars_bigtts` | 擎苍·深沉男声 | 沉浸叙述 |

---

## 第二步：申请 Anthropic API Key

1. 打开 https://console.anthropic.com 注册
2. API Keys → Create Key
3. 记录下：**sk-ant-xxxx**

---

## 第三步：一键部署到 Vercel（免费）

### 方式 A：命令行（推荐）

```bash
# 1. 安装 Vercel CLI
npm i -g vercel

# 2. 在项目根目录运行
vercel

# 3. 设置环境变量
vercel env add ANTHROPIC_API_KEY
vercel env add VOLC_APPID
vercel env add VOLC_ACCESS_TOKEN
vercel env add VOLC_VOICE   # 可选，默认灿灿

# 4. 重新部署
vercel --prod
```

### 方式 B：GitHub + Vercel 网页控制台

1. 把这个项目上传到 GitHub 仓库
2. 打开 https://vercel.com → Import Project → 选择仓库
3. 在 Environment Variables 填入：
   ```
   ANTHROPIC_API_KEY = sk-ant-...
   VOLC_APPID        = 你的AppID
   VOLC_ACCESS_TOKEN = 你的AccessToken
   VOLC_VOICE        = zh_female_cancan_mars_bigtts
   ```
4. Deploy！

---

## 本地开发

```bash
# 创建 .env.local
cp .env.example .env.local
# 填入你的 Key

# 启动
npx vercel dev
# 访问 http://localhost:3000
```

---

## 项目结构

```
magic-carpet/
├── index.html       ← 前端页面（魔毯UI）
├── api/
│   ├── narrate.js   ← Claude 生成旁白
│   └── tts.js       ← 火山引擎 TTS 转音频
├── vercel.json      ← 部署配置
└── .env.example     ← 环境变量模板
```
