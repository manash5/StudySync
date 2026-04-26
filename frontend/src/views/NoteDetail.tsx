import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Brain, AlertCircle, Lightbulb, Check, Clock, FileText, Sparkles, BookOpen, Layers, Target } from 'lucide-react'
import { backendApi, type NoteItem, type Subject } from '../lib/api'
import { computeRetentionScore, getRetentionLabel } from '../lib/retention'

type NoteSection = {
  id: string
  title: string
  body: string
  accent: string
}

function parseLectureNotes(text: string): NoteSection[] {
  const normalized = text.replace(/\r\n/g, '\n').trim()
  if (!normalized) return []

  const headingPattern = /(?:^|\n)(\d+)\.\s+([A-Z][A-Z0-9\s()/-]+?)(?=\n|\s)/g
  const matches = [...normalized.matchAll(headingPattern)]

  if (matches.length === 0) {
    return [{ id: 'full', title: 'Lecture Notes', body: normalized, accent: '#3b82f6' }]
  }

  return matches.map((match, index) => {
    const startIndex = (match.index ?? 0) + match[0].length
    const endIndex = index + 1 < matches.length ? (matches[index + 1].index ?? normalized.length) : normalized.length
    const rawTitle = match[2].trim()
    const body = normalized.slice(startIndex, endIndex).trim().replace(/^[-–—\s]+/, '')
    const accentPalette = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#14b8a6', '#6366f1']

    return {
      id: `${match[1]}-${index}`,
      title: rawTitle,
      body,
      accent: accentPalette[index % accentPalette.length],
    }
  })
}

function splitLines(body: string): string[] {
  return body
    .split(/\n+/)
    .flatMap(line => line.split(/\s-\s/))
    .map(line => line.trim())
    .filter(Boolean)
}

function pickIcon(title: string) {
  const upper = title.toUpperCase()
  if (upper.includes('INTRO')) return BookOpen
  if (upper.includes('CORE') || upper.includes('IDEA')) return Layers
  if (upper.includes('STEP')) return Target
  return Sparkles
}

