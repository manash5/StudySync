import { useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Sparkles,
  WandSparkles,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  Brain,
  Clock,
  TrendingUp,
  Calendar,
  Save,
  ListTodo,
  Loader2,
  Trash2,
} from 'lucide-react'
import { backendApi, aiApi, type NoteItem, type RoutineItem, type StudyPlanItem } from '../lib/api'

// ── Types matching study_plan.py response ─────────────────────────────────────

type RetentionItem = {
  noteId: string
  subject: string
  title: string
  retentionRate: number
  nextReviewDays: number
}

type StudySession = {
  noteId: string | null
  subject: string
  topic: string
  day: string
  start_time: string
  end_time: string
  priority: 'High' | 'Medium' | 'Low'
  color: string
  retention_rate: number
  reason: string | null
}

type GeneratedPlan = {
  retention_by_note: RetentionItem[]
  low_retention_notes: RetentionItem[]
  sessions: StudySession[]
}

// ── Note / Routine shapes expected by FastAPI study_plan.py ──────────────────

interface StudyPlanNote {
  id: string
  subjectId: string
  subject: string
  title: string
  mainTopic: string
  createdAt: string
  reviewed: boolean
  lastReviewedAt: string | null
  reviewCount: number
  retentionRate: number | null
}

interface StudyPlanRoutine {
  id: string
  subject: string
  day: string
  startTime: string
  endTime: string
  type: 'class' | 'study'
  color: string
  status: 'active' | 'cancelled' | 'paused'
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const PRIORITY_STYLES: Record<string, { accent: string; bg: string; badge: string; text: string }> = {
  High:   { accent: '#E24B4A', bg: 'rgba(226,75,74,0.07)',   badge: '#FCEBEB', text: '#A32D2D' },
  Medium: { accent: '#EF9F27', bg: 'rgba(239,159,39,0.07)',  badge: '#FAEEDA', text: '#854F0B' },
  Low:    { accent: '#639922', bg: 'rgba(99,153,34,0.07)',   badge: '#EAF3DE', text: '#3B6D11' },
}

function retentionColor(rate: number, threshold: number) {
  if (rate < threshold) return { bar: '#E24B4A', text: '#A32D2D', badge: '#FCEBEB' }
  if (rate < 75)        return { bar: '#EF9F27', text: '#854F0B', badge: '#FAEEDA' }
  return                       { bar: '#639922', text: '#3B6D11', badge: '#EAF3DE' }
}

/** MongoDB NoteItem → FastAPI StudyPlanNote */
function mapNote(note: NoteItem): StudyPlanNote {
  return {
    id:             note._id,
    subjectId:      typeof note.subjectId === 'string'
                      ? note.subjectId
                      : (note.subjectId as { _id: string })?._id ?? '',
    subject:        typeof note.subjectId === 'object' && note.subjectId !== null
                      ? (note.subjectId as { name: string }).name
                      : String(note.subjectId ?? ''),
    title:          note.title,
    mainTopic:      note.mainTopic ?? note.title,
    createdAt:      note.createdAt,
    reviewed:       note.reviewed ?? false,
    lastReviewedAt: note.lastReviewedAt ?? null,
    reviewCount:    note.reviewCount ?? 0,
    retentionRate:  null,  // let Python recompute fresh
  }
}

/** MongoDB RoutineItem → FastAPI StudyPlanRoutine */
function mapRoutine(r: RoutineItem): StudyPlanRoutine {
  return {
    id:        r._id,
    subject:   r.subject,
    day:       r.day,
    startTime: r.startTime,
    endTime:   r.endTime,
    type:      r.type ?? 'class',
    color:     r.color ?? '#10b981',
    status:    r.status ?? 'active',
  }
}

/**
 * Convert a day name + HH:MM time string to the nearest upcoming ISO date string.
 * e.g. ('Monday', '14:00') → '2025-04-28T14:00:00.000Z'
 */
function dayTimeToDate(day: string, time: string): string {
  const today = new Date()
  const todayDow = today.getDay()                         // 0=Sun
  const targetDow = DAY_ORDER.indexOf(day) + 1            // Mon=1 … Sun=7→0
  const normalizedTarget = targetDow === 7 ? 0 : targetDow
  let diff = normalizedTarget - todayDow
  if (diff < 0) diff += 7
  const target = new Date(today)
  target.setDate(today.getDate() + diff)
  const [h, m] = time.split(':').map(Number)
  target.setHours(h, m, 0, 0)
  return target.toISOString()
}

function RetentionBar({ rate, color }: { rate: number; color: string }) {
  return (
    <div style={{ flex: 1, height: '5px', background: 'var(--bg-tertiary)', borderRadius: '99px', overflow: 'hidden' }}>
      <div style={{
        width: `${Math.min(rate, 100)}%`, height: '100%', background: color,
        borderRadius: '99px', transition: 'width 0.6s ease',
      }} />
    </div>
  )
}

function StatCard({ label, value, warn }: { label: string; value: string | number; warn?: boolean }) {
  return (
    <div style={{ background: 'rgba(0,0,0,0.18)', borderRadius: '12px', padding: '10px 12px', textAlign: 'center' }}>
      <div style={{ fontSize: '18px', fontWeight: 900, color: warn && Number(value) > 0 ? '#fca5a5' : '#fff' }}>
        {value}
      </div>
      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        {label}
      </div>
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

type MainTab = 'ai' | 'saved'
type SubTab  = 'sessions' | 'retention'

export default function StudyPlan() {
  const navigate = useNavigate()

  // AI-generated plan state
  const [plan, setPlan] = useState<GeneratedPlan | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())  // track which AI sessions were saved
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())

  // MongoDB saved plans state
  const [savedPlans, setSavedPlans] = useState<StudyPlanItem[]>([])
  const [isLoadingSaved, setIsLoadingSaved] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // UI
  const [mainTab, setMainTab]   = useState<MainTab>('ai')
  const [subTab, setSubTab]     = useState<SubTab>('sessions')
  const [error, setError]       = useState('')
  const [saveMsg, setSaveMsg]   = useState('')

  const THRESHOLD = 50

  // ── Fetch saved plans from MongoDB ────────────────────────────────────────
  const loadSavedPlans = useCallback(async () => {
    setIsLoadingSaved(true)
    try {
      const data = await backendApi.get<StudyPlanItem[]>('/study-plan')
      setSavedPlans(data)
    } catch {
      // non-critical — tab shows empty state
    } finally {
      setIsLoadingSaved(false)
    }
  }, [])

  // ── AI: generate plan via FastAPI ─────────────────────────────────────────
  const generatePlan = useCallback(async () => {
    setIsGenerating(true)
    setError('')
    setSavedIds(new Set())
    try {
      const [rawNotes, rawRoutines] = await Promise.all([
        backendApi.get<NoteItem[]>('/notes').catch(() => [] as NoteItem[]),
        backendApi.get<RoutineItem[]>('/routine').catch(() => [] as RoutineItem[]),
      ])

      const result = await aiApi.post<GeneratedPlan>('/study-plan/generate', {
        notes:    rawNotes.map(mapNote),
        routines: rawRoutines.map(mapRoutine),
        study_window_start:           '10:00',
        study_window_end:             '21:00',
        minimum_retention_threshold:  THRESHOLD,
      })

      setPlan(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate study plan')
    } finally {
      setIsGenerating(false)
    }
  }, [])

  // ── Save a single AI session → MongoDB ───────────────────────────────────
  const saveSession = async (session: StudySession, cardKey: string) => {
    setIsSaving(true)
    setSaveMsg('')
    try {
      await backendApi.post('/study-plan', {
        subject:  session.subject,
        topic:    session.topic,
        time:     `${session.start_time} – ${session.end_time}`,
        status:   'Pending',
        priority: session.priority,
        date:     dayTimeToDate(session.day, session.start_time),
        source:   'generated',
        ...(session.noteId ? { noteId: session.noteId } : {}),
      })
      setSavedIds(prev => new Set(prev).add(cardKey))
      setSaveMsg('Session saved!')
      setTimeout(() => setSaveMsg(''), 2500)
      // Refresh the saved tab in background
      void loadSavedPlans()
    } catch {
      setSaveMsg('Failed to save session.')
      setTimeout(() => setSaveMsg(''), 2500)
    } finally {
      setIsSaving(false)
    }
  }

  // ── Save ALL AI sessions at once ──────────────────────────────────────────
  const saveAllSessions = async () => {
    if (!plan || isSaving) return
    setIsSaving(true)
    setSaveMsg('')
    try {
      await Promise.all(
        plan.sessions.map((session, i) => {
          const cardKey = `${session.day}-${i}`
          if (savedIds.has(cardKey)) return Promise.resolve()
          return backendApi.post('/study-plan', {
            subject:  session.subject,
            topic:    session.topic,
            time:     `${session.start_time} – ${session.end_time}`,
            status:   'Pending',
            priority: session.priority,
            date:     dayTimeToDate(session.day, session.start_time),
            source:   'generated',
            ...(session.noteId ? { noteId: session.noteId } : {}),
          })
        })
      )
      setSavedIds(new Set(plan.sessions.map((_, i) => `${plan.sessions[i].day}-${i}`)))
      setSaveMsg(`All ${plan.sessions.length} sessions saved!`)
      setTimeout(() => setSaveMsg(''), 3000)
      void loadSavedPlans()
    } catch {
      setSaveMsg('Some sessions failed to save.')
      setTimeout(() => setSaveMsg(''), 3000)
    } finally {
      setIsSaving(false)
    }
  }

  // ── Toggle saved plan status (Pending ↔ Completed) ───────────────────────
  const toggleSavedStatus = async (item: StudyPlanItem) => {
    setTogglingId(item._id)
    const nextStatus = item.status === 'Pending' ? 'Completed' : 'Pending'
    try {
      await backendApi.put(`/study-plan/${item._id}`, { status: nextStatus })
      setSavedPlans(prev =>
        prev.map(p => p._id === item._id ? { ...p, status: nextStatus } : p)
      )
    } catch {
      /* swallow — stale UI is acceptable */
    } finally {
      setTogglingId(null)
    }
  }

  // ── Delete saved plan item ────────────────────────────────────────────────
  const deleteSavedItem = async (id: string) => {
    setDeletingId(id)
    try {
      await backendApi.delete(`/study-plan/${id}`)
      setSavedPlans(prev => prev.filter(p => p._id !== id))
    } catch {
      /* swallow */
    } finally {
      setDeletingId(null)
    }
  }

  // ── Boot ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    void generatePlan()
    void loadSavedPlans()
  }, [])

