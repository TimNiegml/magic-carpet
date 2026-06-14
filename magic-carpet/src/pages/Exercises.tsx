import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { allExercises } from '../data/exercises'
import { useWorkoutStore } from '../store/workoutStore'
import ExerciseCard from '../components/ExerciseCard'
import PageHeader from '../components/PageHeader'

type Filter = 'all' | 'cervical' | 'strength'

export default function ExercisesPage() {
  const weekPlan = useWorkoutStore((s) => s.weekPlan)
  const [filter, setFilter] = useState<Filter>('all')
  const [q, setQ] = useState('')

  const list = useMemo(() => {
    let arr = allExercises(weekPlan)
    if (filter === 'cervical') arr = arr.filter((e) => e.isCervical)
    if (filter === 'strength') arr = arr.filter((e) => !e.isCervical)
    if (q.trim()) {
      const k = q.trim().toLowerCase()
      arr = arr.filter((e) => e.name.includes(q.trim()) || e.nameEn?.toLowerCase().includes(k))
    }
    return arr
  }, [weekPlan, filter, q])

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'strength', label: '力量' },
    { key: 'cervical', label: '颈椎' },
  ]

  return (
    <div>
      <PageHeader
        title="动作库"
        right={
          <Link to="/plan" className="flex items-center gap-1 text-sm text-cervical">
            <ArrowLeft size={15} /> 返回
          </Link>
        }
      />

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="搜索动作…"
        className="mb-3 w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-slate-100 placeholder:text-slate-500"
      />

      <div className="mb-4 flex gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-3.5 py-1.5 text-sm transition-colors ${
              filter === f.key ? 'bg-cervical text-slate-900' : 'bg-slate-800 text-slate-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <p className="mb-2 text-xs text-slate-500">点击动作展开要领，或点 🔊 让私人助教讲给你听</p>

      <div className="space-y-2">
        {list.map((ex) => (
          <ExerciseCard key={ex.id} exercise={ex} accent={ex.isCervical ? '#06B6D4' : '#3B82F6'} />
        ))}
        {list.length === 0 && <div className="card p-5 text-center text-sm text-slate-400">没有找到匹配的动作</div>}
      </div>
    </div>
  )
}
