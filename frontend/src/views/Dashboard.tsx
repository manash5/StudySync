import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Clock, Flame, Sparkles, Mic, Search, Calendar, Check, ChevronRight, TrendingUp } from 'lucide-react'

const subjects = [
  { name: 'Machine Learning', lectures: 8, completed: 6, progress: 75, color: '#3b82f6' },
  { name: 'Linear Algebra', lectures: 6, completed: 4, progress: 66, color: '#8b5cf6' },
  { name: 'Neural Networks', lectures: 5, completed: 2, progress: 40, color: '#06b6d4' },
  { name: 'Probability Theory', lectures: 7, completed: 5, progress: 71, color: '#10b981' },
]

const todayTasks = [
  { id: 1, subject: 'Machine Learning', topic: 'Gradient Descent', time: '14:00', done: false, color: '#3b82f6' },
  { id: 2, subject: 'Linear Algebra', topic: 'Vectors & Vector Spaces', time: '16:00', done: false, color: '#8b5cf6' },
  { id: 3, subject: 'Neural Networks', topic: 'Perceptrons & Neurons', time: '19:00', done: false, color: '#06b6d4' },
]

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [tasks, setTasks] = useState(todayTasks)

  const toggleTask = (id: number) =>
    setTasks(t => t.map(x => x.id === id ? { ...x, done: !x.done } : x))

  const doneCount = tasks.filter(t => t.done).length

  return (
    <div className="max-w-[1400px] mx-auto animate-fade-in pb-12 px-2 md:px-6">

      {/* ── Greeting + Top Bar ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 mb-10">
        {/* Greeting */}
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] mb-1" style={{ color: 'var(--text-muted)' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <h1 className="text-2xl font-black leading-tight" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text-primary)' }}>
            {getGreeting()}, <span style={{ color: '#3b82f6' }}>Prashant</span> 👋
          </h1>
          <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--text-muted)' }}>
            You have {tasks.length - doneCount} sessions left today. Stay on track!
          </p>
        </div>

        {/* Search + Record */}
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
            <Mic size={14} /> Record
          </button>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">

        {/* Priority Strategy */}
        <div className="md:col-span-2 relative overflow-hidden rounded-[28px] p-8"
          style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 60%, #38bdf8 100%)', boxShadow: '0 12px 40px rgba(37,99,235,0.25)' }}>
          <div className="absolute top-0 right-0 w-52 h-52 rounded-full blur-[80px]"
            style={{ background: 'rgba(56,189,248,0.22)', marginRight: '-50px', marginTop: '-50px' }} />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={13} style={{ color: '#bfdbfe' }} />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: '#93c5fd' }}>Priority Strategy</span>
            </div>
            <h3 className="text-xl font-black mb-2 leading-snug text-white" style={{ fontFamily: 'Sora, sans-serif' }}>
              Master <span style={{ color: '#bfdbfe' }}>Eigenvalues</span> tonight.
            </h3>
            <p className="text-xs font-medium mb-5" style={{ color: 'rgba(191,219,254,0.78)' }}>
              Retention for Linear Algebra is down 14%. Review now to keep your streak.
            </p>
            <button
              onClick={() => navigate('/app/study-plan')}
              className="px-5 py-2 rounded-xl font-black text-xs transition-all hover:scale-[1.04] active:scale-95"
              style={{ background: '#e0f2fe', color: '#1e3a8a' }}
            >
              Start Session
            </button>
          </div>
        </div>

        {/* Time Today */}
        <div className="relative rounded-[28px] p-7 flex flex-col justify-between overflow-hidden"
          style={{ background: 'var(--bg-secondary)', border: '1.5px solid var(--border-color)' }}>
          <div className="absolute bottom-0 right-0 w-20 h-20 rounded-full blur-2xl"
            style={{ background: 'rgba(59,130,246,0.08)', marginRight: '-10px', marginBottom: '-10px' }} />
          <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-4" style={{ background: 'rgba(59,130,246,0.10)' }}>
            <Clock size={16} style={{ color: '#3b82f6' }} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.15em] mb-1" style={{ color: 'var(--text-muted)' }}>Study Time</p>
            <h4 className="text-3xl font-black" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text-primary)' }}>145m</h4>
            <p className="text-[11px] font-bold mt-1.5" style={{ color: '#10b981' }}>+12% vs yesterday</p>
          </div>
        </div>

        {/* Streak */}
        <div className="relative rounded-[28px] p-7 flex flex-col justify-between overflow-hidden"
          style={{ background: 'var(--bg-secondary)', border: '1.5px solid var(--border-color)' }}>
          <div className="absolute bottom-0 right-0 w-20 h-20 rounded-full blur-2xl"
            style={{ background: 'rgba(245,158,11,0.10)', marginRight: '-10px', marginBottom: '-10px' }} />
          <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-4" style={{ background: 'rgba(245,158,11,0.10)' }}>
            <Flame size={16} style={{ color: '#f59e0b' }} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.15em] mb-1" style={{ color: 'var(--text-muted)' }}>Streak</p>
            <h4 className="text-3xl font-black" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text-primary)' }}>7 Days</h4>
            <p className="text-[11px] font-bold mt-1.5" style={{ color: '#f59e0b' }}>Top 5% of Students 🔥</p>
          </div>
        </div>
      </div>

      {/* ── Main Row ── */}
      <div className="grid lg:grid-cols-12 gap-6">

        {/* Curriculum Health */}
        <div className="lg:col-span-7 rounded-[28px] p-7"
          style={{ background: 'var(--bg-secondary)', border: '1.5px solid var(--border-color)' }}>
          <div className="flex items-center justify-between mb-7">
            <div>
              <h3 className="text-base font-black" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text-primary)' }}>Curriculum Health</h3>
              <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--text-muted)' }}>Progression across your core subjects</p>
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
            {subjects.map(s => (
              <div key={s.name}
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
                  <span className="text-xs font-black" style={{ color: s.color }}>{s.progress}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: `${s.color}14` }}>
                  <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${s.progress}%`, background: s.color }} />
                </div>
                <p className="text-[10px] font-semibold mt-2.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--text-muted)' }}>
                  {s.completed}/{s.lectures} lectures completed
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Today's Tasks */}
        <div className="lg:col-span-5 rounded-[28px] p-7 flex flex-col"
          style={{ background: 'var(--bg-secondary)', border: '1.5px solid var(--border-color)' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-black" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text-primary)' }}>Today's Tasks</h3>
              <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--text-muted)' }}>{doneCount}/{tasks.length} completed</p>
            </div>
            <div className="flex items-center gap-1.5">
              {tasks.map((_, i) => (
                <div key={i} className="w-2 h-2 rounded-full transition-all" style={{ background: tasks[i].done ? '#10b981' : 'var(--border-color)' }} />
              ))}
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1 w-full rounded-full overflow-hidden mb-6" style={{ background: 'var(--bg-tertiary)' }}>
            <div className="h-full rounded-full transition-all duration-700" style={{
              width: `${(doneCount / tasks.length) * 100}%`,
              background: 'linear-gradient(90deg, #3b82f6, #06b6d4)',
            }} />
          </div>

          {/* Task list */}
          <div className="space-y-3 flex-1">
            {tasks.map(task => (
              <div
                key={task.id}
                className="flex items-center gap-4 p-4 rounded-[18px] border transition-all cursor-pointer group"
                style={{
                  background: task.done ? 'var(--bg-primary)' : 'var(--bg-primary)',
                  borderColor: task.done ? 'rgba(16,185,129,0.20)' : 'var(--border-color)',
                  opacity: task.done ? 0.55 : 1,
                }}
                onClick={() => toggleTask(task.id)}
              >
                {/* Checkbox */}
                <div className="w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all"
                  style={{
                    borderColor: task.done ? '#10b981' : task.color,
                    background: task.done ? '#10b981' : 'transparent',
                  }}>
                  {task.done && <Check size={13} className="text-white" strokeWidth={3} />}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold truncate transition-all ${task.done ? 'line-through' : ''}`}
                    style={{ color: 'var(--text-primary)' }}>
                    {task.topic}
                  </p>
                  <p className="text-[10px] font-semibold mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {task.subject} · {task.time}
                  </p>
                </div>

                {/* Open notes */}
                {!task.done && (
                  <button
                    onClick={e => { e.stopPropagation(); navigate(`/app/notes/${encodeURIComponent(task.subject)}?lecture=${encodeURIComponent(task.topic)}`) }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${task.color}14`, color: task.color }}
                  >
                    <ChevronRight size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={() => navigate('/app/study-plan')}
            className="mt-5 w-full py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
            style={{ background: 'rgba(59,130,246,0.07)', border: '1.5px solid var(--border-color)', color: '#3b82f6' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#3b82f6'; e.currentTarget.style.color = '#fff' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(59,130,246,0.07)'; e.currentTarget.style.color = '#3b82f6' }}
          >
            View Full Study Plan →
          </button>
        </div>
      </div>
    </div>
  )
}