export default function NoteDetail() {
  const { subject } = useParams<{ subject: string }>()
  const navigate = useNavigate()
  const location = useLocation()

  const decodedSubject = decodeURIComponent(subject || '')
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [notes, setNotes] = useState<NoteItem[]>([])
  const [activeIdx, setActiveIdx] = useState(0)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const run = async () => {
      setError('')
      try {
        const subjectsRes = await backendApi.get<Subject[]>('/subjects')
        setSubjects(subjectsRes)
        const match = subjectsRes.find(s => s.name.toLowerCase() === decodedSubject.toLowerCase())
        if (!match) {
          setNotes([])
          return
        }

        const notesRes = await backendApi.get<NoteItem[]>(`/notes?subjectId=${encodeURIComponent(match._id)}`)
        setNotes(notesRes)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load note details')
      }
    }

    void run()
  }, [decodedSubject])

  useEffect(() => {
    const lectureParam = new URLSearchParams(location.search).get('lecture')
    if (!lectureParam || notes.length === 0) {
      setActiveIdx(0)
      return
    }

    const idx = notes.findIndex(n => n.title.toLowerCase() === decodeURIComponent(lectureParam).toLowerCase())
    setActiveIdx(idx >= 0 ? idx : 0)
  }, [location.search, notes])

  const currentSubject = useMemo(
    () => subjects.find(s => s.name.toLowerCase() === decodedSubject.toLowerCase()),
    [decodedSubject, subjects],
  )

  const lecture = notes[activeIdx]
  const color = currentSubject?.color ?? '#3b82f6'
  const parsedSections = useMemo(() => parseLectureNotes(lecture?.notes || ''), [lecture?.notes])
  const retentionScore = useMemo(() => computeRetentionScore(lecture), [lecture])
  const retentionLabel = useMemo(() => getRetentionLabel(retentionScore), [retentionScore])
  const nextReviewText = useMemo(() => {
    if (retentionScore < 40) return 'Review today'
    if (retentionScore < 60) return 'Review in 1-3 days'
    if (retentionScore < 80) return 'Review in 1 week'
    return 'Review in 2 weeks'
  }, [retentionScore])

  const handleDownloadPDF = async () => {
    if (!lecture) return

    setIsExporting(true)
    const element = document.getElementById('note-content-area')
    const h2p = (window as Window & { html2pdf?: () => any }).html2pdf

    if (!element || !h2p) {
      alert('PDF engine is not available yet. Please try again shortly.')
      setIsExporting(false)
      return
    }

    try {
      const opt = {
        margin: 0.4,
        filename: `${lecture.title}_Notes.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true, logging: false },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' },
      }
      await h2p().from(element).set(opt).save()
    } catch {
      window.print()
    } finally {
      setIsExporting(false)
    }
  }

  const toggleReviewed = async () => {
    if (!lecture) return

    try {
      const updated = await backendApi.put<NoteItem>(`/notes/${lecture._id}`, { reviewed: !lecture.reviewed })
      setNotes(prev => prev.map(note => note._id === lecture._id ? updated : note))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update review state')
    }
  }

  if (!lecture) {
    return (
      <div className="max-w-5xl mx-auto animate-fade-in">
        <button onClick={() => navigate('/app/notes')}
                className="flex items-center gap-1.5 text-sm mb-6 hover:text-blue-300 transition-colors"
                style={{ color: 'var(--text-muted)' }}>
          <ChevronLeft size={15} /> Notes / {decodedSubject}
        </button>

        {error && (
          <div className="mb-4 rounded-xl px-3 py-2 text-sm" style={{ color: '#ef4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            {error}
          </div>
        )}

        <div className="glass-card rounded-2xl p-6" style={{ color: 'var(--text-secondary)' }}>
          No notes found for this subject yet.
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto animate-fade-in" id="note-content-area">
      <button onClick={() => navigate('/app/notes')}
              className="flex items-center gap-1.5 text-sm mb-6 hover:text-blue-300 transition-colors"
              style={{ color: 'var(--text-muted)' }}>
        <ChevronLeft size={15} /> Notes / {decodedSubject}
      </button>

      {error && (
        <div className="mb-4 rounded-xl px-3 py-2 text-sm" style={{ color: '#ef4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          {error}
        </div>
      )}

      <div className="grid lg:grid-cols-[260px_minmax(0,1fr)] gap-5 items-start">
        <aside className="glass-card rounded-3xl p-4 border sticky top-6" style={{ borderColor: `${color}22` }}>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={16} style={{ color }} />
            <h3 className="font-semibold" style={{ fontFamily: 'Sora, sans-serif' }}>Lecture Index</h3>
          </div>
          <div className="space-y-2 max-h-[70vh] overflow-auto pr-1 no-print">
            {notes.map((lec, i) => (
              <button
                key={lec._id}
                onClick={() => setActiveIdx(i)}
                className="w-full text-left rounded-2xl p-3 transition-all border"
                style={{
                  background: activeIdx === i ? `${color}10` : 'rgba(255,255,255,0.02)',
                  borderColor: activeIdx === i ? `${color}40` : 'var(--border-color)',
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>
                    {lec.lectureNumber}
                  </span>
                  {lec.reviewed && <Check size={12} style={{ color }} />}
                </div>
                <div className="font-semibold mt-1 line-clamp-2" style={{ color: activeIdx === i ? color : 'var(--text-primary)' }}>
                  {lec.title}
                </div>
                <div className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                  <Clock size={11} /> {lec.duration}
                </div>
              </button>
            ))}
          </div>
        </aside>

        <div className="min-w-0 space-y-5">
          <section className="glass-card rounded-[30px] p-6 border overflow-hidden" style={{ borderColor: `${color}22` }}>
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}>
                    {lecture.lectureNumber}
                  </span>
                  <span className="text-xs flex items-center gap-1 px-2.5 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.03)', color: 'var(--text-muted)' }}>
                    <Clock size={11} /> {lecture.duration}
                  </span>
                  {lecture.reviewed && (
                    <span className="text-xs flex items-center gap-1 px-2.5 py-1 rounded-full" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                      <Check size={11} /> Reviewed
                    </span>
                  )}
                </div>
                <h2 className="text-2xl font-bold leading-tight" style={{ fontFamily: 'Sora, sans-serif' }}>{lecture.title}</h2>
                <p className="text-sm mt-2 max-w-3xl" style={{ color: 'var(--text-secondary)' }}>{lecture.mainTopic}</p>

                <div className="grid sm:grid-cols-3 gap-3 mt-5">
                  <div className="rounded-2xl p-3" style={{ background: `${color}12`, border: `1px solid ${color}22` }}>
                    <div className="text-[10px] font-black uppercase tracking-[0.16em] mb-1" style={{ color: 'var(--text-muted)' }}>Retention</div>
                    <div className="text-2xl font-black" style={{ color, fontFamily: 'Sora, sans-serif' }}>{retentionScore}%</div>
                    <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{retentionLabel}</div>
                  </div>
                  <div className="rounded-2xl p-3" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.18)' }}>
                    <div className="text-[10px] font-black uppercase tracking-[0.16em] mb-1" style={{ color: 'var(--text-muted)' }}>Review Count</div>
                    <div className="text-2xl font-black" style={{ color: '#f59e0b', fontFamily: 'Sora, sans-serif' }}>{lecture.reviewCount || 0}</div>
                    <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{lecture.lastReviewedAt ? 'Last reviewed recently' : 'Not reviewed yet'}</div>
                  </div>
                  <div className="rounded-2xl p-3" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.18)' }}>
                    <div className="text-[10px] font-black uppercase tracking-[0.16em] mb-1" style={{ color: 'var(--text-muted)' }}>Next Review</div>
                    <div className="text-lg font-black" style={{ color: '#10b981', fontFamily: 'Sora, sans-serif' }}>{nextReviewText}</div>
                    <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Ebbinghaus spacing applied</div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 no-print">
                <button
                  onClick={handleDownloadPDF}
                  disabled={isExporting}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all group disabled:opacity-50 ${isExporting ? 'animate-pulse' : ''}`}
                  style={{
                    background: 'rgba(59,130,246,0.08)',
                    border: '1px solid rgba(59,130,246,0.22)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <FileText size={14} className="group-hover:text-blue-600 transition-colors" />
                  {isExporting ? 'Generating...' : 'Download PDF'}
                </button>
                <button
                  onClick={toggleReviewed}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background: lecture.reviewed ? `${color}18` : 'rgba(59,130,246,0.06)',
                    border: `1px solid ${lecture.reviewed ? color + '55' : 'rgba(59,130,246,0.18)'}`,
                    color: lecture.reviewed ? color : 'var(--text-secondary)',
                  }}
                >
                  <Check size={14} />
                  {lecture.reviewed ? 'Reviewed' : 'Mark Reviewed'}
                </button>
              </div>
            </div>
          </section>

          <section className="grid md:grid-cols-2 gap-4">
            <div className="glass-card rounded-3xl p-5 border" style={{ borderColor: 'var(--border-color)' }}>
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle size={15} style={{ color }} />
                <h4 className="font-semibold text-sm uppercase tracking-wide" style={{ fontFamily: 'Sora, sans-serif' }}>Prerequisites</h4>
              </div>
              <div className="space-y-2">
                {lecture.prerequisites.length ? lecture.prerequisites.map((p, index) => (
                  <div key={p} className="flex items-start gap-3 rounded-2xl p-3" style={{ background: 'rgba(59,130,246,0.04)' }}>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold" style={{ background: `${color}18`, color }}>
                      {index + 1}
                    </div>
                    <span className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{p}</span>
                  </div>
                )) : (
                  <div className="text-sm" style={{ color: 'var(--text-muted)' }}>No prerequisites listed.</div>
                )}
              </div>
            </div>

            <div className="glass-card rounded-3xl p-5 border" style={{ borderColor: 'var(--border-color)' }}>
              <div className="flex items-center gap-2 mb-4">
                <Brain size={15} style={{ color }} />
                <h4 className="font-semibold text-sm uppercase tracking-wide" style={{ fontFamily: 'Sora, sans-serif' }}>Key Concepts</h4>
              </div>
              <div className="space-y-3">
                {lecture.keyConcepts.length ? lecture.keyConcepts.map(({ concept, score }) => (
                  <div key={concept} className="rounded-2xl p-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <div className="flex justify-between text-xs mb-2">
                      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{concept}</span>
                      <span style={{ color }}>{Math.round(score * 100)}%</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(59,130,246,0.1)' }}>
                      <div className="h-full rounded-full" style={{ width: `${score * 100}%`, background: `linear-gradient(90deg, ${color}, #60a5fa)` }} />
                    </div>
                  </div>
                )) : (
                  <div className="text-sm" style={{ color: 'var(--text-muted)' }}>No key concepts listed.</div>
                )}
              </div>
            </div>
          </section>

          <section className="glass-card rounded-3xl p-5 border" style={{ borderColor: 'var(--border-color)' }}>
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb size={15} className="text-yellow-400" />
              <h4 className="font-semibold text-sm uppercase tracking-wide" style={{ fontFamily: 'Sora, sans-serif' }}>Important Points</h4>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {lecture.importantPoints.length ? lecture.importantPoints.map((point, i) => (
                <div key={i} className="flex items-start gap-3 rounded-2xl p-4" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.12)' }}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5" style={{ background: 'rgba(245,158,11,0.16)', color: '#f59e0b' }}>
                    {i + 1}
                  </div>
                  <span className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{point}</span>
                </div>
              )) : (
                <div className="text-sm" style={{ color: 'var(--text-muted)' }}>No important points listed.</div>
              )}
            </div>
          </section>

          <section className="glass-card rounded-3xl p-5 border" style={{ borderColor: 'var(--border-color)' }}>
            <div className="flex items-center gap-2 mb-4">
              <FileText size={15} className="text-blue-400" />
              <h4 className="font-semibold text-sm uppercase tracking-wide" style={{ fontFamily: 'Sora, sans-serif' }}>Lecture Notes</h4>
            </div>

            <div className="space-y-4">
              {parsedSections.map(section => {
                const Icon = pickIcon(section.title)
                const lines = splitLines(section.body)
                return (
                  <article key={section.id} className="rounded-[24px] p-5 border overflow-hidden" style={{ borderColor: `${section.accent}22`, background: 'linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.02))' }}>
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: `${section.accent}18`, color: section.accent }}>
                        <Icon size={18} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11px] uppercase tracking-[0.18em] mb-1" style={{ color: 'var(--text-muted)' }}>Section</div>
                        <h5 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>{section.title}</h5>
                      </div>
                    </div>

                    {lines.length > 0 ? (
                      <div className="space-y-2.5">
                        {lines.map((line, idx) => (
                          <div key={`${section.id}-${idx}`} className="flex items-start gap-3 rounded-2xl px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.03)' }}>
                            <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ background: section.accent }} />
                            <p className="text-sm leading-7" style={{ color: 'var(--text-secondary)' }}>{line}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm leading-7" style={{ color: 'var(--text-secondary)' }}>{section.body}</p>
                    )}
                  </article>
                )
              })}
            </div>
          </section>

          <div className="flex justify-between mt-4 no-print">
            <button onClick={() => setActiveIdx(Math.max(0, activeIdx - 1))}
                    disabled={activeIdx === 0}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all disabled:opacity-30"
                    style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
              <ChevronLeft size={15} /> Previous
            </button>
            <button onClick={() => setActiveIdx(Math.min(notes.length - 1, activeIdx + 1))}
                    disabled={activeIdx === notes.length - 1}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all disabled:opacity-30"
                    style={{ background: `${color}18`, border: `1px solid ${color}30`, color }}>
              Next <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