  // ── Derived data ──────────────────────────────────────────────────────────
  const avgRetention = useMemo(() => {
    if (!plan?.retention_by_note.length) return 0
    return Math.round(
      plan.retention_by_note.reduce((a, n) => a + n.retentionRate, 0) / plan.retention_by_note.length
    )
  }, [plan])

  const sessionsByDay = useMemo(() => {
    if (!plan) return {} as Record<string, StudySession[]>
    const map: Record<string, StudySession[]> = {}
    for (const s of plan.sessions) map[s.day] = [...(map[s.day] ?? []), s]
    return map
  }, [plan])

  const orderedDays = useMemo(
    () => DAY_ORDER.filter(d => sessionsByDay[d]?.length),
    [sessionsByDay],
  )

  // Group saved plans by day name (derive from date field)
  const savedByDay = useMemo(() => {
    const map: Record<string, StudyPlanItem[]> = {}
    for (const item of savedPlans) {
      const dayName = DAY_ORDER[new Date(item.date).getDay() === 0 ? 6 : new Date(item.date).getDay() - 1]
      map[dayName] = [...(map[dayName] ?? []), item]
    }
    return map
  }, [savedPlans])

  const savedOrderedDays = useMemo(
    () => DAY_ORDER.filter(d => savedByDay[d]?.length),
    [savedByDay],
  )

