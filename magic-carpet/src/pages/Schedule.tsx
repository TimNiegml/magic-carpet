import { useState } from 'react'
import { addDays, format, isSameDay, startOfWeek } from 'date-fns'
import { getDayPlan } from '../data/exercises'
import { SESSION_META } from '../types'
import { useWorkoutStore } from '../store/workoutStore'
import ExerciseCard from '../components/ExerciseCard'
import PageHeader from '../components/PageHeader'

const WEEKDAYS_CN = ['一', '二', '三', '四', '五', '六', '日']

function isoOf(d: Date) {
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10)
}

export default function SchedulePage() {
  const weekPlan = useWorkoutStore((s) => s.weekPlan)
  const logs = useWorkoutStore((s) => s.logs)
  const progress = useWorkoutStore((s) => s.progress)

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const [selected, setSelected] = useState<Date>(new Date())

  // 本周完成率
  const plannedDays = days.filter((d) => getDayPlan(weekPlan, d.getDay())?.sessionType !== 'rest')
  const completedDays = plannedDays.filter((d) => {
    const iso = isoOf(d)
    return logs.some((l) => l.date === iso) || (progress[iso]?.completed.length ?? 0) > 0
  })
  const rate = plannedDays.length ? Math.round((completedDays.length / plannedDays.length) * 100) : 0

  const selPlan = getDayPlan(weekPlan, selected.getDay())
  const selMeta = selPlan ? SESSION_META[selPlan.sessionType] : SESSION_META.rest
  const selIso = isoOf(selected)
  const selCompleted = progress[selIso]?.completed ?? []

  return (
    <div>
      <PageHeader title="本周计划" subtitle={`${format(weekStart, 'M.d')} - ${format(addDays(weekStart, 6), 'M.d')}`} />

      {/* 完成率 */}
      <div className="card mb-5 p-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-slate-300">本周完成</span>
          <span className="font-medium text-slate-100">
            {completedDays.length}/{plannedDays.length} 次 · {rate}%
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-700">
          <div className="h-full rounded-full bg-cervical transition-all" style={{ width: `${rate}%` }} />
        </div>
      </div>

      {/* 7天横向日历 */}
      <div className="mb-5 grid grid-cols-7 gap-1.5">
        {days.map((d, i) => {
          const plan = getDayPlan(weekPlan, d.getDay())
          const meta = plan ? SESSION_META[plan.sessionType] : SESSION_META.rest
          const isSel = isSameDay(d, selected)
          const isToday = isSameDay(d, new Date())
          const iso = isoOf(d)
          const hasActivity = logs.some((l) => l.date === iso) || (progress[iso]?.completed.length ?? 0) > 0
          return (
            <button
              key={i}
              onClick={() => setSelected(d)}
              className={`flex flex-col items-center gap-1 rounded-xl py-2 transition-all ${
                isSel ? 'ring-2 ring-cervical' : ''
              }`}
              style={{ background: meta.tint }}
            >
              <span className={`text-[11px] ${isToday ? 'font-bold text-cervical' : 'text-slate-400'}`}>
                {WEEKDAYS_CN[i]}
              </span>
              <span className="text-sm font-medium text-slate-200">{format(d, 'd')}</span>
              <span
                className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-medium text-white"
                style={{ background: meta.color }}
              >
                {meta.short}
              </span>
              <span className={`h-1 w-1 rounded-full ${hasActivity ? 'bg-cervical' : 'bg-transparent'}`} />
            </button>
          )
        })}
      </div>

      {/* 选中日详情 */}
      <div className="mb-2 flex items-center gap-2">
        <span className="h-3 w-3 rounded-full" style={{ background: selMeta.color }} />
        <span className="font-medium text-slate-100">
          {format(selected, 'M月d日')} · {selMeta.label}
          {selPlan?.sessionType !== 'rest' && selMeta.label.length <= 2 ? '日' : ''}
        </span>
      </div>

      {selPlan && selPlan.exercises.length > 0 ? (
        <div className="space-y-2">
          {selPlan.exercises.map((ex) => (
            <ExerciseCard key={ex.id} exercise={ex} done={selCompleted.includes(ex.id)} accent={selMeta.color} />
          ))}
        </div>
      ) : (
        <div className="card p-5 text-center text-sm text-slate-400">
          {selPlan?.sessionType === 'swim' && '游泳日 · 自由泳/蛙泳为主，注意肩颈放松'}
          {selPlan?.sessionType === 'outdoor' && '户外日 · 徒步或骑行，享受自然'}
          {selPlan?.sessionType === 'tennis' && '网球日 · 充分热身肩部'}
          {selPlan?.sessionType === 'rest' && '恢复日 · 颈椎专项 + 拉伸放松'}
        </div>
      )}
    </div>
  )
}
