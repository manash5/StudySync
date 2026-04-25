import { useEffect, useRef, useState } from 'react'
import { Upload, X, Play, Pause, Download, Trash2, Clock, Pencil, Check } from 'lucide-react'
import { aiApi, backendApi, mediaUrl, type AiLectureResponse, type Lecture, type Subject } from '../lib/api'

export default function Lectures() {
  const [lectures, setLectures] = useState<Lecture[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const editInputRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const loadData = async () => {
    try {
      const [lecturesRes, subjectsRes] = await Promise.all([
        backendApi.get<Lecture[]>('/api/lectures'),
        backendApi.get<Subject[]>('/api/subjects'),
      ])
      setLectures(lecturesRes)
      setSubjects(subjectsRes)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load lectures')
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const startEdit = (lecture: Lecture) => {
    setEditingId(lecture._id)
    setEditingName(lecture.fileName)
    setTimeout(() => editInputRef.current?.focus(), 50)
  }

  const commitEdit = async (lecture: Lecture) => {
    const name = editingName.trim()
    if (!name) {
      setEditingId(null)
      return
    }

    try {
      const updated = await backendApi.put<Lecture>(`/lectures/${lecture._id}`, {
        fileName: name,
        subject: lecture.subject,
      })
      setLectures(prev => prev.map(l => l._id === lecture._id ? updated : l))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename lecture')
    } finally {
      setEditingId(null)
      setEditingName('')
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('audio/') && !file.type.startsWith('video/')) {
      setError('Please choose an audio/video lecture file.')
      return
    }

    setSelectedFile(file)
    setError('')
  }

  const ensureSubjectId = async (subjectName: string): Promise<string> => {
    const existing = subjects.find(s => s.name.toLowerCase() === subjectName.toLowerCase())
    if (existing) return existing._id

    const created = await backendApi.post<Subject>('/subjects', { name: subjectName, color: '#3b82f6' })
    setSubjects(prev => [...prev, created])
    return created._id
  }

  const handleUpload = async () => {
    if (!selectedFile || !selectedSubject.trim()) return

    setIsUploading(true)
    setError('')
    setSuccess('')

    try {
      const lectureForm = new FormData()
      lectureForm.append('file', selectedFile)
      lectureForm.append('subject', selectedSubject.trim())
      const createdLecture = await backendApi.post<Lecture>('/lectures', lectureForm)
      setLectures(prev => [createdLecture, ...prev])

      // Run AI lecture extraction directly from ai-services and store structured note in backend.
      const aiForm = new FormData()
      aiForm.append('file', selectedFile)
      const aiResult = await aiApi.post<AiLectureResponse>('/lecture/upload-lecture', aiForm)

      const subjectId = await ensureSubjectId(selectedSubject.trim())
      await backendApi.post('/notes', {
        subjectId,
        lectureId: createdLecture._id,
        title: aiResult.topic || createdLecture.fileName,
        lectureNumber: `Lecture ${new Date().toLocaleDateString()}`,
        duration: `${Math.max(1, Math.round(aiResult.lecturer_duration_seconds || 0))} sec`,
        mainTopic: aiResult.topic || selectedSubject.trim(),
        prerequisites: aiResult.prerequisites || [],
        keyConcepts: (aiResult.key_concepts || []).map((concept) => ({ concept, score: 0.8 })),
        importantPoints: aiResult.important_points || [],
        notes: aiResult.detailed_explanation || 'No detailed explanation provided by AI.',
      })

      setSuccess('Lecture uploaded and AI notes were generated successfully.')
      setShowUploadModal(false)
      setSelectedFile(null)
      setSelectedSubject('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await backendApi.delete<{ message: string }>(`/lectures/${id}`)
      setLectures(prev => prev.filter(l => l._id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  const togglePlay = (lecture: Lecture) => {
    if (!audioRef.current) {
      audioRef.current = new Audio(mediaUrl(lecture.fileUrl))
    }

    if (playingId === lecture._id) {
      audioRef.current.pause()
      setPlayingId(null)
      return
    }

    if (audioRef.current.src !== mediaUrl(lecture.fileUrl)) {
      audioRef.current.pause()
      audioRef.current = new Audio(mediaUrl(lecture.fileUrl))
      audioRef.current.onended = () => setPlayingId(null)
    }

    void audioRef.current.play()
    setPlayingId(lecture._id)
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text-primary)' }}>Lecture Library</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{lectures.length} lectures stored</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowUploadModal(true)}
            className="btn-primary px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2"
          >
            <Upload size={15} /> Upload Lecture
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl px-3 py-2 text-sm" style={{ color: '#ef4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-xl px-3 py-2 text-sm" style={{ color: '#10b981', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
          {success}
        </div>
      )}

      <div className="space-y-3">
        {lectures.length === 0 ? (
          <div className="text-center py-16" style={{ background: 'var(--bg-secondary)', borderRadius: '16px', border: '1px dashed var(--border-color)' }}>
            <Upload size={48} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>No lectures yet</h3>
            <p style={{ color: 'var(--text-muted)' }}>Upload your first lecture to generate AI notes.</p>
          </div>
        ) : (
          lectures.map(lecture => (
            <div
              key={lecture._id}
              className="glass-card rounded-2xl p-4 flex items-center gap-4 group transition-all"
              style={{ border: '1px solid var(--border-color)' }}
            >
              <button
                onClick={() => togglePlay(lecture)}
                className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                style={{
                  background: playingId === lecture._id ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.1)',
                  color: '#60a5fa',
                }}
              >
                {playingId === lecture._id ? <Pause size={20} /> : <Play size={20} />}
              </button>

              <div className="flex-1 min-w-0">
                {editingId === lecture._id ? (
                  <div className="flex items-center gap-2">
                    <input
                      ref={editInputRef}
                      value={editingName}
                      onChange={e => setEditingName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') void commitEdit(lecture)
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                      className="flex-1 px-3 py-1.5 rounded-lg text-sm font-semibold outline-none"
                      style={{
                        background: 'var(--bg-tertiary)',
                        border: '1.5px solid #3b82f6',
                        color: 'var(--text-primary)',
                      }}
                    />
                    <button
                      onClick={() => void commitEdit(lecture)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                      style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                      style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 group/name">
                    <h3 className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{lecture.fileName}</h3>
                    <button
                      onClick={() => startEdit(lecture)}
                      title="Rename"
                      className="opacity-0 group-hover/name:opacity-100 transition-opacity w-6 h-6 rounded flex items-center justify-center hover:bg-blue-500/10"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <Pencil size={12} />
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-4 mt-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: lecture.type === 'recording' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)', color: lecture.type === 'recording' ? '#ef4444' : '#60a5fa' }}>
                    {lecture.type === 'recording' ? 'Recording' : 'Upload'}
                  </span>
                  <span>{lecture.subject || 'Uncategorized'}</span>
                  <span className="flex items-center gap-1">
                    <Clock size={14} /> {lecture.duration}
                  </span>
                  <span>{lecture.fileSize}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{new Date(lecture.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <a
                  href={mediaUrl(lecture.fileUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors hover:bg-blue-500/10"
                  style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
                  title="Download"
                >
                  <Download size={16} />
                </a>
                <button
                  onClick={() => void handleDelete(lecture._id)}
                  className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors hover:bg-red-500/10"
                  style={{ color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-md glass-card rounded-3xl p-6 animate-fade-in-up"
               style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text-primary)' }}>Upload Lecture</h3>
              <button onClick={() => { setShowUploadModal(false); setSelectedFile(null); }}
                      className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-blue-500/10 transition-colors"
                      style={{ color: 'var(--text-muted)' }}>
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Subject/Course *</label>
                <input
                  value={selectedSubject}
                  onChange={e => setSelectedSubject(e.target.value)}
                  placeholder="e.g. Web API Development"
                  className="input-field w-full px-3.5 py-2.5 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Lecture File *</label>
                <label className="flex items-center justify-center gap-3 p-6 rounded-xl cursor-pointer transition-all"
                       style={{ border: '1px dashed var(--border-color)', background: 'rgba(59,130,246,0.03)' }}>
                  <div className="text-center">
                    <Upload size={24} className="mx-auto mb-2" style={{ color: '#60a5fa' }} />
                    <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                      {selectedFile ? selectedFile.name : 'Click to select or drag file here'}
                    </span>
                  </div>
                  <input type="file" accept="audio/*,video/*" className="hidden" onChange={handleFileSelect} />
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowUploadModal(false); setSelectedFile(null); }}
                      className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-blue-500/10"
                      style={{ border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                Cancel
              </button>
              <button onClick={() => void handleUpload()}
                      disabled={!selectedFile || !selectedSubject || isUploading}
                      className="btn-primary flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50">
                {isUploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