  const completedCount = savedPlans.filter(p => p.status === 'Completed').length
  const pendingCount   = savedPlans.filter(p => p.status === 'Pending').length

  const toggleDone = (key: string) =>
    setCompletedIds(prev => { const s = new Set(prev); s.has(key) ? s.delete(key) : s.add(key); return s })

  const dueHighCount = plan?.sessions.filter(s => s.priority === 'High').length ?? 0

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-12">

      {/* ── Error banner ── */}
      {error && (
        <div className="rounded-xl px-4 py-3 text-sm flex items-center gap-2"
          style={{ color: '#ef4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {/* ── Save feedback toast ── */}
      {saveMsg && (
        <div className="rounded-xl px-4 py-3 text-sm flex items-center gap-2"
          style={{ color: '#059669', background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.2)' }}>
          <CheckCircle2 size={14} /> {saveMsg}
        </div>
      )}

      {/* ── Hero banner ── */}
      <div className="relative overflow-hidden rounded-[36px]" style={{
        background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 60%, #38bdf8 100%)',
        padding: '48px 52px',
      }}>
        <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '260px', height: '260px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-40px', left: '30%', width: '180px', height: '180px', borderRadius: '50%', background: 'rgba(56,189,248,0.12)', pointerEvents: 'none' }} />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-10">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border mb-5"
              style={{ background: 'rgba(255,255,255,0.11)', borderColor: 'rgba(255,255,255,0.22)', color: '#bfdbfe' }}>
              <Sparkles size={10} />
              <span style={{ fontSize: '9px', fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase' }}>Ebbinghaus AI Plan</span>
            </div>
            <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 'clamp(2rem,4vw,3rem)', fontWeight: 900, color: '#fff', lineHeight: 1.08, letterSpacing: '-0.02em', marginBottom: '12px' }}>
              Your Week,<br />Optimized.
            </h2>
            <p style={{ color: 'rgba(191,219,254,0.75)', fontSize: '14px', lineHeight: 1.65, maxWidth: '380px' }}>
              Sessions scheduled using the Ebbinghaus forgetting curve — high-priority notes get more time, spaced across the week.
            </p>
            <div style={{ display: 'flex', gap: '8px', marginTop: '20px', flexWrap: 'wrap' }}>
              {[
                { icon: <Brain size={11} />, label: 'Spaced Repetition' },
                { icon: <Clock size={11} />, label: '2–4 PM Sweet Spot' },
                { icon: <TrendingUp size={11} />, label: 'Retention-Weighted' },
              ].map(({ icon, label }) => (
                <div key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: '99px', background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: '10px', fontWeight: 600 }}>
                  {icon}{label}
                </div>
              ))}
            </div>
          </div>

          {/* Stats panel */}
          <div style={{ width: '280px', flexShrink: 0, background: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.16)', backdropFilter: 'blur(16px)', borderRadius: '20px', padding: '22px' }}>
            <h3 style={{ fontFamily: 'Sora, sans-serif', fontSize: '13px', fontWeight: 900, color: '#fff', marginBottom: '16px' }}>Plan Overview</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
              <StatCard label="AI Sessions"   value={plan?.sessions.length ?? '—'} />
              <StatCard label="Low retention" value={plan?.low_retention_notes.length ?? '—'} warn />
              <StatCard label="Saved pending" value={pendingCount} warn={pendingCount > 0} />
              <StatCard label="Completed"     value={completedCount} />
            </div>
            <button
              onClick={() => void generatePlan()}
              disabled={isGenerating}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-[0.18em] transition-all disabled:opacity-60"
              style={{ background: 'rgba(255,255,255,0.16)', color: '#fff', border: '1px solid rgba(255,255,255,0.18)', cursor: 'pointer' }}
            >
              <WandSparkles size={13} />
              {isGenerating ? 'Generating…' : 'Regenerate Plan'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Low retention alert ── */}
      {plan && plan.low_retention_notes.length > 0 && (
        <div style={{ background: '#FCEBEB', border: '1px solid #F7C1C1', borderRadius: '16px', padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <AlertTriangle size={14} color="#A32D2D" />
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#A32D2D' }}>
              {plan.low_retention_notes.length} note{plan.low_retention_notes.length > 1 ? 's' : ''} below {THRESHOLD}% retention — urgent review scheduled
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {plan.low_retention_notes.map(note => (
              <div key={note.noteId} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 0', borderBottom: '0.5px solid #F7C1C1' }}>
                <span style={{ flex: 1, fontSize: '13px', fontWeight: 600, color: '#A32D2D', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{note.title}</span>
                <span style={{ fontSize: '12px', color: '#993C1D', whiteSpace: 'nowrap' }}>{note.subject}</span>
                <span style={{ padding: '2px 8px', borderRadius: '99px', background: '#FCEBEB', border: '1px solid #F7C1C1', fontSize: '11px', fontWeight: 700, color: '#A32D2D', whiteSpace: 'nowrap' }}>
                  {Math.round(note.retentionRate)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Main tabs: AI Plan / Saved Plans ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-secondary)', borderRadius: '14px', padding: '4px' }}>
          {([
            { id: 'ai',    icon: <Sparkles size={12} />, label: 'AI Generated' },
            { id: 'saved', icon: <ListTodo size={12} />, label: `Saved Plans${savedPlans.length ? ` (${savedPlans.length})` : ''}` },
          ] as const).map(tab => (
            <button key={tab.id} onClick={() => setMainTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 18px', borderRadius: '10px', fontSize: '12px', fontWeight: 700,
                border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                background: mainTab === tab.id ? 'var(--bg-primary)' : 'transparent',
                color: mainTab === tab.id ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: mainTab === tab.id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              }}>
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>

        {/* Save all button — only shown on AI tab when there's a plan */}
        {mainTab === 'ai' && plan && plan.sessions.length > 0 && (
          <button
            onClick={() => void saveAllSessions()}
            disabled={isSaving || savedIds.size === plan.sessions.length}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 18px', borderRadius: '12px', fontSize: '12px', fontWeight: 700,
              background: savedIds.size === plan.sessions.length ? 'var(--bg-secondary)' : '#2563eb',
              color: savedIds.size === plan.sessions.length ? 'var(--text-muted)' : '#fff',
              border: '1px solid transparent', cursor: 'pointer', opacity: isSaving ? 0.7 : 1,
            }}
          >
            {isSaving
              ? <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />Saving…</>
              : savedIds.size === plan.sessions.length
                ? <><CheckCircle2 size={12} />All Saved</>
                : <><Save size={12} />Save All to Plan</>
            }
          </button>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* AI Generated tab                                                   */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {mainTab === 'ai' && (
        <>
          {/* Sub-tabs */}
          <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-secondary)', borderRadius: '14px', padding: '4px', width: 'fit-content' }}>
            {(['sessions', 'retention'] as const).map(tab => (
              <button key={tab} onClick={() => setSubTab(tab)}
                style={{
                  padding: '8px 20px', borderRadius: '10px', fontSize: '12px', fontWeight: 700,
                  textTransform: 'capitalize', letterSpacing: '0.04em', border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                  background: subTab === tab ? 'var(--bg-primary)' : 'transparent',
                  color: subTab === tab ? 'var(--text-primary)' : 'var(--text-muted)',
                  boxShadow: subTab === tab ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                }}>
                {tab === 'sessions' ? 'Study Sessions' : 'Retention by Note'}
              </button>
            ))}
          </div>

          {/* Sessions sub-tab */}
          {subTab === 'sessions' && (
            isGenerating && !plan ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[1, 2, 3].map(n => <div key={n} style={{ height: '90px', borderRadius: '16px', background: 'var(--bg-secondary)', animation: 'pulse 1.5s ease-in-out infinite' }} />)}
              </div>
            ) : plan && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                {orderedDays.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)', fontSize: '14px' }}>
                    <Calendar size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                    No sessions generated. Add some notes first, then regenerate.
                  </div>
                ) : orderedDays.map(day => (
                  <div key={day}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', paddingLeft: '2px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--text-muted)' }}>{day}</span>
                      <span style={{ padding: '1px 7px', borderRadius: '99px', background: 'var(--bg-tertiary)', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)' }}>
                        {sessionsByDay[day].length} session{sessionsByDay[day].length > 1 ? 's' : ''}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {sessionsByDay[day].map((session, i) => {
                        const pStyle  = PRIORITY_STYLES[session.priority] ?? PRIORITY_STYLES.Medium
                        const cardKey = `${day}-${i}`
                        const done    = completedIds.has(cardKey)
                        const saved   = savedIds.has(cardKey)
                        const nextRev = plan.retention_by_note.find(n => n.noteId === session.noteId)?.nextReviewDays

                        return (
                          <div key={cardKey} style={{
                            background: done ? 'var(--bg-secondary)' : pStyle.bg,
                            border: `1px solid ${done ? 'var(--border-color)' : pStyle.accent + '40'}`,
                            borderLeft: `3px solid ${done ? '#10b981' : pStyle.accent}`,
                            borderRadius: '16px', padding: '14px 18px',
                            opacity: done ? 0.55 : 1, transition: 'all 0.2s',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                                  <span style={{ padding: '2px 8px', borderRadius: '99px', background: pStyle.badge, color: pStyle.text, fontSize: '10px', fontWeight: 700 }}>{session.priority}</span>
                                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>{session.start_time} – {session.end_time}</span>
                                  {nextRev !== undefined && <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>· review in {nextRev}d</span>}
                                  {saved && <span style={{ fontSize: '10px', color: '#059669', fontWeight: 700 }}>✓ Saved</span>}
                                </div>
                                <h4 style={{ fontFamily: 'Sora, sans-serif', fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2px', textDecoration: done ? 'line-through' : 'none' }}>
                                  {session.topic}
                                </h4>
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>{session.subject}</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <RetentionBar rate={session.retention_rate} color={pStyle.accent} />
                                  <span style={{ fontSize: '11px', fontWeight: 700, color: pStyle.text, minWidth: '34px' }}>{Math.round(session.retention_rate)}%</span>
                                </div>
                                {session.reason && <p style={{ fontSize: '11px', color: pStyle.text, marginTop: '6px', opacity: 0.85 }}>{session.reason}</p>}
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                  <button
                                    onClick={() => navigate(`/app/notes/${encodeURIComponent(session.subject)}?lecture=${encodeURIComponent(session.topic)}`)}
                                    style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: 700, background: `${pStyle.accent}14`, border: `1px solid ${pStyle.accent}30`, color: pStyle.accent, cursor: 'pointer' }}>
                                    <BookOpen size={12} /> Open <ChevronRight size={11} />
                                  </button>
                                  <button
                                    onClick={() => void saveSession(session, cardKey)}
                                    disabled={saved || isSaving}
                                    title={saved ? 'Already saved' : 'Save to plan'}
                                    style={{ width: '34px', height: '34px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: saved ? 'default' : 'pointer', background: saved ? 'rgba(5,150,105,0.1)' : 'var(--bg-tertiary)', border: `1px solid ${saved ? '#059669' : 'var(--border-color)'}`, flexShrink: 0 }}>
                                    <Save size={14} style={{ color: saved ? '#059669' : 'var(--text-muted)' }} />
                                  </button>
                                </div>
                                <button
                                  onClick={() => toggleDone(cardKey)}
                                  style={{ width: '100%', height: '34px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: done ? '#10b981' : 'var(--bg-tertiary)', border: `1px solid ${done ? '#10b981' : 'var(--border-color)'}` }}>
                                  <CheckCircle2 size={16} style={{ color: done ? '#fff' : 'var(--text-muted)' }} />
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Retention sub-tab */}
          {subTab === 'retention' && (
            isGenerating && !plan ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: 'var(--border-color)', borderRadius: '20px', overflow: 'hidden' }}>
                {[1, 2, 3, 4].map(n => <div key={n} style={{ height: '64px', background: 'var(--bg-secondary)', animation: 'pulse 1.5s ease-in-out infinite' }} />)}
              </div>
            ) : plan && (
              <div style={{ background: 'var(--bg-secondary)', borderRadius: '20px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                {plan.retention_by_note.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>No notes found. Add notes to see retention data.</div>
                ) : plan.retention_by_note.map((note, i) => {
                  const col = retentionColor(note.retentionRate, THRESHOLD)
                  return (
                    <div key={note.noteId} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 20px', borderBottom: i < plan.retention_by_note.length - 1 ? '0.5px solid var(--border-color)' : 'none' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{note.title}</p>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{note.subject} · review in {note.nextReviewDays}d</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '200px', flexShrink: 0 }}>
                        <RetentionBar rate={note.retentionRate} color={col.bar} />
                        <span style={{ padding: '2px 8px', borderRadius: '99px', background: col.badge, color: col.text, fontSize: '11px', fontWeight: 700, minWidth: '40px', textAlign: 'center' }}>
                          {Math.round(note.retentionRate)}%
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          )}
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* Saved Plans tab (MongoDB)                                          */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {mainTab === 'saved' && (
        <>
          {/* Saved stats row */}
          {savedPlans.length > 0 && (
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {[
                { label: 'Total', value: savedPlans.length, color: 'var(--text-primary)' },
                { label: 'Pending', value: pendingCount, color: '#EF9F27' },
                { label: 'Completed', value: completedCount, color: '#639922' },
                { label: 'Completion', value: `${savedPlans.length ? Math.round((completedCount / savedPlans.length) * 100) : 0}%`, color: '#2563eb' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ padding: '10px 18px', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '16px', fontWeight: 900, color }}>{value}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>{label}</span>
                </div>
              ))}
              <button
                onClick={() => void loadSavedPlans()}
                style={{ marginLeft: 'auto', padding: '8px 16px', borderRadius: '12px', fontSize: '12px', fontWeight: 700, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {isLoadingSaved ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                Refresh
              </button>
            </div>
          )}

          {isLoadingSaved && savedPlans.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[1, 2, 3].map(n => <div key={n} style={{ height: '80px', borderRadius: '16px', background: 'var(--bg-secondary)', animation: 'pulse 1.5s ease-in-out infinite' }} />)}
            </div>
          ) : savedPlans.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '70px 0', color: 'var(--text-muted)', fontSize: '14px' }}>
              <ListTodo size={36} style={{ margin: '0 auto 14px', opacity: 0.25 }} />
              <p style={{ fontWeight: 600, marginBottom: '6px' }}>No saved plans yet</p>
              <p style={{ fontSize: '12px' }}>Generate an AI plan and click "Save All to Plan" to persist sessions here.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
              {savedOrderedDays.map(day => (
                <div key={day}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', paddingLeft: '2px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--text-muted)' }}>{day}</span>
                    <span style={{ padding: '1px 7px', borderRadius: '99px', background: 'var(--bg-tertiary)', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)' }}>
                      {savedByDay[day].length}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {savedByDay[day].map(item => {
                      const pStyle    = PRIORITY_STYLES[item.priority] ?? PRIORITY_STYLES.Medium
                      const completed = item.status === 'Completed'
                      const isToggling = togglingId === item._id
                      const isDeleting = deletingId === item._id

                      return (
                        <div key={item._id} style={{
                          background: completed ? 'var(--bg-secondary)' : pStyle.bg,
                          border: `1px solid ${completed ? 'var(--border-color)' : pStyle.accent + '40'}`,
                          borderLeft: `3px solid ${completed ? '#10b981' : pStyle.accent}`,
                          borderRadius: '16px', padding: '14px 18px',
                          opacity: completed ? 0.6 : 1, transition: 'all 0.2s',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '5px' }}>
                                <span style={{ padding: '2px 8px', borderRadius: '99px', background: pStyle.badge, color: pStyle.text, fontSize: '10px', fontWeight: 700 }}>{item.priority}</span>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>{item.time}</span>
                                {item.source === 'generated' && (
                                  <span style={{ padding: '1px 6px', borderRadius: '99px', background: 'rgba(37,99,235,0.1)', color: '#2563eb', fontSize: '10px', fontWeight: 700 }}>AI</span>
                                )}
                                <span style={{ padding: '2px 8px', borderRadius: '99px', background: completed ? '#EAF3DE' : '#FAEEDA', color: completed ? '#3B6D11' : '#854F0B', fontSize: '10px', fontWeight: 700 }}>
                                  {item.status}
                                </span>
                              </div>
                              <h4 style={{ fontFamily: 'Sora, sans-serif', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', textDecoration: completed ? 'line-through' : 'none', marginBottom: '1px' }}>
                                {item.topic}
                              </h4>
                              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{item.subject}</p>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                              <button
                                onClick={() => navigate(`/app/notes/${encodeURIComponent(item.subject)}?lecture=${encodeURIComponent(item.topic)}`)}
                                style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: 700, background: `${pStyle.accent}14`, border: `1px solid ${pStyle.accent}30`, color: pStyle.accent, cursor: 'pointer' }}>
                                <BookOpen size={12} /> Open
                              </button>
                              {/* Toggle status */}
                              <button
                                onClick={() => void toggleSavedStatus(item)}
                                disabled={isToggling}
                                title={completed ? 'Mark as Pending' : 'Mark as Completed'}
                                style={{ width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: completed ? '#10b981' : 'var(--bg-tertiary)', border: `1px solid ${completed ? '#10b981' : 'var(--border-color)'}` }}>
                                {isToggling
                                  ? <Loader2 size={15} style={{ color: 'var(--text-muted)', animation: 'spin 1s linear infinite' }} />
                                  : <CheckCircle2 size={15} style={{ color: completed ? '#fff' : 'var(--text-muted)' }} />
                                }
                              </button>
                              {/* Delete */}
                              <button
                                onClick={() => void deleteSavedItem(item._id)}
                                disabled={isDeleting}
                                title="Delete"
                                style={{ width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
                                {isDeleting
                                  ? <Loader2 size={14} style={{ color: '#ef4444', animation: 'spin 1s linear infinite' }} />
                                  : <Trash2 size={14} style={{ color: '#ef4444' }} />
                                }
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}