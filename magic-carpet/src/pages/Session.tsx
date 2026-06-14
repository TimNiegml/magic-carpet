import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronLeft,
  Mic,
  MicOff,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  Volume2,
} from 'lucide-react'
import type { Exercise, SessionType } from '../types'
import { SESSION_META } from '../types'
import { CERVICAL_EXERCISES } from '../data/exercises'
import { useWorkoutStore } from '../store/workoutStore'
import { buildLocalCoaching, speak, stopSpeaking } from '../lib/coach'
import {
  isSpeechRecognitionSupported,
  playChime,
  useVoiceCommands,
  type VoiceCommand,
} from '../hooks/useVoiceCommands'
import ExerciseDemo from '../components/ExerciseDemo'

type Phase = 'setup' | 'playing' | 'done'
const SEC_OPTIONS = [30, 45, 60, 90]

function fmt(s: number) {
  const m = Math.floor(s / 60)
  const ss = s % 60
  return `${m}:${ss.toString().padStart(2, '0')}`
}

export default function SessionPage() {
  const navigate = useNavigate()
  const weekPlan = useWorkoutStore((s) => s.weekPlan)

  // 可选训练（有动作的健身日）
  const workouts = useMemo(
    () =>
      weekPlan
        .filter((p) => p.exercises.length > 0)
        .map((p) => ({ type: p.sessionType, label: SESSION_META[p.sessionType].label, exercises: p.exercises })),
    [weekPlan],
  )
  const todayType = weekPlan.find((p) => p.dayOfWeek === new Date().getDay())?.sessionType

  const [phase, setPhase] = useState<Phase>('setup')
  const [picked, setPicked] = useState<SessionType>(
    workouts.find((w) => w.type === todayType)?.type ?? workouts[0]?.type ?? 'gym_push',
  )
  const [target, setTarget] = useState(60)
  const [withCervical, setWithCervical] = useState(true)
  const [autoRead, setAutoRead] = useState(true)
  const [voiceOn, setVoiceOn] = useState(false)

  // 播放列表
  const [list, setList] = useState<Exercise[]>([])
  const [idx, setIdx] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(true)
  const [lastHeard, setLastHeard] = useState('')

  const cur = list[idx]
  const meta = SESSION_META[picked]
  const speechSupported = isSpeechRecognitionSupported()

  // —— 计时器 ——
  useEffect(() => {
    if (phase !== 'playing' || !running) return
    const id = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(id)
  }, [phase, running, idx])

  // 到点提醒（只触发一次）
  useEffect(() => {
    if (phase !== 'playing') return
    if (elapsed === target) {
      playChime()
      // 提醒语不含"下一个/继续"等指令词，避免语音识别自触发
      speak('时间到，慢慢把这一组做完，注意呼吸。')
    }
  }, [elapsed, phase, target])

  // 进入新动作：重置计时并自动讲解
  useEffect(() => {
    if (phase !== 'playing') return
    setElapsed(0)
    setRunning(true)
    stopSpeaking()
    if (autoRead && list[idx]) speak(buildLocalCoaching(list[idx]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, phase])

  useEffect(() => () => stopSpeaking(), [])

  // —— 控制 ——
  function start() {
    const ex = [...(withCervical ? CERVICAL_EXERCISES : []), ...(workouts.find((w) => w.type === picked)?.exercises ?? [])]
    if (ex.length === 0) return
    setList(ex)
    setIdx(0)
    setPhase('playing')
  }
  function next() {
    if (idx < list.length - 1) setIdx((i) => i + 1)
    else {
      stopSpeaking()
      setPhase('done')
      speak('训练完成，太棒了！别忘了做做拉伸，记录这次训练。')
    }
  }
  function prev() {
    if (idx > 0) setIdx((i) => i - 1)
  }
  function restartTimer() {
    setElapsed(0)
    setRunning(true)
  }
  function replay() {
    if (cur) speak(buildLocalCoaching(cur))
  }

  // 语音指令（防抖：同一动作 1.2s 内只响应一次）
  const lastActed = useRef(0)
  function onCommand(cmd: VoiceCommand, raw: string) {
    setLastHeard(raw)
    const now = Date.now()
    if (now - lastActed.current < 1200) return
    lastActed.current = now
    if (cmd === 'next') next()
    else if (cmd === 'prev') prev()
    else if (cmd === 'pause') setRunning(false)
    else if (cmd === 'resume') setRunning(true)
  }
  useVoiceCommands(voiceOn && phase === 'playing', onCommand)

  // ──────────────── setup ────────────────
  if (phase === 'setup') {
    return (
      <div>
        <button onClick={() => navigate(-1)} className="mb-3 flex items-center gap-1 text-sm text-slate-400">
          <ChevronLeft size={16} /> 返回
        </button>
        <h1 className="mb-1 text-xl font-semibold text-slate-100">引导训练</h1>
        <p className="mb-5 text-sm text-slate-400">教练带着练：自动讲解 + 计时提醒，说「下一个」即可切换动作。</p>

        <div className="mb-5">
          <div className="mb-2 text-sm font-medium text-slate-300">选择训练</div>
          <div className="grid grid-cols-3 gap-2">
            {workouts.map((w) => {
              const m = SESSION_META[w.type]
              const active = picked === w.type
              return (
                <button
                  key={w.type}
                  onClick={() => setPicked(w.type)}
                  className="rounded-xl border py-2.5 text-sm transition-all"
                  style={
                    active
                      ? { background: m.color, borderColor: m.color, color: '#fff' }
                      : { background: m.tint, borderColor: 'transparent', color: '#cbd5e1' }
                  }
                >
                  {w.label}
                  <span className="mt-0.5 block text-[11px] opacity-80">{w.exercises.length} 动作</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="mb-5">
          <div className="mb-2 text-sm font-medium text-slate-300">每个动作时长</div>
          <div className="grid grid-cols-4 gap-2">
            {SEC_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setTarget(s)}
                className={`rounded-xl border py-2.5 text-sm transition-all ${
                  target === s ? 'border-cervical bg-cervical/15 text-cervical' : 'border-slate-700 text-slate-300'
                }`}
              >
                {s}s
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-slate-500">到点会提示音 + 语音提醒；你可以慢慢做，做完说「下一个」再切换。</p>
        </div>

        <div className="mb-6 space-y-2">
          <Toggle label="先做颈椎热身（5 动作）" on={withCervical} onChange={setWithCervical} />
          <Toggle label="自动语音讲解动作要领" on={autoRead} onChange={setAutoRead} />
          <Toggle
            label={speechSupported ? '语音指令（说「下一个」切换）' : '语音指令（当前浏览器不支持）'}
            on={voiceOn}
            onChange={setVoiceOn}
            disabled={!speechSupported}
          />
        </div>

        <button
          onClick={start}
          className="w-full rounded-xl bg-cervical py-3.5 font-medium text-slate-900 active:scale-[0.99]"
        >
          开始训练
        </button>
      </div>
    )
  }

  // ──────────────── done ────────────────
  if (phase === 'done') {
    return (
      <div className="flex flex-col items-center pt-10 text-center">
        <div className="mb-4 text-5xl">🎉</div>
        <h1 className="text-2xl font-semibold text-slate-100">训练完成！</h1>
        <p className="mt-2 text-sm text-slate-400">
          共 {list.length} 个动作 · {meta.label}
        </p>
        <div className="mt-8 w-full space-y-2">
          <button onClick={() => navigate('/log')} className="w-full rounded-xl bg-cervical py-3.5 font-medium text-slate-900">
            去记录这次训练
          </button>
          <button onClick={() => setPhase('setup')} className="w-full rounded-xl border border-slate-700 py-3 text-slate-200">
            再来一次
          </button>
          <button onClick={() => navigate('/')} className="w-full py-3 text-sm text-slate-400">
            返回今日
          </button>
        </div>
      </div>
    )
  }

  // ──────────────── playing ────────────────
  const remaining = target - elapsed
  const overtime = remaining < 0
  const pct = Math.min(elapsed / target, 1) * 100
  const nextEx = list[idx + 1]

  return (
    <div className="flex min-h-[80vh] flex-col">
      {/* 顶栏 */}
      <div className="mb-3 flex items-center justify-between">
        <button onClick={() => setPhase('setup')} className="flex items-center gap-1 text-sm text-slate-400">
          <ChevronLeft size={16} /> 结束
        </button>
        <span className="text-sm text-slate-400">
          {idx + 1} / {list.length}
        </span>
        <button
          onClick={() => speechSupported && setVoiceOn((v) => !v)}
          disabled={!speechSupported}
          className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${
            voiceOn ? 'bg-cervical/20 text-cervical' : 'bg-slate-700 text-slate-300'
          } ${!speechSupported ? 'opacity-40' : ''}`}
        >
          {voiceOn ? <Mic size={13} /> : <MicOff size={13} />}
          {voiceOn ? '听取中' : '语音'}
        </button>
      </div>

      {/* 进度条 */}
      <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-slate-700">
        <div className="h-full rounded-full bg-cervical transition-all" style={{ width: `${((idx + 1) / list.length) * 100}%` }} />
      </div>

      {/* 当前动作 */}
      <div className="text-center">
        <div className="mb-1 flex items-center justify-center gap-2">
          {cur?.isCervical && <span className="rounded-full bg-cervical/15 px-2 py-0.5 text-[11px] text-cervical">颈椎</span>}
          <h2 className="text-2xl font-semibold text-slate-100">{cur?.name}</h2>
        </div>
        <p className="text-sm text-slate-400">
          {cur?.sets} 组 × {cur?.reps}
        </p>
      </div>

      {/* 示范 */}
      {cur && (
        <div className="mx-auto mt-4 w-full max-w-[260px]">
          <ExerciseDemo id={cur.id} gifUrl={cur.gifUrl} name={cur.name} />
        </div>
      )}

      {cur?.cue && <p className="mt-3 text-center text-sm text-slate-300">{cur.cue}</p>}

      {/* 计时器 */}
      <div className="my-6 text-center">
        <div className={`text-6xl font-bold tabular-nums ${overtime ? 'text-amber-400' : 'text-slate-100'}`}>
          {overtime ? fmt(-remaining) : fmt(remaining)}
        </div>
        <div className="mt-1 text-xs text-slate-500">{overtime ? '超时 · 做完说「下一个」' : running ? '计时中' : '已暂停'}</div>
        <div className="mx-auto mt-3 h-1.5 max-w-[260px] overflow-hidden rounded-full bg-slate-700">
          <div
            className={`h-full rounded-full transition-all ${overtime ? 'bg-amber-400' : 'bg-cervical'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* 语音回显 */}
      {voiceOn && lastHeard && <p className="mb-3 text-center text-xs text-slate-500">听到：「{lastHeard}」</p>}

      {/* 控制 */}
      <div className="mt-auto">
        <div className="mb-3 flex items-center justify-center gap-3">
          <CtrlBtn onClick={restartTimer} icon={<RotateCcw size={18} />} label="重计时" />
          <CtrlBtn onClick={replay} icon={<Volume2 size={18} />} label="重听" />
        </div>
        <div className="flex items-center justify-center gap-4">
          <button onClick={prev} disabled={idx === 0} className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-700 text-slate-200 disabled:opacity-30">
            <SkipBack size={20} />
          </button>
          <button
            onClick={() => setRunning((r) => !r)}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-cervical text-slate-900"
          >
            {running ? <Pause size={26} /> : <Play size={26} />}
          </button>
          <button onClick={next} className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-700 text-slate-200">
            <SkipForward size={20} />
          </button>
        </div>
        <p className="mt-3 text-center text-xs text-slate-500">
          下一个：{nextEx ? nextEx.name : '最后一个动作，完成即结束'}
        </p>
      </div>
    </div>
  )
}

function Toggle({
  label,
  on,
  onChange,
  disabled,
}: {
  label: string
  on: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={() => !disabled && onChange(!on)}
      disabled={disabled}
      className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left ${
        on ? 'border-cervical bg-cervical/10' : 'border-slate-700'
      } ${disabled ? 'opacity-40' : ''}`}
    >
      <span className="text-sm text-slate-200">{label}</span>
      <span className={`relative h-6 w-10 rounded-full transition-colors ${on ? 'bg-cervical' : 'bg-slate-600'}`}>
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${on ? 'left-[18px]' : 'left-0.5'}`}
        />
      </span>
    </button>
  )
}

function CtrlBtn({ onClick, icon, label }: { onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1.5 rounded-full bg-slate-800 px-3.5 py-2 text-xs text-slate-300">
      {icon}
      {label}
    </button>
  )
}
