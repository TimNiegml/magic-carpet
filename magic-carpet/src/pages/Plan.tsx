import { Link } from 'react-router-dom'
import { ChevronRight, RotateCcw } from 'lucide-react'
import { SESSION_META, type SessionType } from '../types'
import { CERVICAL_EXERCISES, PHASES } from '../data/exercises'
import { useWorkoutStore } from '../store/workoutStore'
import ExerciseCard from '../components/ExerciseCard'
import PageHeader from '../components/PageHeader'

const WEEKDAYS_CN = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const ORDER = [1, 2, 3, 4, 5, 6, 0]
const TYPE_OPTIONS: SessionType[] = ['gym_push', 'gym_pull', 'gym_lower', 'swim', 'tennis', 'outdoor', 'rest']

export default function PlanPage() {
  const weekPlan = useWorkoutStore((s) => s.weekPlan)
  const setSessionTypeForDay = useWorkoutStore((s) => s.setSessionTypeForDay)
  const resetWeekPlan = useWorkoutStore((s) => s.resetWeekPlan)

  return (
    <div>
      <PageHeader title="训练计划" subtitle="12 周 · 增肌 + 颈椎康复" />

      {/* 12周阶段说明 */}
      <div className="mb-6 space-y-2.5">
        {PHASES.map((p) => (
          <div key={p.name} className="card p-4">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-100">{p.name}</span>
              <span className="text-xs text-slate-500">{p.weeks}</span>
            </div>
            <p className="mt-1 text-sm text-cervical">{p.goal}</p>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{p.detail}</p>
          </div>
        ))}
      </div>

      {/* 每周安排（可调整） */}
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-medium text-slate-200">每周安排</h2>
        <button onClick={resetWeekPlan} className="flex items-center gap-1 text-xs text-slate-400">
          <RotateCcw size={13} /> 恢复默认
        </button>
      </div>
      <div className="mb-6 space-y-2">
        {ORDER.map((dow) => {
          const plan = weekPlan.find((d) => d.dayOfWeek === dow)
          if (!plan) return null
          const m = SESSION_META[plan.sessionType]
          return (
            <div key={dow} className="card flex items-center gap-3 p-3">
              <span className="w-10 text-sm text-slate-300">{WEEKDAYS_CN[dow]}</span>
              <span className="h-3 w-3 rounded-full" style={{ background: m.color }} />
              <select
                value={plan.sessionType}
                onChange={(e) => setSessionTypeForDay(dow, e.target.value as SessionType)}
                className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-sm text-slate-100"
              >
                {TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {SESSION_META[t].label}
                  </option>
                ))}
              </select>
            </div>
          )
        })}
      </div>

      {/* 颈椎专项 */}
      <h2 className="mb-2 font-medium text-slate-200">颈椎专项动作</h2>
      <div className="mb-4 space-y-2">
        {CERVICAL_EXERCISES.map((ex) => (
          <ExerciseCard key={ex.id} exercise={ex} accent="#06B6D4" />
        ))}
      </div>

      <Link to="/exercises" className="card flex items-center justify-between p-4 text-slate-200 active:scale-[0.99]">
        <span className="font-medium">查看完整动作库</span>
        <ChevronRight size={18} className="text-slate-500" />
      </Link>
    </div>
  )
}
