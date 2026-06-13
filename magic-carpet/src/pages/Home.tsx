import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { CheckCircle2, ChevronRight, HeartPulse } from 'lucide-react'
import { getDayPlan, CERVICAL_EXERCISES } from '../data/exercises'
import { SESSION_META } from '../types'
import { todayISO, useWorkoutStore } from '../store/workoutStore'
import ExerciseCard from '../components/ExerciseCard'
import PageHeader from '../components/PageHeader'

const WEEKDAYS_CN = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

export default function HomePage() {
  const date = todayISO()
  const weekPlan = useWorkoutStore((s) => s.weekPlan)
  const progress = useWorkoutStore((s) => s.progress[date])
  const toggleExercise = useWorkoutStore((s) => s.toggleExercise)
  const setCervicalDone = useWorkoutStore((s) => s.setCervicalDone)

  const dow = new Date().getDay()
  const plan = getDayPlan(weekPlan, dow)
  const meta = plan ? SESSION_META[plan.sessionType] : SESSION_META.rest
  const completed = progress?.completed ?? []
  const cervicalDone = progress?.cervicalDone ?? false

  const totalEx = plan?.exercises.length ?? 0
  const doneEx = plan?.exercises.filter((e) => completed.includes(e.id)).length ?? 0

  return (
    <div>
      <PageHeader title="今日训练" subtitle={`${format(new Date(), 'M月d日')} ${WEEKDAYS_CN[dow]}`} />

      {/* 今日类型卡 */}
      <div
        className="card mb-5 flex items-center justify-between p-4"
        style={{ background: meta.tint, borderColor: meta.color + '40' }}
      >
        <div>
          <div className="text-xs text-slate-400">今天是</div>
          <div className="text-lg font-semibold" style={{ color: meta.color }}>
            {meta.label}日
          </div>
          {plan && plan.durationMin > 0 && (
            <div className="mt-0.5 text-xs text-slate-400">预计 {plan.durationMin} 分钟</div>
          )}
        </div>
        {totalEx > 0 && (
          <div className="text-right">
            <div className="text-2xl font-bold text-slate-100">
              {doneEx}
              <span className="text-base text-slate-500">/{totalEx}</span>
            </div>
            <div className="text-xs text-slate-400">动作完成</div>
          </div>
        )}
      </div>

      {/* 颈椎专项模块 */}
      <div className="card mb-5 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HeartPulse size={18} className="text-cervical" />
            <span className="font-medium text-slate-100">颈椎专项</span>
            <span className="text-xs text-slate-500">训练前后必做</span>
          </div>
          <button
            onClick={() => setCervicalDone(date, !cervicalDone)}
            className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs transition-colors ${
              cervicalDone ? 'bg-cervical text-slate-900' : 'bg-slate-700 text-slate-300'
            }`}
          >
            <CheckCircle2 size={14} />
            {cervicalDone ? '今日已打卡' : '打卡'}
          </button>
        </div>
        <div className="space-y-2">
          {CERVICAL_EXERCISES.map((ex) => (
            <ExerciseCard key={ex.id} exercise={ex} accent="#06B6D4" />
          ))}
        </div>
      </div>

      {/* 今日动作 */}
      {totalEx > 0 ? (
        <div className="space-y-2">
          <div className="mb-1 text-sm font-medium text-slate-300">今日动作</div>
          {plan!.exercises.map((ex) => (
            <ExerciseCard
              key={ex.id}
              exercise={ex}
              done={completed.includes(ex.id)}
              onToggle={() => toggleExercise(date, ex.id)}
              accent={meta.color}
            />
          ))}
        </div>
      ) : (
        <div className="card p-5 text-center text-sm text-slate-400">
          {plan?.sessionType === 'rest'
            ? '今天是恢复日，做好颈椎专项和拉伸，让身体充分休息。'
            : `今天是${meta.label}日，享受运动，记得结束后记录一下。`}
        </div>
      )}

      {/* 训练完成后记录入口 */}
      <Link
        to="/log"
        className="card mt-5 flex items-center justify-between p-4 text-slate-200 active:scale-[0.99]"
      >
        <span className="font-medium">训练结束了？记录这次训练</span>
        <ChevronRight size={18} className="text-slate-500" />
      </Link>
    </div>
  )
}
