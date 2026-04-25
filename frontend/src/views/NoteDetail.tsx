import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Brain, AlertCircle, Lightbulb, Check, Clock, FileText } from 'lucide-react'
import { backendApi, type NoteItem, type Subject } from '../lib/api'

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

        const notesRes = await backendApi.get<NoteItem[]>(`/api/notes?subjectId=${encodeURIComponent(match._id)}`)
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

      <div className="flex gap-5">
        <div className="w-56 flex-shrink-0">
          <h3 className="text-xs font-medium mb-3 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Lectures</h3>
          <div className="space-y-1.5">
            {notes.map((lec, i) => (
              <button key={lec._id} onClick={() => setActiveIdx(i)}
                      className="w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all"
                      style={{
                        background: activeIdx === i ? `${color}18` : 'transparent',
                        border: `1px solid ${activeIdx === i ? color + '40' : 'transparent'}`,
                        color: activeIdx === i ? color : 'var(--text-secondary)',
                      }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{lec.lectureNumber}</span>
                  {lec.reviewed && <Check size={11} style={{ color }} />}
                </div>
                <div className="font-medium truncate mt-0.5">{lec.title}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="glass-card rounded-2xl p-5 mb-4"
               style={{ borderTop: `3px solid ${color}` }}>
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}>
                    {lecture.lectureNumber}
                  </span>
                  <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                    <Clock size={11} /> {lecture.duration}
                  </span>
                </div>
                <h2 className="text-xl font-bold" style={{ fontFamily: 'Sora, sans-serif' }}>{lecture.title}</h2>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{lecture.mainTopic}</p>
              </div>
              <div className="flex items-center gap-3 no-print">
                <button
                  onClick={handleDownloadPDF}
                  disabled={isExporting}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all group disabled:opacity-50 ${isExporting ? 'animate-pulse' : ''}`}
                  style={{
                    background: 'rgba(59,130,246,0.05)',
                    border: '1px solid rgba(59,130,246,0.2)',
                    color: 'var(--text-secondary)',
                  }}>
                  <FileText size={14} className="group-hover:text-blue-600 transition-colors" />
                  {isExporting ? 'Generating...' : 'Download PDF'}
                </button>
                <button
                  onClick={toggleReviewed}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background: lecture.reviewed ? `${color}20` : 'rgba(59,130,246,0.05)',
                    border: `1px solid ${lecture.reviewed ? color + '50' : 'rgba(59,130,246,0.2)'}`,
                    color: lecture.reviewed ? color : 'var(--text-secondary)',
                  }}>
                  <Check size={14} />
                  {lecture.reviewed ? 'Reviewed' : 'Mark Reviewed'}
                </button>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div className="glass-card rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle size={15} style={{ color }} />
                <h4 className="font-semibold text-sm" style={{ fontFamily: 'Sora, sans-serif' }}>Prerequisites</h4>
              </div>
              <div className="space-y-1.5">
                {lecture.prerequisites.map(p => (
                  <div key={p} className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                    {p}
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Brain size={15} style={{ color }} />
                <h4 className="font-semibold text-sm" style={{ fontFamily: 'Sora, sans-serif' }}>Key Concepts</h4>
              </div>
              <div className="space-y-2">
                {lecture.keyConcepts.map(({ concept, score }) => (
                  <div key={concept}>
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: 'var(--text-secondary)' }}>{concept}</span>
                      <span style={{ color }}>{Math.round(score * 100)}%</span>
                    </div>
                    <div className="h-1 rounded-full" style={{ background: 'rgba(59,130,246,0.1)' }}>
                      <div className="h-full rounded-full" style={{ width: `${score * 100}%`, background: color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb size={15} className="text-yellow-400" />
              <h4 className="font-semibold text-sm" style={{ fontFamily: 'Sora, sans-serif' }}>Important Points</h4>
            </div>
            <div className="space-y-2">
              {lecture.importantPoints.map((point, i) => (
                <div key={i} className="flex items-start gap-2.5 text-sm p-2.5 rounded-lg"
                     style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.1)' }}>
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5"
                       style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
                    {i + 1}
                  </div>
                  <span style={{ color: 'var(--text-secondary)' }}>{point}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText size={15} className="text-blue-400" />
              <h4 className="font-semibold text-sm" style={{ fontFamily: 'Sora, sans-serif' }}>Lecture Notes</h4>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{lecture.notes}</p>
          </div>

          <div className="flex justify-between mt-4">
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
