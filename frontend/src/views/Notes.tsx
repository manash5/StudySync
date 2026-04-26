import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, ChevronRight, BookOpen, Brain, Clock } from 'lucide-react'
import { backendApi, type NoteItem, type Subject } from '../lib/api'

function formatLastStudied(value?: string): string {
  if (!value) return 'Never'
  const date = new Date(value)
  const diff = Date.now() - date.getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`
  return date.toLocaleDateString()
}

export default function Notes() {
  const navigate = useNavigate()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [notes, setNotes] = useState<NoteItem[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    const run = async () => {
      try {
        const [subjectsRes, notesRes] = await Promise.all([
          backendApi.get<Subject[]>('/subjects'),
          backendApi.get<NoteItem[]>('/notes'),
        ])
        setSubjects(subjectsRes)
        setNotes(notesRes)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load notes')
      }
    }

    void run()
  }, [])

  const notesBySubject = useMemo(() => {
    const map = new Map<string, NoteItem[]>()
    notes.forEach(note => {
      const subjectId = typeof note.subjectId === 'string' ? note.subjectId : note.subjectId._id
      if (!map.has(subjectId)) map.set(subjectId, [])
      map.get(subjectId)?.push(note)
    })
    return map
  }, [notes])

  const totalConcepts = notes.reduce((acc, note) => acc + note.keyConcepts.length, 0)

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      {error && (
        <div className="mb-4 rounded-xl px-3 py-2 text-sm" style={{ color: '#ef4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          {error}
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Subjects', value: String(subjects.length), icon: BookOpen, color: '#3b82f6' },
          { label: 'Lecture Notes', value: String(notes.length), icon: FileText, color: '#8b5cf6' },
          { label: 'Key Concepts', value: String(totalConcepts), icon: Brain, color: '#06b6d4' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="glass-card rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                 style={{ background: `${color}18` }}>
              <Icon size={18} style={{ color }} />
            </div>
            <div>
              <div className="font-bold text-xl" style={{ fontFamily: 'Sora, sans-serif' }}>{value}</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {subjects.map(s => {
          const subjectNotes = notesBySubject.get(s._id) ?? []
          const concepts = Array.from(new Set(subjectNotes.flatMap(n => n.keyConcepts.map(c => c.concept))))
          const progress = s.totalLectures > 0 ? Math.round((s.completedLectures / s.totalLectures) * 100) : 0

          return (
            <div
              key={s._id}
              className="glass-card rounded-2xl p-5 cursor-pointer transition-all hover:scale-[1.02] group"
              style={{ borderLeft: `3px solid ${s.color}` }}
              onClick={() => navigate(`/app/notes/${encodeURIComponent(s.name)}`)}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-base mb-0.5" style={{ fontFamily: 'Sora, sans-serif' }}>{s.name}</h3>
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <Clock size={11} /> {formatLastStudied(s.lastStudied)}
                  </div>
                </div>
                <ChevronRight size={18} className="text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
              </div>

              <div className="mb-3">
                <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                  <span>{subjectNotes.length} notes</span>
                  <span>{progress}% done</span>
                </div>
                <div className="h-1.5 rounded-full" style={{ background: 'rgba(59,130,246,0.1)' }}>
                  <div className="h-full rounded-full" style={{ width: `${progress}%`, background: s.color }} />
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {concepts.slice(0, 3).map(c => (
                  <span key={c} className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: `${s.color}15`, color: s.color, border: `1px solid ${s.color}25` }}>
                    {c}
                  </span>
                ))}
                {concepts.length > 3 && (
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(59,130,246,0.08)', color: 'var(--text-muted)' }}>
                    +{concepts.length - 3} more
                  </span>
                )}
              </div>
            </div>
          )
        })}

        {!subjects.length && (
          <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
            No subjects found. Upload a lecture to generate notes automatically.
          </div>
        )}
      </div>
    </div>
  )
}
