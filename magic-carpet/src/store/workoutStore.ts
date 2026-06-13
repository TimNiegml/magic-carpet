import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { DayPlan, SessionType, WorkoutLog } from '../types'
import { DEFAULT_WEEK_PLAN } from '../data/exercises'

// 某一天的勾选进度
interface DayProgress {
  completed: string[] // 已完成动作 id
  cervicalDone: boolean // 颈椎专项是否完成
}

interface WorkoutState {
  // 用户可调整的周计划（dayOfWeek -> sessionType 覆盖）
  weekPlan: DayPlan[]
  // 程序开始日期（用于计算第几周），ISO date
  startDate: string
  // 每日勾选进度，key = ISO date
  progress: Record<string, DayProgress>
  // 训练记录
  logs: WorkoutLog[]

  // —— actions ——
  toggleExercise: (date: string, exerciseId: string) => void
  setCervicalDone: (date: string, done: boolean) => void
  getDayProgress: (date: string) => DayProgress
  setSessionTypeForDay: (dayOfWeek: number, type: SessionType) => void
  resetWeekPlan: () => void
  addLog: (log: Omit<WorkoutLog, 'id'>) => void
  deleteLog: (id: string) => void
}

const emptyProgress = (): DayProgress => ({ completed: [], cervicalDone: false })

function todayISO() {
  const d = new Date()
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10)
}

export const useWorkoutStore = create<WorkoutState>()(
  persist(
    (set, get) => ({
      weekPlan: DEFAULT_WEEK_PLAN,
      startDate: todayISO(),
      progress: {},
      logs: [],

      toggleExercise: (date, exerciseId) =>
        set((s) => {
          const cur = s.progress[date] ?? emptyProgress()
          const has = cur.completed.includes(exerciseId)
          const completed = has
            ? cur.completed.filter((id) => id !== exerciseId)
            : [...cur.completed, exerciseId]
          return { progress: { ...s.progress, [date]: { ...cur, completed } } }
        }),

      setCervicalDone: (date, done) =>
        set((s) => {
          const cur = s.progress[date] ?? emptyProgress()
          return { progress: { ...s.progress, [date]: { ...cur, cervicalDone: done } } }
        }),

      getDayProgress: (date) => get().progress[date] ?? emptyProgress(),

      setSessionTypeForDay: (dayOfWeek, type) =>
        set((s) => ({
          weekPlan: s.weekPlan.map((d) =>
            d.dayOfWeek === dayOfWeek ? { ...d, sessionType: type } : d,
          ),
        })),

      resetWeekPlan: () => set({ weekPlan: DEFAULT_WEEK_PLAN }),

      addLog: (log) =>
        set((s) => ({
          logs: [{ ...log, id: crypto.randomUUID() }, ...s.logs],
        })),

      deleteLog: (id) => set((s) => ({ logs: s.logs.filter((l) => l.id !== id) })),
    }),
    {
      name: 'magic-carpet-fitness',
      version: 1,
    },
  ),
)

// —— 派生选择器（组件中调用，非 hook） ——

export function getStreak(progress: Record<string, DayProgress>): number {
  // 颈椎专项连续打卡天数（从今天往回数）
  let streak = 0
  const d = new Date()
  for (;;) {
    const off = d.getTimezoneOffset()
    const iso = new Date(d.getTime() - off * 60000).toISOString().slice(0, 10)
    if (progress[iso]?.cervicalDone) {
      streak++
      d.setDate(d.getDate() - 1)
    } else {
      break
    }
  }
  return streak
}

export function currentWeekNumber(startDate: string): number {
  const start = new Date(startDate + 'T00:00:00')
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - start.getTime()) / 86400000)
  return Math.min(12, Math.max(1, Math.floor(diffDays / 7) + 1))
}

export { todayISO }
