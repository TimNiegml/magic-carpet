# 🏋️ 魔毯健身 — 个人训练助手

一款面向「久坐 + 颈椎问题 + 想增肌」人群的个人健身追踪 App。核心三件事：

1. **每周训练计划** — 按日展示今天练什么（推 / 拉 / 腿 / 游泳 / 户外 / 休息）
2. **颈椎康复打卡** — 5 个专项动作，训练前后必做，连续打卡 streak
3. **私人助教** — 每个动作都有分步要领、常见错误、呼吸与颈椎提示，并能**语音讲给你听**

> 目标：缓解颈椎问题 + 增肌增强体质。12 周三阶段计划（重建 → 增肌 → 强化）。

---

## ✨ 私人助教（零配置即可用）

点每个动作旁的 🔊 按钮，助教会把动作要领念给你听。设计为「不配置也能用，配了 key 更好」：

| 能力 | 默认（免费、无需 key） | 配置后增强 |
|------|----------------------|-----------|
| 文字讲解 | 内置分步要领 / 常见错误 / 呼吸 / 颈椎提示 | Claude 生成更自然的口语化教练词（`/api/coach`） |
| 语音播报 | 浏览器内置中文朗读（Web Speech API） | 火山引擎高质量女声（`/api/tts`） |

环境变量见 `.env.example`，**全部可选**。

---

## 🧱 技术栈

React + Vite + TypeScript · Tailwind CSS · Zustand（localStorage 持久化）· Recharts · date-fns · lucide-react

数据全部存在浏览器本地，无需后端账号；AI/语音通过 `/api` Serverless 函数代理。

---

## 📁 项目结构

```
magic-carpet/
├── index.html              ← Vite 入口
├── src/
│   ├── data/exercises.ts   ← 周计划 + 颈椎专项 + 完整动作教学内容
│   ├── store/workoutStore.ts ← Zustand 状态（进度 / 记录 / 计划）
│   ├── lib/coach.ts        ← 私人助教：文字讲解 + 语音播报
│   ├── components/         ← ExerciseCard 等
│   └── pages/             ← 今日 / 周计划 / 记录 / 历史 / 进展 / 计划 / 动作库
├── api/
│   ├── coach.js            ← Claude 生成口语化指导（可选）
│   ├── narrate.js          ← 旧版冥想旁白（保留）
│   └── tts.js              ← 火山引擎 TTS（可选）
└── vercel.json
```

页面路由（HashRouter）：`/` 今日 · `/schedule` 周计划 · `/log` 记录 · `/log/history` 历史 · `/progress` 进展 · `/plan` 计划 · `/exercises` 动作库

---

## 🚀 本地开发

```bash
npm install
npm run dev        # http://localhost:5173
```

需要测试 AI/语音接口时，另开一个终端跑 `npx vercel dev`（监听 3000，Vite 已配置 /api 代理）。

## ☁️ 部署到 Vercel

1. 把项目推到 GitHub，在 Vercel Import（框架自动识别为 Vite）
2. 如需 AI/高质量语音，在 Environment Variables 里填 `.env.example` 中的变量（可全部不填）
3. Deploy ✅

---

## 📦 MVP 范围

- [x] 今日计划展示 + 动作逐条打勾
- [x] 颈椎专项打卡 + 连续 streak
- [x] 训练记录写入 localStorage + 历史列表
- [x] 周视图（7 天色块 + 本周完成率）
- [x] 进展统计（次数/时长/类型饼图/12 周阶段）
- [x] 计划自定义（每天训练类型可调）
- [x] **私人助教语音讲解**（内置 + AI/火山引擎增强）
- [ ] 动作示范视频（后续）

---

*旧版「魔毯冥想旅程」完整保留在 `main` 分支。*
