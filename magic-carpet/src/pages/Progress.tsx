import { isAfter, parseISO, startOfMonth, startOfWeek, subDays } from 'date-fns'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { Flame } from 'lucide-react'
import { SESSION_META, type SessionType } from '../types'
import { PHASES } from '../data/exercises'
import { currentWeekNumber, getStreak, useWorkoutStore } from '../store/workoutStore'

export default function ProgressPage() {
  const logs = useWorkoutStore((s) => s.logs)
  const progress = useWorkoutStore((s) => s.progress)
  const startDate = useWorkoutStore((s) => s.startDate)

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
  const monthStart = startOfMonth(new Date())

  const weekLogs = logs.filter((l) => isAfter(parseISO(l.date), subDays(weekStart, 1)))
  const monthLogs = logs.filter((l) => isAfter(parseISO(l.date), subDays(monthStart, 1)))

  const weekCount = weekLogs.length
  const weekMin = weekLogs.reduce((a, l) => a + l.durationMin, 0)
  const monthCount = monthLogs.length
  const monthMin = monthLogs.reduce((a, l) => a + l.durationMin, 0)

  const streak = getStreak(progress)
  const week = currentWeekNumber(startDate)

  // 运动类型分布（合并健身房三类）
  const group = (t: SessionType) =>
    t === 'gym_push' || t === 'gym_pull' || t === 'gym_lower' ? 'gym' : t
  const labels: Record<string, { name: string; color: string }> = {
    gym: { name: '健身房', color: SESSION_META.gym_push.color },
    swim: { name: '游泳', color: SESSION_META.swim.color },
    tennis: { name: '网球', color: SESSION_META.tennis.color },
    outdoor: { name: '户外', color: SESSION_META.outdoor.color },
    rest: { name: '恢复', color: SESSION_META.rest.color },
  }
  const counts: Record<string, number> = {}
  for (const l of logs) {
    const g = group(l.sessionType)
    counts[g] = (counts[g] ?? 0) + 1
  }
  const pieData = Object.entries(counts).map(([k, v]) => ({
    name: labels[k]?.name ?? k,
    value: v,
    color: labels[k]?.color ?? '#9CA3AF',
  }))

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-slate-100">训练进展</h1>

      {/* streak */}
      <div className="card mb-5 flex items-center gap-4 p-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-500/15">
          <Flame size={26} className="text-orange-400" />
        </div>
        <div>
          <div className="text-2xl font-bold text-slate-100">
            {streak} <span className="text-base font-normal text-slate-400">天</span>
          </div>
          <div className="text-sm text-slate-400">颈椎专项连续打卡</div>
        </div>
      </div>

      {/* 本周 / 本月 */}
      <div className="mb-5 grid grid-cols-2 gap-3">
        <Stat title="本周" count={weekCount} minutes={weekMin} />
        <Stat title="本月" count={monthCount} minutes={monthMin} />
      </div>

      {/* 类型分布 */}
      <div className="card mb-5 p-4">
        <div className="mb-2 text-sm font-medium text-slate-300">运动类型分布</div>
        {pieData.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500">还没有数据，记录后这里会显示分布</div>
        ) : (
          <div className="flex items-center">
            <div className="h-40 flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={40} outerRadius={64} paddingAngle={2}>
                    {pieData.map((d, i) => (
                      <Cell key={i} fill={d.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8, fontSize: 12 }}
                    itemStyle={{ color: '#e2e8f0' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1.5 pr-2">
              {pieData.map((d) => (
                <div key={d.name} className="flex items-center gap-2 text-sm">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                  <span className="text-slate-300">{d.name}</span>
                  <span className="text-slate-500">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 12周阶段进度 */}
      <div className="card p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-300">12 周计划进度</span>
          <span className="text-sm text-cervical">第 {week} 周</span>
        </div>
        <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-700">
          <div className="h-full rounded-full bg-cervical" style={{ width: `${(week / 12) * 100}%` }} />
        </div>
        <div className="space-y-2.5">
          {PHASES.map((p) => {
            const active = week >= p.weekStart && week <= p.weekEnd
            const passed = week > p.weekEnd
            return (
              <div
                key={p.name}
                className={`rounded-xl border p-3 ${
                  active ? 'border-cervical bg-cervical/10' : 'border-slate-700/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${active ? 'text-cervical' : 'text-slate-200'}`}>
                    {p.name}
                  </span>
                  <span className="text-xs text-slate-500">
                    {p.weeks}
                    {passed ? ' ✓' : ''}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-400">{p.goal}</p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Stat({ title, count, minutes }: { title: string; count: number; minutes: number }) {
  return (
    <div className="card p-4">
      <div className="text-sm text-slate-400">{title}</div>
      <div className="mt-1 text-2xl font-bold text-slate-100">
        {count} <span className="text-sm font-normal text-slate-400">次</span>
      </div>
      <div className="mt-0.5 text-xs text-slate-500">
        {minutes} 分钟 · {(minutes / 60).toFixed(1)} 小时
      </div>
    </div>
  )
}
