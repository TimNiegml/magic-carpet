// 训练类型
export type SessionType =
  | 'gym_push' // 上肢推
  | 'gym_pull' // 上肢拉
  | 'gym_lower' // 下肢+核心
  | 'swim' // 游泳
  | 'tennis' // 网球
  | 'outdoor' // 徒步/骑行
  | 'rest' // 休息/恢复

// 单个动作（在 PRD 基础上扩展了"私人助教"所需的教学字段）
export interface Exercise {
  id: string
  name: string // 中文名
  nameEn?: string // 英文名
  sets: number
  reps: string // e.g. "10-12" or "30秒"
  cue: string // 一句话执行提示
  isCervical: boolean // 是否属于颈椎专项
  videoUrl?: string // 可选示范链接（视频/B站等）
  gifUrl?: string // 可选示范 GIF/图片直链；填了优先显示真人示范
  // —— 私人助教教学内容 ——
  focus?: string // 目标肌群 / 训练目的
  steps?: string[] // 分步动作要领
  mistakes?: string[] // 常见错误
  breathing?: string // 呼吸节奏
  cervicalNote?: string // 颈椎友好提示
}

// 训练日配置
export interface DayPlan {
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6 // 0=周日
  sessionType: SessionType
  exercises: Exercise[]
  durationMin: number // 预计时长（分钟）
}

export type Effort = 'easy' | 'moderate' | 'hard'

// 训练记录
export interface WorkoutLog {
  id: string
  date: string // ISO date, e.g. "2026-06-13"
  sessionType: SessionType
  durationMin: number
  effort: Effort
  cervicalDone: boolean // 是否完成颈椎专项
  completedExercises: string[] // Exercise id 列表
  notes?: string
}

export interface SessionMeta {
  label: string
  short: string
  color: string // tailwind-friendly hex
  tint: string // 浅色背景
}

export const SESSION_META: Record<SessionType, SessionMeta> = {
  gym_push: { label: '上肢推', short: '推', color: '#3B82F6', tint: 'rgba(59,130,246,0.12)' },
  gym_pull: { label: '上肢拉', short: '拉', color: '#3B82F6', tint: 'rgba(59,130,246,0.12)' },
  gym_lower: { label: '下肢核心', short: '腿', color: '#3B82F6', tint: 'rgba(59,130,246,0.12)' },
  swim: { label: '游泳', short: '泳', color: '#10B981', tint: 'rgba(16,185,129,0.12)' },
  tennis: { label: '网球', short: '网', color: '#F59E0B', tint: 'rgba(245,158,11,0.12)' },
  outdoor: { label: '户外', short: '外', color: '#F59E0B', tint: 'rgba(245,158,11,0.12)' },
  rest: { label: '休息', short: '休', color: '#9CA3AF', tint: 'rgba(156,163,175,0.12)' },
}

export const EFFORT_META: Record<Effort, { label: string; emoji: string }> = {
  easy: { label: '轻松', emoji: '🙂' },
  moderate: { label: '适中', emoji: '😅' },
  hard: { label: '很累', emoji: '🥵' },
}
