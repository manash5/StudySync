import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BookOpen, Clock, Flame, Mic, Search, Check,
  ChevronRight, Plus, ArrowRight, Brain, AlertTriangle,
  FileText, RotateCcw,
} from 'lucide-react'
import { backendApi, type StudyPlanItem, type Subject } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'

// ── Types ────────────────────────────────────────────────────────────────────

interface Note {
  _id: string
  title: string
  mainTopic: string
  reviewed: boolean
  reviewCount: number
  retentionRate?: number
  createdAt: string
  subjectId: { _id: string; name: string; color: string } | string
}

interface StudyStats {
  total: number
  completed: number
  pending: number
  completionRate: number
}

interface RetentionItem {
  noteId?: string
  subject: string
  title: string
  retentionRate: number
  nextReviewDays?: number
}

interface GenerateResponse {
  plans: StudyPlanItem[]
  retention: RetentionItem[]
  lowRetentionNotes: RetentionItem[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function retentionColor(r: number) {
  if (r < 50) return '#ef4444'
  if (r < 75) return '#f59e0b'
  return '#10b981'
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatPill({ icon, value, label, color }: { icon: React.ReactNode; value: string; label: string; color: string }) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl"
      style={{ background: `${color}10`, border: `1.5px solid ${color}25` }}>
      {icon}
      <span className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>{value}</span>
      <span className="text-[10px] font-black uppercase tracking-widest" style={{ color }}>{label}</span>
    </div>
  )
}

function RetentionRow({ item }: { item: RetentionItem }) {
  const color = retentionColor(item.retentionRate)
  return (
    <div className="flex items-center gap-3 py-2.5 border-b last:border-b-0"
      style={{ borderColor: 'var(--border-color)' }}>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[11px] font-bold truncate" style={{ color: 'var(--text-primary)', maxWidth: '70%' }}>
            {item.title}
          </span>
          <span className="text-[11px] font-black tabular-nums" style={{ color }}>{item.retentionRate.toFixed(0)}%</span>
        </div>
        <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
          <div className="h-full rounded-full transition-all duration-1000"
            style={{ width: `${item.retentionRate}%`, background: color }} />
        </div>
        <p className="text-[9px] font-semibold mt-1" style={{ color: 'var(--text-muted)' }}>
          {item.subject}{item.nextReviewDays ? ` · review in ${item.nextReviewDays}d` : ''}
        </p>
      </div>
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [subjects, setSubjects] = useState<Subject[]>([])
  const [tasks, setTasks] = useState<StudyPlanItem[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [stats, setStats] = useState<StudyStats | null>(null)
  const [retention, setRetention] = useState<RetentionItem[]>([])
  const [lowRetention, setLowRetention] = useState<RetentionItem[]>([])
  const [generating, setGenerating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [subjectsRes, planRes, notesRes, statsRes] = await Promise.all([
          backendApi.get<Subject[]>('/subjects'),
          backendApi.get<StudyPlanItem[]>('/study-plan'),
          backendApi.get<Note[]>('/notes'),
          backendApi.get<StudyStats>('/study-plan/stats').catch(() => null),
        ])
        setSubjects(subjectsRes)
        setTasks(planRes)
        setNotes(notesRes)
        if (statsRes) setStats(statsRes)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  const doneCount = useMemo(() => tasks.filter(t => t.status === 'Completed').length, [tasks])
  const totalLectures = subjects.reduce((a, s) => a + s.totalLectures, 0)
  const completedLectures = subjects.reduce((a, s) => a + s.completedLectures, 0)
  const reviewedNotes = notes.filter(n => n.reviewed).length

  const hasStudyTime = (user?.totalStudyTime ?? 0) > 0
  const hasStreak = (user?.streak ?? 0) > 0
  const hasTasks = tasks.length > 0

  const toggleTask = async (id: string) => {
    try {
      const updated = await backendApi.put<StudyPlanItem>(`/study-plan/${id}`, {})
      setTasks(prev => prev.map(item => item._id === id ? updated : item))
    } catch { }
  }

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const res = await backendApi.post<GenerateResponse>('/study-plan/generate', {})
      setTasks(res.plans)
      setRetention(res.retention)
      setLowRetention(res.lowRetentionNotes)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate')
    } finally {
      setGenerating(false)
    }
  }

  // Notes grouped by subject for mini insight
  const notesBySubject = useMemo(() => {
    const map: Record<string, number> = {}
    notes.forEach(n => {
      const name = typeof n.subjectId === 'object' ? n.subjectId.name : 'General'
      map[name] = (map[name] ?? 0) + 1
    })
    return map
  }, [notes])

  const retentionToShow = retention.slice(0, 5)

  return (
    <div className="max-w-[1400px] mx-auto pb-12 px-2 md:px-6" style={{ animation: 'fadeIn 0.35s ease' }}>

      {/* ── Header ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 mb-8">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] mb-1" style={{ color: 'var(--text-muted)' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <h1 className="text-2xl font-black leading-tight" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text-primary)' }}>
            {getGreeting()}, <span style={{ color: '#3b82f6' }}>{user?.name ?? 'Student'}</span>
          </h1>
          <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {hasTasks
              ? `${Math.max(0, tasks.length - doneCount)} tasks remaining today`
              : 'Generate a plan to start your day'}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-1 max-w-xl lg:justify-end">
          <div className="flex-1 relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search curriculum..."
              className="w-full pl-10 pr-4 py-3 rounded-2xl text-sm font-medium outline-none"
              style={{ background: 'var(--bg-secondary)', border: '1.5px solid var(--border-color)', color: 'var(--text-primary)' }}
            />
          </div>
          <button
            onClick={() => navigate('/app/lectures')}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl text-white font-black text-xs uppercase tracking-widest hover:scale-[1.03] active:scale-95 transition-all flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #2563eb, #3b82f6)', boxShadow: '0 6px 20px rgba(37,99,235,0.28)' }}
          >
            <Mic size={14} /> Upload
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-5 rounded-xl px-4 py-3 text-sm flex items-center gap-2"
          style={{ color: '#ef4444', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)' }}>
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {/* ── Low Retention Alert ── */}
      {lowRetention.length > 0 && (
        <div className="mb-5 flex items-center gap-4 px-5 py-3.5 rounded-[20px]"
          style={{ background: 'rgba(239,68,68,0.06)', border: '1.5px solid rgba(239,68,68,0.18)' }}>
          <AlertTriangle size={15} style={{ color: '#ef4444', flexShrink: 0 }} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black" style={{ color: '#ef4444' }}>
              {lowRetention.length} note{lowRetention.length > 1 ? 's' : ''} need urgent review
            </p>
            <p className="text-[10px] font-medium truncate" style={{ color: 'var(--text-muted)' }}>
              {lowRetention.slice(0, 3).map(n => n.title).join(' · ')}
              {lowRetention.length > 3 ? ` +${lowRetention.length - 3} more` : ''}
            </p>
          </div>
          <button onClick={() => navigate('/app/study-plan')}
            className="text-[11px] font-black px-4 py-1.5 rounded-xl flex-shrink-0 transition-all hover:scale-[1.03]"
            style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
            Review
          </button>
        </div>
      )}

      {/* ── Stat Pills ── */}
      <div className="flex flex-wrap gap-3 mb-8">
        {notes.length > 0 && (
          <StatPill
            icon={<FileText size={14} style={{ color: '#8b5cf6' }} />}
            value={String(notes.length)}
            label="Notes"
            color="#8b5cf6"
          />
        )}
        {reviewedNotes > 0 && (
          <StatPill
            icon={<RotateCcw size={14} style={{ color: '#10b981' }} />}
            value={`${reviewedNotes}/${notes.length}`}
            label="Reviewed"
            color="#10b981"
          />
        )}
        {stats && stats.total > 0 && (
          <StatPill
            icon={<Check size={14} style={{ color: '#3b82f6' }} />}
            value={`${stats.completionRate}%`}
            label="Plan Rate"
            color="#3b82f6"
          />
        )}
        {totalLectures > 0 && (
          <StatPill
            icon={<BookOpen size={14} style={{ color: '#06b6d4' }} />}
            value={`${completedLectures}/${totalLectures}`}
            label="Lectures"
            color="#06b6d4"
          />
        )}
        {hasStudyTime && (
          <StatPill
            icon={<Clock size={14} style={{ color: '#10b981' }} />}
            value={`${user?.totalStudyTime}m`}
            label="Study Time"
            color="#10b981"
          />
        )}
        {hasStreak && (
          <StatPill
            icon={<Flame size={14} style={{ color: '#f59e0b' }} />}
            value={`${user?.streak}d`}
            label="Streak"
            color="#f59e0b"
          />
        )}
      </div>

      {/* ── Row 1: Subjects + Tasks ── */}
      <div className="grid lg:grid-cols-12 gap-6 mb-6">

        {/* Subjects */}
        <div className="lg:col-span-8 rounded-[28px] p-7"
          style={{ background: 'var(--bg-secondary)', border: '1.5px solid var(--border-color)' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-black" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text-primary)' }}>
                Your Subjects
              </h3>
              <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {subjects.length} subject{subjects.length !== 1 ? 's' : ''} · {notes.length} notes total
              </p>
            </div>
            <button onClick={() => navigate('/app/notes')}
              className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl"
              style={{ background: 'rgba(59,130,246,0.08)', color: '#3b82f6' }}>
              Notes <ChevronRight size={12} />
            </button>
          </div>

          {subjects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {subjects.map(s => {
                const progress = s.totalLectures > 0
                  ? Math.round((s.completedLectures / s.totalLectures) * 100) : 0
                const noteCount = notesBySubject[s.name] ?? 0
                return (
                  <div key={s._id}
                    className="p-5 rounded-[20px] border cursor-pointer group transition-all hover:shadow-md"
                    style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}
                    onClick={() => navigate(`/app/notes/${encodeURIComponent(s.name)}`)}>
                    {/* color stripe */}
                    <div className="h-1 w-full rounded-full mb-4" style={{ background: `${s.color}22` }}>
                      {s.totalLectures > 0 && (
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${progress}%`, background: s.color }} />
                      )}
                    </div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: `${s.color}18` }}>
                          <BookOpen size={14} style={{ color: s.color }} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>{s.name}</p>
                          <p className="text-[10px] font-semibold mt-0.5" style={{ color: 'var(--text-muted)' }}>
                            {s.totalLectures > 0
                              ? `${s.completedLectures}/${s.totalLectures} lectures · ${progress}%`
                              : noteCount > 0
                                ? `${noteCount} note${noteCount !== 1 ? 's' : ''}`
                                : 'No content yet'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {noteCount > 0 && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
                            style={{ background: `${s.color}14`, color: s.color }}>
                            {noteCount} notes
                          </span>
                        )}
                        <ArrowRight size={13} className="opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ color: s.color }} />
                      </div>
                    </div>
                    {s.totalLectures === 0 && noteCount === 0 && (
                      <button
                        onClick={e => { e.stopPropagation(); navigate('/app/lectures') }}
                        className="mt-4 w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                        style={{ background: `${s.color}0d`, color: s.color, border: `1px dashed ${s.color}50` }}>
                        + Upload First Lecture
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          ) : !loading && (
            <div className="flex flex-col items-center py-14 text-center">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: 'rgba(59,130,246,0.08)' }}>
                <BookOpen size={22} style={{ color: '#3b82f6' }} />
              </div>
              <p className="text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>No subjects yet</p>
              <p className="text-xs mb-5" style={{ color: 'var(--text-muted)' }}>Add your first subject to get started</p>
              <button onClick={() => navigate('/app/notes')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-black text-xs"
                style={{ background: '#3b82f6' }}>
                <Plus size={13} /> Add Subject
              </button>
            </div>
          )}
        </div>

        {/* Tasks */}
        <div className="lg:col-span-4 rounded-[28px] p-7 flex flex-col"
          style={{ background: 'var(--bg-secondary)', border: '1.5px solid var(--border-color)' }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-black" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text-primary)' }}>
                Today's Tasks
              </h3>
              <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {hasTasks ? `${doneCount}/${tasks.length} done` : 'No tasks yet'}
              </p>
            </div>
            {hasTasks && (
              <span className="text-[11px] font-black px-2.5 py-1 rounded-xl"
                style={{ background: 'rgba(59,130,246,0.08)', color: '#3b82f6' }}>
                {Math.round((doneCount / tasks.length) * 100)}%
              </span>
            )}
          </div>

          {hasTasks && (
            <div className="h-1 w-full rounded-full overflow-hidden mb-5" style={{ background: 'var(--bg-tertiary)' }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${(doneCount / tasks.length) * 100}%`, background: 'linear-gradient(90deg, #3b82f6, #06b6d4)' }} />
            </div>
          )}

          <div className="space-y-2.5 flex-1 overflow-y-auto" style={{ maxHeight: 320 }}>
            {tasks.map(task => {
              const done = task.status === 'Completed'
              const color = task.priority === 'High' ? '#ef4444' : task.priority === 'Medium' ? '#f59e0b' : '#3b82f6'
              return (
                <div key={task._id}
                  className="flex items-center gap-3 p-3.5 rounded-[16px] border cursor-pointer group transition-all"
                  style={{
                    background: 'var(--bg-primary)',
                    borderColor: done ? 'rgba(16,185,129,0.20)' : 'var(--border-color)',
                    opacity: done ? 0.5 : 1,
                  }}
                  onClick={() => toggleTask(task._id)}>
                  <div className="w-5 h-5 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all"
                    style={{ borderColor: done ? '#10b981' : color, background: done ? '#10b981' : 'transparent' }}>
                    {done && <Check size={11} className="text-white" strokeWidth={3} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[12px] font-bold truncate ${done ? 'line-through' : ''}`}
                      style={{ color: 'var(--text-primary)' }}>{task.topic}</p>
                    <p className="text-[9px] font-semibold mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {task.subject} · {task.time}
                    </p>
                  </div>
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                </div>
              )
            })}

            {!hasTasks && !loading && (
              <div className="flex flex-col items-center py-8 text-center">
                <Brain size={26} className="mb-2 opacity-20" style={{ color: 'var(--text-primary)' }} />
                <p className="text-xs font-bold mb-0.5" style={{ color: 'var(--text-primary)' }}>No tasks yet</p>
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Generate a plan from your notes</p>
              </div>
            )}
          </div>

          <div className="mt-5 flex flex-col gap-2">
            <button
              onClick={handleGenerate}
              disabled={generating || notes.length === 0}
              className="w-full py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #2563eb, #3b82f6)', color: 'white', boxShadow: '0 4px 14px rgba(37,99,235,0.25)' }}>
              {generating ? 'Generating…' : hasTasks ? 'Regenerate Plan' : 'Generate Study Plan'}
            </button>
            {hasTasks && (
              <button onClick={() => navigate('/app/study-plan')}
                className="w-full py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
                style={{ background: 'rgba(59,130,246,0.07)', border: '1.5px solid var(--border-color)', color: '#3b82f6' }}>
                View Full Plan
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Row 2: Notes snapshot + Memory Health ── */}
      {notes.length > 0 && (
        <div className="grid lg:grid-cols-12 gap-6">

          {/* Recent Notes */}
          <div className="lg:col-span-7 rounded-[28px] p-7"
            style={{ background: 'var(--bg-secondary)', border: '1.5px solid var(--border-color)' }}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-black" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text-primary)' }}>
                  Recent Notes
                </h3>
                <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {reviewedNotes} of {notes.length} reviewed
                </p>
              </div>
              <button onClick={() => navigate('/app/notes')}
                className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl"
                style={{ background: 'rgba(139,92,246,0.08)', color: '#8b5cf6' }}>
                All <ChevronRight size={12} />
              </button>
            </div>

            <div className="space-y-2">
              {notes.slice(0, 5).map(note => {
                const subjectName = typeof note.subjectId === 'object' ? note.subjectId.name : 'General'
                const subjectColor = typeof note.subjectId === 'object' ? note.subjectId.color : '#3b82f6'
                return (
                  <div key={note._id}
                    className="flex items-center gap-3 p-3.5 rounded-[16px] border cursor-pointer group transition-all hover:shadow-sm"
                    style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}
                    onClick={() => navigate('/app/notes')}>
                    <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${subjectColor}14` }}>
                      <FileText size={12} style={{ color: subjectColor }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                        {note.title}
                      </p>
                      <p className="text-[10px] font-semibold mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {subjectName} · {note.mainTopic}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {note.reviewed && (
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(16,185,129,0.10)', color: '#10b981' }}>
                          Reviewed
                        </span>
                      )}
                      {note.reviewCount > 0 && (
                        <span className="text-[9px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                          ×{note.reviewCount}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          
        </div>
      )}

      <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:none } }`}</style>
    </div>
  )
}