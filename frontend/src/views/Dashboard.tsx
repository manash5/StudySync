import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Clock, Flame, Sparkles, Mic, Search, Check, ChevronRight } from 'lucide-react'
import { backendApi, type StudyPlanItem, type Subject } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [tasks, setTasks] = useState<StudyPlanItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchDashboardData = async () => {
    setLoading(true)
    setError('')
    try {
      const [subjectsRes, planRes] = await Promise.all([
        backendApi.get<Subject[]>('/subjects'),
        backendApi.get<StudyPlanItem[]>('/api/study-plan'),
      ])
      setSubjects(subjectsRes)
      setTasks(planRes)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchDashboardData()
  }, [])

  const doneCount = useMemo(() => tasks.filter(t => t.status === 'Completed').length, [tasks])

  const toggleTask = async (id: string) => {
    try {
      const updated = await backendApi.put<StudyPlanItem>(`/study-plan/${id}`, {})
      setTasks(prev => prev.map(item => item._id === id ? updated : item))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task')
    }
  }

  const totalLectures = subjects.reduce((acc, s) => acc + s.totalLectures, 0)
  const completedLectures = subjects.reduce((acc, s) => acc + s.completedLectures, 0)
  const progressRate = totalLectures > 0 ? Math.round((completedLectures / totalLectures) * 100) : 0

  return (
    <div className="max-w-[1400px] mx-auto animate-fade-in pb-12 px-2 md:px-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 mb-10">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] mb-1" style={{ color: 'var(--text-muted)' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <h1 className="text-2xl font-black leading-tight" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text-primary)' }}>
            {getGreeting()}, <span style={{ color: '#3b82f6' }}>{user?.name ?? 'Student'}</span>
          </h1>
          <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--text-muted)' }}>
            You have {Math.max(0, tasks.length - doneCount)} sessions left today.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-1 max-w-xl lg:justify-end">
          <div className="flex-1 relative group">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 z-10 transition-colors" style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search curriculum..."
              className="w-full pl-10 pr-4 py-3 rounded-2xl text-sm font-medium transition-all outline-none"
              style={{ background: 'var(--bg-secondary)', border: '1.5px solid var(--border-color)', color: 'var(--text-primary)' }}
            />
          </div>
          <button
            onClick={() => navigate('/app/lectures')}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl text-white font-black text-xs uppercase tracking-widest transition-all hover:scale-[1.03] active:scale-95 flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #2563eb, #3b82f6)', boxShadow: '0 6px 20px rgba(37,99,235,0.30)' }}
          >
            <Mic size={14} /> Upload
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl px-4 py-3 text-sm" style={{ color: '#ef4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="md:col-span-2 relative overflow-hidden rounded-[28px] p-8"
          style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 60%, #38bdf8 100%)', boxShadow: '0 12px 40px rgba(37,99,235,0.25)' }}>
          <div className="absolute top-0 right-0 w-52 h-52 rounded-full blur-[80px]"
            style={{ background: 'rgba(56,189,248,0.22)', marginRight: '-50px', marginTop: '-50px' }} />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={13} style={{ color: '#bfdbfe' }} />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: '#93c5fd' }}>Live Progress</span>
            </div>
            <h3 className="text-xl font-black mb-2 leading-snug text-white" style={{ fontFamily: 'Sora, sans-serif' }}>
              {completedLectures} of {totalLectures} lectures complete.
            </h3>
            <p className="text-xs font-medium mb-5" style={{ color: 'rgba(191,219,254,0.78)' }}>
              Current completion rate: {progressRate}%
            </p>
            <button
              onClick={() => navigate('/app/study-plan')}
              className="px-5 py-2 rounded-xl font-black text-xs transition-all hover:scale-[1.04] active:scale-95"
              style={{ background: '#e0f2fe', color: '#1e3a8a' }}
            >
              Open Plan
            </button>
          </div>
        </div>

        <div className="relative rounded-[28px] p-7 flex flex-col justify-between overflow-hidden"
          style={{ background: 'var(--bg-secondary)', border: '1.5px solid var(--border-color)' }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-4" style={{ background: 'rgba(59,130,246,0.10)' }}>
            <Clock size={16} style={{ color: '#3b82f6' }} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.15em] mb-1" style={{ color: 'var(--text-muted)' }}>Study Time</p>
            <h4 className="text-3xl font-black" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text-primary)' }}>{user?.totalStudyTime ?? 0}m</h4>
            <p className="text-[11px] font-bold mt-1.5" style={{ color: '#10b981' }}>Total tracked minutes</p>
          </div>
        </div>

        <div className="relative rounded-[28px] p-7 flex flex-col justify-between overflow-hidden"
          style={{ background: 'var(--bg-secondary)', border: '1.5px solid var(--border-color)' }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-4" style={{ background: 'rgba(245,158,11,0.10)' }}>
            <Flame size={16} style={{ color: '#f59e0b' }} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.15em] mb-1" style={{ color: 'var(--text-muted)' }}>Streak</p>
            <h4 className="text-3xl font-black" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text-primary)' }}>{user?.streak ?? 0} Days</h4>
            <p className="text-[11px] font-bold mt-1.5" style={{ color: '#f59e0b' }}>Keep momentum strong</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 rounded-[28px] p-7"
          style={{ background: 'var(--bg-secondary)', border: '1.5px solid var(--border-color)' }}>
          <div className="flex items-center justify-between mb-7">
            <div>
              <h3 className="text-base font-black" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text-primary)' }}>Curriculum Health</h3>
              <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--text-muted)' }}>Progression across your subjects</p>
            </div>
            <button
              onClick={() => navigate('/app/notes')}
              className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl transition-all"
              style={{ background: 'rgba(59,130,246,0.08)', color: '#3b82f6' }}
            >
              Notes <ChevronRight size={12} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {subjects.map(s => {
              const progress = s.totalLectures > 0 ? Math.round((s.completedLectures / s.totalLectures) * 100) : 0
              return (
                <div key={s._id}
                  className="p-5 rounded-[20px] border transition-all group cursor-pointer hover:border-blue-200"
                  style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}
                  onClick={() => navigate(`/app/notes/${encodeURIComponent(s.name)}`)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${s.color}16` }}>
                        <BookOpen size={13} style={{ color: s.color }} />
                      </div>
                      <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{s.name}</span>
                    </div>
                    <span className="text-xs font-black" style={{ color: s.color }}>{progress}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: `${s.color}14` }}>
                    <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${progress}%`, background: s.color }} />
                  </div>
                  <p className="text-[10px] font-semibold mt-2.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--text-muted)' }}>
                    {s.completedLectures}/{s.totalLectures} lectures completed
                  </p>
                </div>
              )
            })}
            {!loading && subjects.length === 0 && (
              <div className="text-sm" style={{ color: 'var(--text-muted)' }}>No subjects yet. Add one from notes flow.</div>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 rounded-[28px] p-7 flex flex-col"
          style={{ background: 'var(--bg-secondary)', border: '1.5px solid var(--border-color)' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-black" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text-primary)' }}>Today's Tasks</h3>
              <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--text-muted)' }}>{doneCount}/{tasks.length} completed</p>
            </div>
          </div>

          <div className="h-1 w-full rounded-full overflow-hidden mb-6" style={{ background: 'var(--bg-tertiary)' }}>
            <div className="h-full rounded-full transition-all duration-700" style={{
              width: `${tasks.length ? (doneCount / tasks.length) * 100 : 0}%`,
              background: 'linear-gradient(90deg, #3b82f6, #06b6d4)',
            }} />
          </div>

          <div className="space-y-3 flex-1">
            {tasks.map(task => {
              const taskDone = task.status === 'Completed'
              const color = task.priority === 'High' ? '#ef4444' : task.priority === 'Medium' ? '#f59e0b' : '#3b82f6'
              return (
                <div
                  key={task._id}
                  className="flex items-center gap-4 p-4 rounded-[18px] border transition-all cursor-pointer group"
                  style={{
                    background: 'var(--bg-primary)',
                    borderColor: taskDone ? 'rgba(16,185,129,0.20)' : 'var(--border-color)',
                    opacity: taskDone ? 0.55 : 1,
                  }}
                  onClick={() => toggleTask(task._id)}
                >
                  <div className="w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all"
                    style={{
                      borderColor: taskDone ? '#10b981' : color,
                      background: taskDone ? '#10b981' : 'transparent',
                    }}>
                    {taskDone && <Check size={13} className="text-white" strokeWidth={3} />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold truncate transition-all ${taskDone ? 'line-through' : ''}`}
                      style={{ color: 'var(--text-primary)' }}>
                      {task.topic}
                    </p>
                    <p className="text-[10px] font-semibold mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {task.subject} · {task.time}
                    </p>
                  </div>

                  {!taskDone && (
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        navigate(`/app/notes/${encodeURIComponent(task.subject)}?lecture=${encodeURIComponent(task.topic)}`)
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: `${color}14`, color }}
                    >
                      <ChevronRight size={14} />
                    </button>
                  )}
                </div>
              )
            })}
            {!loading && tasks.length === 0 && (
              <div className="text-sm" style={{ color: 'var(--text-muted)' }}>No study tasks for today.</div>
            )}
          </div>

          <button
            onClick={() => navigate('/app/study-plan')}
            className="mt-5 w-full py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
            style={{ background: 'rgba(59,130,246,0.07)', border: '1.5px solid var(--border-color)', color: '#3b82f6' }}
          >
            View Full Study Plan
          </button>
        </div>
      </div>
    </div>
  )
}
