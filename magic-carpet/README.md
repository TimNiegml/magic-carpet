# 🪄 魔毯冥想旅程 — 部署指南

## 📮 反馈箱（v1.7 · 反馈直达 GitHub）

页面右下角新增「✎ 反馈」按钮，用户提交的反馈会通过 `/api/feedback` **自动在你的 GitHub 仓库开一个 Issue**（含旅程目的地、可选联系方式、设备信息）。

启用只需两个环境变量：

1. `GITHUB_TOKEN` —— 有 Issues 写权限的 Token（[申请](https://github.com/settings/tokens)；Fine-grained 授予目标仓库 `Issues = Read and write`，或经典 token 勾选 `repo`）
2. `GITHUB_REPO` —— 目标仓库，格式 `owner/repo`，例如 `TimNiegml/magic-carpet`
3. 可选 `GITHUB_ISSUE_LABELS` —— Issue 标签，逗号分隔，默认 `feedback`

在 Vercel 里 `vercel env add GITHUB_TOKEN` / `GITHUB_REPO` 后 `vercel --prod` 重新部署即可。

> 页脚已标注：创意版权归属「活满」所有 · 贡献人：炜仔 及活满全体工作人员。

---


## ✨ v1.1 更新（2026-07）

- **修复 TTS 无声音**：浏览器禁止无用户手势的自动播放，现在进入页面先点「轻触魔毯 · 开始旅程」解锁音频；同时修正了火山引擎 v1 接口混用 v3 请求头的问题
- **5 个蓝本旅程**：御风上天 / 深海龙宫 / 雪山之巅 / 月宫奇遇（神话）/ 星际漫游（科幻），固定文案
- **低延时**：点开始后，5 个蓝本的语音在后台逐句预取并存入浏览器 Cache Storage（卡片右上角绿点 = 已缓存，点击秒播，二次访问零请求）；自由目的地走「分句流水线」——首句合成完立即播放，后面的句子边播边取，等待期由起飞音效 + 过渡语掩盖
- **带语气朗读**：/api/tts 支持 `emotion` 与 `speed` 参数（需音色支持多情感，失败自动降级）；旁白文案本身按呢喃节奏断句
- **手机语音输入**：浏览器自带识别不可用时（小米浏览器、国内安卓 Chrome 等），自动切换为录音上传火山引擎「大模型录音文件极速版识别」——需在控制台开通该服务（资源 ID `volc.bigasr.auc_turbo`，共用 VOLC_APPID/TOKEN）；另有文字输入兜底
- **注意**：改动 `VOLC_VOICE` 或蓝本文案后，请把 index.html 里的 `TTS_CACHE` 版本号 +1，否则老缓存不会失效；改完记得 `vercel --prod` 重新部署

## 🎙 语音质量升级（v1.6）

TTS 现在是双引擎：优先走 **豆包语音合成大模型 v3**（自然度高、有情感），失败自动回落老 v1 接口（保证可用）。

要启用大模型音质：
1. 打开 https://console.volcengine.com/speech/service/10007 开通「语音合成大模型」（用同一个应用，无需新 Key）
2. 在该页面购买/领取音色，推荐 `zh_female_wanwanxiaohe_moon_bigtts`（湾湾小何，默认）
3. 可选环境变量：`VOLC_VOICE_V3` 换音色；`VOLC_TTS_RESOURCE=seed-tts-2.0` 切换到豆包2.0（需另在 service/10035 开通，音色如 `zh_female_xiaohe_uranus_bigtts`）
4. 换音色后把 index.html 里 `TTS_CACHE` 版本号 +1

---

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
