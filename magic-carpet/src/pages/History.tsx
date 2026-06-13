import { Link } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { EFFORT_META, SESSION_META } from '../types'
import { useWorkoutStore } from '../store/workoutStore'
import PageHeader from '../components/PageHeader'

const WEEKDAYS_CN = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

export default function HistoryPage() {
  const logs = useWorkoutStore((s) => s.logs)
  const deleteLog = useWorkoutStore((s) => s.deleteLog)

  return (
    <div>
      <PageHeader
        title="历史记录"
        right={
          <Link to="/log" className="flex items-center gap-1 text-sm text-cervical">
            <ArrowLeft size={15} /> 返回
          </Link>
        }
      />

      {logs.length === 0 ? (
        <div className="card p-6 text-center text-sm text-slate-400">还没有训练记录，去完成第一次训练吧 💪</div>
      ) : (
        <div className="space-y-2.5">
          {logs.map((l) => {
            const m = SESSION_META[l.sessionType]
            const d = parseISO(l.date)
            return (
              <div key={l.id} className="card p-3.5">
                <div className="flex items-start gap-3">
                  <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ background: m.color }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-100">{m.label}</span>
                      <span className="text-xs text-slate-500">
                        {format(d, 'M月d日')} {WEEKDAYS_CN[d.getDay()]}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                      <span>{l.durationMin} 分钟</span>
                      <span>
                        {EFFORT_META[l.effort].emoji} {EFFORT_META[l.effort].label}
                      </span>
                      {l.cervicalDone && <span className="text-cervical">颈椎 ✓</span>}
                      {l.completedExercises.length > 0 && <span>{l.completedExercises.length} 个动作</span>}
                    </div>
                    {l.notes && <p className="mt-1.5 text-sm text-slate-300">{l.notes}</p>}
                  </div>
                  <button onClick={() => deleteLog(l.id)} aria-label="删除" className="shrink-0 text-slate-600 hover:text-red-400">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
