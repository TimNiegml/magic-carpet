import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check, History } from 'lucide-react'
import { EFFORT_META, SESSION_META, type Effort, type SessionType } from '../types'
import { getDayPlan } from '../data/exercises'
import { todayISO, useWorkoutStore } from '../store/workoutStore'
import PageHeader from '../components/PageHeader'

const TYPES: SessionType[] = ['gym_push', 'gym_pull', 'gym_lower', 'swim', 'tennis', 'outdoor']
const EFFORTS: Effort[] = ['easy', 'moderate', 'hard']

export default function LogPage() {
  const navigate = useNavigate()
  const weekPlan = useWorkoutStore((s) => s.weekPlan)
  const addLog = useWorkoutStore((s) => s.addLog)
  const progress = useWorkoutStore((s) => s.progress[todayISO()])

  const todayPlan = getDayPlan(weekPlan, new Date().getDay())
  const defaultType: SessionType =
    todayPlan && todayPlan.sessionType !== 'rest' ? todayPlan.sessionType : 'gym_push'

  const [date, setDate] = useState(todayISO())
  const [type, setType] = useState<SessionType>(defaultType)
  const [duration, setDuration] = useState<number>(todayPlan?.durationMin || 60)
  const [effort, setEffort] = useState<Effort>('moderate')
  const [cervicalDone, setCervicalDone] = useState<boolean>(progress?.cervicalDone ?? false)
  const [notes, setNotes] = useState('')
  const [saved, setSaved] = useState(false)

  function onSave() {
    addLog({
      date,
      sessionType: type,
      durationMin: duration,
      effort,
      cervicalDone,
      completedExercises: date === todayISO() ? (progress?.completed ?? []) : [],
      notes: notes.trim() || undefined,
    })
    setSaved(true)
    setTimeout(() => navigate('/log/history'), 700)
  }

  return (
    <div>
      <PageHeader
        title="记录训练"
        right={
          <Link to="/log/history" className="flex items-center gap-1 text-sm text-cervical">
            <History size={15} /> 历史
          </Link>
        }
      />

      <div className="space-y-5">
        {/* 日期 */}
        <Field label="日期">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-slate-100"
          />
        </Field>

        {/* 类型 */}
        <Field label="训练类型">
          <div className="grid grid-cols-3 gap-2">
            {TYPES.map((t) => {
              const m = SESSION_META[t]
              const active = type === t
              return (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`rounded-xl border py-2.5 text-sm transition-all ${
                    active ? 'text-white' : 'border-slate-700 text-slate-300'
                  }`}
                  style={active ? { background: m.color, borderColor: m.color } : { background: m.tint }}
                >
                  {m.label}
                </button>
              )
            })}
          </div>
        </Field>

        {/* 时长 */}
        <Field label={`时长 · ${duration} 分钟`}>
          <input
            type="range"
            min={10}
            max={180}
            step={5}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-full accent-cervical"
          />
        </Field>

        {/* 感受 */}
        <Field label="主观感受">
          <div className="grid grid-cols-3 gap-2">
            {EFFORTS.map((ef) => {
              const m = EFFORT_META[ef]
              const active = effort === ef
              return (
                <button
                  key={ef}
                  onClick={() => setEffort(ef)}
                  className={`flex flex-col items-center gap-1 rounded-xl border py-3 transition-all ${
                    active ? 'border-cervical bg-cervical/15 text-cervical' : 'border-slate-700 text-slate-300'
                  }`}
                >
                  <span className="text-xl">{m.emoji}</span>
                  <span className="text-sm">{m.label}</span>
                </button>
              )
            })}
          </div>
        </Field>

        {/* 颈椎打卡 */}
        <button
          onClick={() => setCervicalDone((v) => !v)}
          className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 ${
            cervicalDone ? 'border-cervical bg-cervical/15' : 'border-slate-700'
          }`}
        >
          <span className="text-sm text-slate-200">已完成颈椎专项</span>
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-md ${
              cervicalDone ? 'bg-cervical text-slate-900' : 'border border-slate-500'
            }`}
          >
            {cervicalDone && <Check size={16} strokeWidth={3} />}
          </span>
        </button>

        {/* 备注 */}
        <Field label="备注（可选）">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="今天状态、重量进步、身体感受…"
            className="w-full resize-none rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-slate-100 placeholder:text-slate-500"
          />
        </Field>

        <button
          onClick={onSave}
          disabled={saved}
          className="w-full rounded-xl bg-cervical py-3.5 font-medium text-slate-900 transition-all active:scale-[0.99] disabled:opacity-70"
        >
          {saved ? '已保存 ✓' : '保存记录'}
        </button>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-300">{label}</label>
      {children}
    </div>
  )
}
