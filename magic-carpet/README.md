# 🪄 魔毯冥想旅程 — 部署指南

## ✨ v1.1 更新（2026-07）

- **修复 TTS 无声音**：浏览器禁止无用户手势的自动播放，现在进入页面先点「轻触魔毯 · 开始旅程」解锁音频；同时修正了火山引擎 v1 接口混用 v3 请求头的问题
- **5 个蓝本旅程**：御风上天 / 深海龙宫 / 雪山之巅 / 月宫奇遇（神话）/ 星际漫游（科幻），固定文案
- **低延时**：点开始后，5 个蓝本的语音在后台逐句预取并存入浏览器 Cache Storage（卡片右上角绿点 = 已缓存，点击秒播，二次访问零请求）；自由目的地走「分句流水线」——首句合成完立即播放，后面的句子边播边取，等待期由起飞音效 + 过渡语掩盖
- **带语气朗读**：/api/tts 支持 `emotion` 与 `speed` 参数（需音色支持多情感，失败自动降级）；旁白文案本身按呢喃节奏断句
- **手机语音输入**：浏览器自带识别不可用时（小米浏览器、国内安卓 Chrome 等），自动切换为录音上传火山引擎「大模型录音文件极速版识别」——需在控制台开通该服务（资源 ID `volc.bigasr.auc_turbo`，共用 VOLC_APPID/TOKEN）；另有文字输入兜底
- **注意**：改动 `VOLC_VOICE` 或蓝本文案后，请把 index.html 里的 `TTS_CACHE` 版本号 +1，否则老缓存不会失效；改完记得 `vercel --prod` 重新部署

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
