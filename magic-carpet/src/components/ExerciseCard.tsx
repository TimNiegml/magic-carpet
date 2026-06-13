import { useState } from 'react'
import { AlertTriangle, ChevronDown, Loader2, Sparkles, Square, Volume2, Wind } from 'lucide-react'
import type { Exercise } from '../types'
import { fetchCoaching, speak, stopSpeaking } from '../lib/coach'

interface Props {
  exercise: Exercise
  done?: boolean
  onToggle?: () => void
  accent?: string // 强调色
}

export default function ExerciseCard({ exercise: ex, done, onToggle, accent = '#3B82F6' }: Props) {
  const [open, setOpen] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [loading, setLoading] = useState(false)

  const hasDetail = !!(ex.steps?.length || ex.mistakes?.length || ex.breathing || ex.cervicalNote)

  async function onCoach() {
    if (speaking || loading) {
      stopSpeaking()
      setSpeaking(false)
      setLoading(false)
      return
    }
    setLoading(true)
    setOpen(true)
    const { text } = await fetchCoaching(ex)
    setLoading(false)
    setSpeaking(true)
    await speak(text)
    setSpeaking(false)
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-3 p-3.5">
        {onToggle && (
          <button
            onClick={onToggle}
            aria-label={done ? '取消完成' : '标记完成'}
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-all ${
              done ? 'border-transparent' : 'border-slate-500'
            }`}
            style={done ? { background: accent } : undefined}
          >
            {done && (
              <svg viewBox="0 0 24 24" className="h-4 w-4 stroke-white" fill="none" strokeWidth={3}>
                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        )}

        <button className="min-w-0 flex-1 text-left" onClick={() => setOpen((o) => !o)}>
          <div className="flex items-center gap-2">
            <span className={`truncate font-medium ${done ? 'text-slate-500 line-through' : 'text-slate-100'}`}>
              {ex.name}
            </span>
            {ex.isCervical && (
              <span className="shrink-0 rounded-full bg-cervical/15 px-1.5 py-0.5 text-[10px] text-cervical">
                颈椎
              </span>
            )}
          </div>
          <div className="mt-0.5 text-xs text-slate-400">
            {ex.sets} 组 × {ex.reps}
            {ex.cue ? ` · ${ex.cue}` : ''}
          </div>
        </button>

        <button
          onClick={onCoach}
          aria-label="语音助教"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cervical/15 text-cervical active:scale-95"
        >
          {loading ? (
            <Loader2 size={17} className="animate-spin" />
          ) : speaking ? (
            <Square size={15} fill="currentColor" />
          ) : (
            <Volume2 size={17} />
          )}
        </button>

        {hasDetail && (
          <button onClick={() => setOpen((o) => !o)} aria-label="展开详情" className="shrink-0 text-slate-500">
            <ChevronDown size={18} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      {open && hasDetail && (
        <div className="space-y-3 border-t border-slate-700/60 px-4 pb-4 pt-3 text-sm">
          {ex.focus && (
            <p className="text-slate-300">
              <span className="text-slate-500">目标：</span>
              {ex.focus}
            </p>
          )}
          {ex.steps?.length ? (
            <div>
              <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-cervical">
                <Sparkles size={13} /> 动作要领
              </div>
              <ol className="list-decimal space-y-1 pl-5 text-slate-300 marker:text-slate-500">
                {ex.steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </div>
          ) : null}
          {ex.breathing && (
            <p className="flex items-start gap-1.5 text-slate-300">
              <Wind size={14} className="mt-0.5 shrink-0 text-sky-400" />
              <span>
                <span className="text-slate-500">呼吸：</span>
                {ex.breathing}
              </span>
            </p>
          )}
          {ex.mistakes?.length ? (
            <div>
              <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-amber-400">
                <AlertTriangle size={13} /> 常见错误
              </div>
              <ul className="list-disc space-y-1 pl-5 text-slate-300 marker:text-amber-500/60">
                {ex.mistakes.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {ex.cervicalNote && (
            <p className="rounded-lg bg-cervical/10 p-2.5 text-cervical">
              <span className="font-medium">颈椎提示 · </span>
              {ex.cervicalNote}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
