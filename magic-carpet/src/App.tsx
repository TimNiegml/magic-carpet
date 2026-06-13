import { Suspense, lazy } from 'react'
import { NavLink, Route, Routes } from 'react-router-dom'
import { CalendarDays, Dumbbell, Home as HomeIcon, ListChecks, TrendingUp } from 'lucide-react'
import HomePage from './pages/Home'

const SchedulePage = lazy(() => import('./pages/Schedule'))
const LogPage = lazy(() => import('./pages/Log'))
const HistoryPage = lazy(() => import('./pages/History'))
const ProgressPage = lazy(() => import('./pages/Progress'))
const PlanPage = lazy(() => import('./pages/Plan'))
const ExercisesPage = lazy(() => import('./pages/Exercises'))

const tabs = [
  { to: '/', label: '今日', icon: HomeIcon, end: true },
  { to: '/schedule', label: '周计划', icon: CalendarDays, end: false },
  { to: '/log', label: '记录', icon: ListChecks, end: false },
  { to: '/progress', label: '进展', icon: TrendingUp, end: false },
  { to: '/plan', label: '计划', icon: Dumbbell, end: false },
]

export default function App() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-slate-900/40">
      <main className="flex-1 px-4 pb-24 pt-5">
        <Suspense fallback={<div className="py-20 text-center text-sm text-slate-500">加载中…</div>}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="/log" element={<LogPage />} />
          <Route path="/log/history" element={<HistoryPage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/plan" element={<PlanPage />} />
          <Route path="/exercises" element={<ExercisesPage />} />
        </Routes>
        </Suspense>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-700/70 bg-slate-900/95 backdrop-blur">
        <div className="mx-auto grid max-w-md grid-cols-5">
          {tabs.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-2.5 text-[11px] transition-colors ${
                  isActive ? 'text-cervical' : 'text-slate-400'
                }`
              }
            >
              <Icon size={20} strokeWidth={1.8} />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
