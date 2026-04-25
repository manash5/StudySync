import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, CheckCircle2, ChevronRight } from 'lucide-react'

const initialStudyPlan = [
  { id: 1, subject: 'Machine Learning', topic: 'Gradient Descent', time: '14:00 - 15:30', status: 'Pending', priority: 'High' },
  { id: 2, subject: 'Linear Algebra', topic: 'Vectors & Vector Spaces', time: '16:00 - 17:00', status: 'Pending', priority: 'Medium' },
  { id: 3, subject: 'Neural Networks', topic: 'Perceptrons & Neurons', time: '19:00 - 20:30', status: 'Pending', priority: 'High' },
]

const subjectColors: Record<string, string> = {
  'Machine Learning': '#3b82f6',
  'Linear Algebra': '#8b5cf6',
  'Neural Networks': '#06b6d4',
}

export default function StudyPlan() {
  const [plans, setPlans] = useState(initialStudyPlan)
  const navigate = useNavigate()

  const togglePlan = (id: number) => {
    setPlans(prev => prev.map(p => p.id === id ? { ...p, status: p.status === 'Completed' ? 'Pending' : 'Completed' } : p))
  }

  const completionPercent = Math.round((plans.filter(p => p.status === 'Completed').length / plans.length) * 100)

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-fade-in pb-12">

      {/* ── Hero Header ── */}
      <div className="relative overflow-hidden rounded-[36px]" style={{
        background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 60%, #38bdf8 100%)',
        padding: '52px 56px',
      }}>
        {/* Ambient blobs */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full blur-[100px]"
          style={{ background: 'rgba(56,189,248,0.18)', marginRight: '-120px', marginTop: '-120px' }} />
        <div className="absolute bottom-0 left-0 w-[260px] h-[260px] rounded-full blur-[80px]"
          style={{ background: 'rgba(14,165,233,0.12)', marginLeft: '-80px', marginBottom: '-80px' }} />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-12">

          {/* Left — Title */}
          <div className="flex-1">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border mb-6"
              style={{ background: 'rgba(255,255,255,0.11)', borderColor: 'rgba(255,255,255,0.22)', color: '#bfdbfe' }}>
              <Sparkles size={10} />
              <span style={{ fontSize: '9px', fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase' }}>Intelligence Core</span>
            </div>

            {/* Title */}
            <h2 style={{
              fontFamily: 'Sora, sans-serif',
              fontSize: 'clamp(2.2rem, 4vw, 3.2rem)',
              fontWeight: 900,
              color: '#ffffff',
              lineHeight: 1.06,
              letterSpacing: '-0.02em',
              marginBottom: '16px',
            }}>
              Your Semester,<br />Optimized.
            </h2>

            {/* Description */}
            <p style={{
              color: 'rgba(191,219,254,0.72)',
              fontSize: '14px',
              fontWeight: 500,
              lineHeight: 1.65,
              maxWidth: '400px',
            }}>
              A mathematically derived plan to maximize retention while reclaiming your free hours.
            </p>
          </div>

          {/* Right — Plan Insights */}
          <div className="flex-shrink-0" style={{
            width: '300px',
            background: 'rgba(255,255,255,0.09)',
            border: '1px solid rgba(255,255,255,0.16)',
            backdropFilter: 'blur(16px)',
            borderRadius: '22px',
            padding: '24px',
          }}>
            <h3 style={{ fontFamily: 'Sora, sans-serif', fontSize: '14px', fontWeight: 900, color: '#fff', marginBottom: '20px' }}>
              Plan Insights
            </h3>

            {/* Gap Analysis */}
            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'rgba(255,255,255,0.38)', marginBottom: '6px' }}>
                Gap Analysis
              </p>
              <p style={{ fontSize: '13px', fontWeight: 500, lineHeight: 1.55, color: 'rgba(255,255,255,0.87)' }}>
                You have a{' '}
                <span style={{ fontWeight: 800, padding: '1px 8px', borderRadius: '6px', fontSize: '11px', background: 'rgba(253,230,138,0.16)', color: '#fde68a' }}>
                  3 hour gap
                </span>{' '}
                today — the optimal time for deep-work.
              </p>
            </div>

            {/* Divider */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.10)', marginBottom: '16px' }} />

            {/* Retention Focus */}
            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'rgba(255,255,255,0.38)', marginBottom: '6px' }}>
                Retention Focus
              </p>
              <p style={{ fontSize: '13px', fontWeight: 500, lineHeight: 1.55, color: 'rgba(255,255,255,0.87)' }}>
                Finish Neural Networks to maintain your{' '}
                <span style={{ fontWeight: 700, color: '#fca5a5' }}>3 day streak</span>.
              </p>
            </div>

            {/* Divider */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.10)', paddingTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'rgba(255,255,255,0.38)' }}>Completion</span>
                <span style={{ fontSize: '13px', fontWeight: 900, color: '#fff' }}>{completionPercent}%</span>
              </div>
              <div style={{ height: '6px', width: '100%', borderRadius: '99px', overflow: 'hidden', background: 'rgba(0,0,0,0.20)' }}>
                <div style={{
                  height: '100%',
                  borderRadius: '99px',
                  width: completionPercent === 0 ? '6px' : `${completionPercent}%`,
                  background: 'linear-gradient(90deg, #bfdbfe, #e0e7ff)',
                  transition: 'width 0.7s ease',
                }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Study Blocks ── */}
      <div>
        <h3 className="text-[10px] font-black uppercase tracking-[0.18em] px-1 mb-5" style={{ color: 'var(--text-muted)' }}>
          Active Study Blocks
        </h3>
        <div className="space-y-4">
          {plans.map((item) => {
            const accent = subjectColors[item.subject] ?? '#3b82f6'
            const isDone = item.status === 'Completed'
            return (
              <div
                key={item.id}
                className="group relative rounded-[28px] border transition-all duration-300"
                style={{
                  background: 'var(--bg-secondary)',
                  borderColor: isDone ? 'rgba(16,185,129,0.25)' : 'var(--border-color)',
                  opacity: isDone ? 0.6 : 1,
                }}
              >
                {/* left accent bar */}
                <div className="absolute left-0 top-4 bottom-4 w-1 rounded-full" style={{ background: isDone ? '#10b981' : accent, marginLeft: '1px' }} />

                <div className="flex items-center justify-between gap-4 p-6 pl-8">
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-2">
                      <span
                        className="text-[9px] font-black uppercase tracking-[0.18em] px-2.5 py-1 rounded-full"
                        style={{ background: `${accent}14`, color: accent }}
                      >
                        {item.subject}
                      </span>
                      <span className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>
                        {item.time}
                      </span>
                      {item.priority === 'High' && !isDone && (
                        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-red-500/10 text-red-500">
                          HIGH
                        </span>
                      )}
                    </div>

                    <h4
                      className={`text-lg font-bold tracking-tight leading-snug transition-all ${isDone ? 'line-through opacity-40' : ''}`}
                      style={{ color: 'var(--text-primary)', fontFamily: 'Sora, sans-serif' }}
                    >
                      {item.topic}
                    </h4>
                    <p className="text-xs font-medium mt-1" style={{ color: 'var(--text-muted)' }}>
                      Auto-scheduled during your afternoon gap
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {/* → Go to notes */}
                    <button
                      onClick={() => navigate(`/app/notes/${encodeURIComponent(item.subject)}?lecture=${encodeURIComponent(item.topic)}`)}
                      title="Open notes"
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-[11px] uppercase tracking-widest transition-all border"
                      style={{ background: `${accent}10`, borderColor: `${accent}30`, color: accent }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = accent
                        e.currentTarget.style.color = '#fff'
                        e.currentTarget.style.borderColor = accent
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = `${accent}10`
                        e.currentTarget.style.color = accent
                        e.currentTarget.style.borderColor = `${accent}30`
                      }}
                    >
                      Open <ChevronRight size={13} />
                    </button>

                    {/* ✓ Toggle done */}
                    <button
                      onClick={() => togglePlan(item.id)}
                      title={isDone ? 'Mark as pending' : 'Mark as done'}
                      className="w-12 h-12 rounded-2xl border flex items-center justify-center transition-all duration-300"
                      style={{
                        background: isDone ? '#10b981' : 'var(--bg-tertiary)',
                        borderColor: isDone ? '#10b981' : 'var(--border-color)',
                      }}
                    >
                      <CheckCircle2
                        size={22}
                        style={{ color: isDone ? '#fff' : 'var(--text-muted)', transition: 'all 0.25s' }}
                      />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
