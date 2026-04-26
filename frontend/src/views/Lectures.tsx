import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Check,
  ChevronRight,
  Clock,
  Download,
  FileText,
  Mic,
  Pause,
  Pencil,
  Play,
  Square,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { jsPDF } from 'jspdf'
import { aiApi, backendApi, mediaUrl, type AiLectureResponse, type Lecture, type Subject } from '../lib/api'

interface LectureGroup {
  key: string
  label: string
  color: string
  lectures: Lecture[]
  subject?: Subject
}

const UNCATEGORIZED = 'Uncategorized'

function formatRecordingDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return [hours, minutes, seconds].map(value => String(value).padStart(2, '0')).join(':')
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase()
}

function makeSafeFileName(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'recording'
}

function buildAiNotesPdf(
  aiResult: AiLectureResponse,
  lectureLabel: string,
  subjectName: string,
): Blob {
  const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 48
  const maxLineWidth = pageWidth - margin * 2
  let cursorY = margin

  const ensureSpace = (neededHeight: number) => {
    if (cursorY + neededHeight > pageHeight - margin) {
      doc.addPage()
      cursorY = margin
    }
  }

  const writeHeading = (text: string) => {
    ensureSpace(28)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(15)
    doc.text(text, margin, cursorY)
    cursorY += 22
  }

  const writeParagraph = (text: string) => {
    const cleaned = text.trim()
    if (!cleaned) return
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    const wrapped = doc.splitTextToSize(cleaned, maxLineWidth)
    ensureSpace(wrapped.length * 14 + 8)
    doc.text(wrapped, margin, cursorY)
    cursorY += wrapped.length * 14 + 8
  }

  const writeList = (items: string[]) => {
    if (items.length === 0) {
      writeParagraph('Not provided by AI.')
      return
    }

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    items.forEach((item, index) => {
      const line = `${index + 1}. ${item.trim()}`
      const wrapped = doc.splitTextToSize(line, maxLineWidth)
      ensureSpace(wrapped.length * 14 + 4)
      doc.text(wrapped, margin, cursorY)
      cursorY += wrapped.length * 14 + 4
    })
    cursorY += 4
  }

  const topic = (aiResult.topic || subjectName || lectureLabel).trim()
  const keyConcepts = (aiResult.key_concepts || []).filter(Boolean)
  const importantPoints = (aiResult.important_points || []).filter(Boolean)
  const prerequisites = (aiResult.prerequisites || []).filter(Boolean)
  const detailedExplanation = (aiResult.detailed_explanation || '').trim()

  writeHeading('StudySync AI Lecture Notes')
  writeParagraph(`Lecture: ${lectureLabel}`)
  writeParagraph(`Subject: ${subjectName}`)
  writeParagraph(`Generated: ${new Date().toLocaleString()}`)

  writeHeading('Main Topic')
  writeParagraph(topic)

  writeHeading('Prerequisites')
  writeList(prerequisites)

  writeHeading('Key Concepts')
  writeList(keyConcepts)

  writeHeading('Important Points')
  writeList(importantPoints)

  writeHeading('Detailed Explanation')
  writeParagraph(detailedExplanation || 'No detailed explanation was returned by AI.')

  return doc.output('blob')
}

export default function Lectures() {
  const navigate = useNavigate()
  const [lectures, setLectures] = useState<Lecture[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showRecorderModal, setShowRecorderModal] = useState(false)
  const [activeSubjectName, setActiveSubjectName] = useState('')
  const [activeSubjectColor, setActiveSubjectColor] = useState('#3b82f6')
  const [manualSubject, setManualSubject] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [showGeneratedNotesModal, setShowGeneratedNotesModal] = useState(false)
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState<string | null>(null)
  const [generatedTopic, setGeneratedTopic] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const editInputRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const recordingChunksRef = useRef<BlobPart[]>([])
  const recordingTimerRef = useRef<number | null>(null)
  const recordingSecondsRef = useRef(0)
  const recordingShouldSaveRef = useRef(false)
  const recordingSubjectRef = useRef('')

  const loadData = async () => {
    try {
      const [lecturesRes, subjectsRes] = await Promise.all([
        backendApi.get<Lecture[]>('/lectures'),
        backendApi.get<Subject[]>('/subjects'),
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

  useEffect(() => {
    return () => {
      audioRef.current?.pause()
      mediaRecorderRef.current?.stop()
      mediaStreamRef.current?.getTracks().forEach(track => track.stop())
      if (recordingTimerRef.current) {
        window.clearInterval(recordingTimerRef.current)
      }
      if (generatedPdfUrl) {
        URL.revokeObjectURL(generatedPdfUrl)
      }
    }
  }, [generatedPdfUrl])

  const closeGeneratedNotesModal = () => {
    setShowGeneratedNotesModal(false)
  }

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
      setLectures(prev => prev.map(item => (item._id === lecture._id ? updated : item)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename lecture')
    } finally {
      setEditingId(null)
      setEditingName('')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await backendApi.delete<{ message: string }>(`/lectures/${id}`)
      setLectures(prev => prev.filter(item => item._id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  const ensureSubjectId = async (subjectName: string): Promise<string> => {
    const normalizedName = subjectName.trim()
    const existing = subjects.find(item => normalizeKey(item.name) === normalizeKey(normalizedName))
    if (existing) return existing._id

    const created = await backendApi.post<Subject>('/subjects', { name: normalizedName, color: activeSubjectColor || '#3b82f6' })
    setSubjects(prev => [...prev, created])
    return created._id
  }

  const processLectureAsset = async (subjectName: string, file: File, lectureType: Lecture['type'], duration?: string) => {
    const cleanedSubject = subjectName.trim()
    if (!cleanedSubject) {
      throw new Error('Please choose a subject before uploading.')
    }

    setIsUploading(true)
    setError('')
    setSuccess('')

    try {
      const canRunAi = file.type === 'audio/webm' || file.type === 'audio/mpeg' || /\.(mp3|webm)$/i.test(file.name)
      if (!canRunAi) {
        const lectureForm = new FormData()
        lectureForm.append('file', file)
        lectureForm.append('subject', cleanedSubject)
        lectureForm.append('type', lectureType)
        if (duration) {
          lectureForm.append('duration', duration)
        }

        const createdLecture = await backendApi.post<Lecture>('/lectures', lectureForm)
        setLectures(prev => [createdLecture, ...prev])
        await ensureSubjectId(cleanedSubject)
        setSuccess(`${lectureType === 'recording' ? 'Recording' : 'Lecture'} saved under ${cleanedSubject}. AI notes are supported for .mp3 and .webm files.`)
        return
      }

      const lectureForm = new FormData()
      const aiForm = new FormData()
      aiForm.append('file', file)
      const aiResult = await aiApi.post<AiLectureResponse>('/lecture/upload-lecture', aiForm)

      const subjectId = await ensureSubjectId(cleanedSubject)
      lectureForm.append('file', file)
      lectureForm.append('subject', cleanedSubject)
      lectureForm.append('type', lectureType)
      if (duration) {
        lectureForm.append('duration', duration)
      }

      const createdLecture = await backendApi.post<Lecture>('/lectures', lectureForm)
      setLectures(prev => [createdLecture, ...prev])

      await backendApi.post('/notes', {
        subjectId,
        lectureId: createdLecture._id,
        title: aiResult.topic || createdLecture.fileName,
        lectureNumber: `Lecture ${new Date().toLocaleDateString()}`,
        duration: `${Math.max(1, Math.round(aiResult.lecturer_duration_seconds || 0))} sec`,
        mainTopic: aiResult.topic || cleanedSubject,
        prerequisites: aiResult.prerequisites || [],
        keyConcepts: (aiResult.key_concepts || []).map((concept) => ({ concept, score: 0.8 })),
        importantPoints: aiResult.important_points || [],
        notes: aiResult.detailed_explanation || 'No detailed explanation provided by AI.',
      })

      await loadData()

      const nextPdf = buildAiNotesPdf(aiResult, createdLecture.fileName, cleanedSubject)
      if (generatedPdfUrl) {
        URL.revokeObjectURL(generatedPdfUrl)
      }
      const nextPdfUrl = URL.createObjectURL(nextPdf)
      setGeneratedPdfUrl(nextPdfUrl)
      setGeneratedTopic(aiResult.topic || createdLecture.fileName)
      setShowGeneratedNotesModal(true)

      setSuccess(`${lectureType === 'recording' ? 'Recording' : 'Lecture'} saved under ${cleanedSubject} and AI notes were generated.`)
    } finally {
      setIsUploading(false)
    }
  }

  const openUploadModal = (subjectName = '', color = '#3b82f6') => {
    setActiveSubjectName(subjectName)
    setActiveSubjectColor(color)
    setManualSubject(subjectName)
    setSelectedFile(null)
    setError('')
    setSuccess('')
    setShowUploadModal(true)
  }

  const closeUploadModal = () => {
    setShowUploadModal(false)
    setSelectedFile(null)
    setManualSubject('')
    setActiveSubjectName('')
    setActiveSubjectColor('#3b82f6')
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('audio/') && !file.type.startsWith('video/')) {
      setError('Please choose an audio or video lecture file.')
      return
    }

    setSelectedFile(file)
    setError('')
  }

  const startRecording = async () => {
    const subjectName = activeSubjectName.trim() || manualSubject.trim()
    if (!subjectName) {
      setError('Please choose a subject before recording.')
      return
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Recording is not supported in this browser.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = MediaRecorder.isTypeSupported('audio/webm')
        ? new MediaRecorder(stream, { mimeType: 'audio/webm' })
        : new MediaRecorder(stream)

      recordingChunksRef.current = []
      recordingSecondsRef.current = 0
      recordingShouldSaveRef.current = true
      recordingSubjectRef.current = subjectName
      setRecordingSeconds(0)
      setIsRecording(true)
      setError('')
      setSuccess('')

      mediaStreamRef.current = stream
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = event => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data)
        }
      }

      recorder.onstop = async () => {
        const shouldSave = recordingShouldSaveRef.current
        const subject = recordingSubjectRef.current
        const elapsed = recordingSecondsRef.current
        const chunks = recordingChunksRef.current.slice()

        if (recordingTimerRef.current) {
          window.clearInterval(recordingTimerRef.current)
          recordingTimerRef.current = null
        }

        mediaRecorderRef.current = null
        mediaStreamRef.current?.getTracks().forEach(track => track.stop())
        mediaStreamRef.current = null
        setIsRecording(false)
        setRecordingSeconds(0)
        recordingChunksRef.current = []

        if (!shouldSave || !subject || chunks.length === 0) {
          return
        }

        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' })
        const file = new File(
          [blob],
          `${makeSafeFileName(subject)}-${Date.now()}.webm`,
          { type: blob.type || 'audio/webm' },
        )

        await processLectureAsset(subject, file, 'recording', formatRecordingDuration(elapsed))
      }

      recorder.start()

      recordingTimerRef.current = window.setInterval(() => {
        recordingSecondsRef.current += 1
        setRecordingSeconds(recordingSecondsRef.current)
      }, 1000)
    } catch (err) {
      setIsRecording(false)
      setError(err instanceof Error ? err.message : 'Unable to start recording')
    }
  }

  const stopRecording = () => {
    recordingShouldSaveRef.current = true
    mediaRecorderRef.current?.stop()
  }

  const cancelRecording = () => {
    recordingShouldSaveRef.current = false
    mediaRecorderRef.current?.stop()
  }

  const openRecorderModal = (subjectName = '', color = '#3b82f6') => {
    setActiveSubjectName(subjectName)
    setActiveSubjectColor(color)
    setManualSubject(subjectName)
    setError('')
    setSuccess('')
    setRecordingSeconds(0)
    recordingShouldSaveRef.current = false
    setShowRecorderModal(true)
  }

  const closeRecorderModal = () => {
    if (isRecording) {
      cancelRecording()
    }
    setShowRecorderModal(false)
    setActiveSubjectName('')
    setActiveSubjectColor('#3b82f6')
    setManualSubject('')
    setRecordingSeconds(0)
  }

  const submitUpload = async () => {
    const subjectName = activeSubjectName.trim() || manualSubject.trim()
    if (!selectedFile) {
      setError('Please choose a file to upload.')
      return
    }

    if (!subjectName) {
      setError('Please choose a subject before uploading.')
      return
    }

    try {
      await processLectureAsset(subjectName, selectedFile, 'upload')
      closeUploadModal()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed while sending lecture to ai-services.')
    }
  }

  const groupedLectures = useMemo(() => {
    const lectureMap = new Map<string, Lecture[]>()
    const labelMap = new Map<string, string>()

    for (const lecture of lectures) {
      const label = lecture.subject?.trim() || UNCATEGORIZED
      const key = normalizeKey(label)
      if (!lectureMap.has(key)) {
        lectureMap.set(key, [])
        labelMap.set(key, label)
      }
      lectureMap.get(key)!.push(lecture)
    }

    const cards: LectureGroup[] = []
    const seen = new Set<string>()

    for (const subject of subjects) {
      const key = normalizeKey(subject.name)
      cards.push({
        key,
        label: subject.name,
        color: subject.color || '#3b82f6',
        lectures: lectureMap.get(key) || [],
        subject,
      })
      seen.add(key)
    }

    for (const [key, lecturesForCard] of lectureMap.entries()) {
      if (seen.has(key)) continue
      cards.push({
        key,
        label: labelMap.get(key) || UNCATEGORIZED,
        color: '#64748b',
        lectures: lecturesForCard,
      })
    }

    return cards.sort((left, right) => {
      if (left.subject && right.subject) return left.label.localeCompare(right.label)
      if (left.subject) return -1
      if (right.subject) return 1
      return left.label.localeCompare(right.label)
    })
  }, [lectures, subjects])

  const totalLectures = lectures.length

  const renderLectureRow = (lecture: Lecture) => {
    const isEditing = editingId === lecture._id

    return (
      <div
        key={lecture._id}
        className="rounded-2xl border p-4 transition-all"
        style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (playingId === lecture._id) {
                audioRef.current?.pause()
                setPlayingId(null)
                return
              }

              if (!audioRef.current) {
                audioRef.current = new Audio(mediaUrl(lecture.fileUrl))
              }

              if (audioRef.current.src !== mediaUrl(lecture.fileUrl)) {
                audioRef.current.pause()
                audioRef.current = new Audio(mediaUrl(lecture.fileUrl))
                audioRef.current.onended = () => setPlayingId(null)
              }

              void audioRef.current.play()
              setPlayingId(lecture._id)
            }}
            className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
            style={{
              background: playingId === lecture._id ? 'rgba(59, 130, 246, 0.28)' : 'rgba(59, 130, 246, 0.12)',
              color: '#60a5fa',
            }}
          >
            {playingId === lecture._id ? <Pause size={18} /> : <Play size={18} />}
          </button>

          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="flex items-center gap-2">
                <input
                  ref={editInputRef}
                  value={editingName}
                  onChange={e => setEditingName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') void commitEdit(lecture)
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                  className="flex-1 px-3 py-2 rounded-lg text-sm font-semibold outline-none"
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
              <div className="flex items-center gap-2 group/name min-w-0">
                <h4 className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                  {lecture.fileName}
                </h4>
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

            <div className="flex flex-wrap items-center gap-3 mt-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wide"
                style={{
                  background: lecture.type === 'recording' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                  color: lecture.type === 'recording' ? '#ef4444' : '#60a5fa',
                }}
              >
                {lecture.type === 'recording' ? 'Recording' : 'Upload'}
              </span>
              <span>{lecture.subject || UNCATEGORIZED}</span>
              <span className="flex items-center gap-1"><Clock size={14} /> {lecture.duration}</span>
              <span>{lecture.fileSize}</span>
              <span style={{ color: 'var(--text-muted)' }}>{new Date(lecture.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
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
      </div>
    )
  }

  return (
    <div className="animate-fade-in pb-12 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div>
          <h2 className="text-2xl font-bold" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text-primary)' }}>
            Lecture Library
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {totalLectures} lectures stored across {groupedLectures.length || 0} subject cards
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => openUploadModal()}
            className="btn-primary px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2"
          >
            <Upload size={15} /> Upload Lecture
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl px-3 py-2 text-sm" style={{ color: '#ef4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl px-3 py-2 text-sm" style={{ color: '#10b981', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
          {success}
        </div>
      )}

      {groupedLectures.length === 0 ? (
        <div className="text-center py-16 rounded-3xl" style={{ background: 'var(--bg-secondary)', border: '1px dashed var(--border-color)' }}>
          <Upload size={48} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>No subjects yet</h3>
          <p style={{ color: 'var(--text-muted)' }}>Upload a routine to auto-create subjects, then add lectures under each card.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {groupedLectures.map(group => (
            <section
              key={group.key}
              className="glass-card rounded-[28px] p-5 border"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <div className="flex items-start justify-between gap-4 mb-5">
                <button
                  onClick={() => navigate(`/app/notes/${encodeURIComponent(group.label)}`)}
                  className="min-w-0 text-left group/card"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${group.color}18` }}>
                      <span className="w-3 h-3 rounded-full" style={{ background: group.color }} />
                    </div>
                    <h3 className="font-bold truncate" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text-primary)' }}>
                      {group.label}
                    </h3>
                    <ChevronRight size={16} className="opacity-0 group-hover/card:opacity-100 transition-opacity" style={{ color: 'var(--text-muted)' }} />
                  </div>
                  <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                    {group.lectures.length} lecture{group.lectures.length === 1 ? '' : 's'}
                  </p>
                </button>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => openUploadModal(group.subject?.name || group.label, group.color)}
                    className="px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                    style={{ background: 'rgba(59,130,246,0.08)', color: '#3b82f6' }}
                  >
                    <Upload size={13} /> Upload
                  </button>
                  <button
                    onClick={() => openRecorderModal(group.subject?.name || group.label, group.color)}
                    className="px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                    style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444' }}
                  >
                    <Mic size={13} /> Record
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {group.lectures.length === 0 ? (
                  <div className="rounded-2xl border border-dashed px-4 py-6 text-sm text-center" style={{ color: 'var(--text-muted)' }}>
                    No lectures yet in this subject.
                  </div>
                ) : (
                  group.lectures.map(renderLectureRow)
                )}
              </div>
            </section>
          ))}
        </div>
      )}

      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-md glass-card rounded-3xl p-6 animate-fade-in-up" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text-primary)' }}>
                Upload Lecture
              </h3>
              <button
                onClick={closeUploadModal}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-blue-500/10 transition-colors"
                style={{ color: 'var(--text-muted)' }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl px-4 py-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                <p className="text-[11px] uppercase tracking-[0.16em] mb-1" style={{ color: 'var(--text-muted)' }}>Step 1</p>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Choose subject and lecture file</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  AI note generation is triggered from ai-services after upload for .mp3 and .webm.
                </p>
              </div>

              {!activeSubjectName && (
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Subject/Course *</label>
                  <input
                    value={manualSubject}
                    onChange={e => setManualSubject(e.target.value)}
                    placeholder="e.g. Web API Development"
                    className="input-field w-full px-3.5 py-2.5 rounded-xl text-sm"
                  />
                </div>
              )}

              {activeSubjectName && (
                <div className="rounded-2xl px-4 py-3" style={{ background: `${activeSubjectColor}12`, border: `1px solid ${activeSubjectColor}25`, color: 'var(--text-primary)' }}>
                  <p className="text-xs uppercase tracking-[0.18em] mb-1" style={{ color: 'var(--text-muted)' }}>Subject card</p>
                  <p className="font-semibold">{activeSubjectName}</p>
                </div>
              )}

              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Lecture File *</label>
                <label
                  className="block rounded-xl cursor-pointer transition-all"
                  style={{ border: '1px dashed var(--border-color)', background: 'rgba(59,130,246,0.03)' }}
                >
                  <div className="px-4 py-5 text-center">
                    <Upload size={24} className="mx-auto mb-2" style={{ color: '#60a5fa' }} />
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {selectedFile ? selectedFile.name : 'Select lecture audio/video'}
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      Supported for notes: .mp3 and .webm
                    </p>
                  </div>
                  <input type="file" accept="audio/*,video/*" className="hidden" onChange={handleFileSelect} />
                </label>
              </div>

              <div className="rounded-2xl px-4 py-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                <p className="text-[11px] uppercase tracking-[0.16em] mb-1" style={{ color: 'var(--text-muted)' }}>Step 2</p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Upload saves the lecture first, then calls ai-services upload endpoint, creates a note, and opens the generated PDF.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={closeUploadModal}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-blue-500/10"
                style={{ border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
              <button
                onClick={() => void submitUpload()}
                disabled={!selectedFile || !(activeSubjectName || manualSubject.trim()) || isUploading}
                className="btn-primary flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
              >
                {isUploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRecorderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-md glass-card rounded-3xl p-6 animate-fade-in-up" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text-primary)' }}>
                Record Lecture
              </h3>
              <button
                onClick={closeRecorderModal}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-blue-500/10 transition-colors"
                style={{ color: 'var(--text-muted)' }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              {!activeSubjectName && (
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Subject/Course *</label>
                  <input
                    value={manualSubject}
                    onChange={e => setManualSubject(e.target.value)}
                    placeholder="e.g. Web API Development"
                    className="input-field w-full px-3.5 py-2.5 rounded-xl text-sm"
                  />
                </div>
              )}

              {activeSubjectName && (
                <div className="rounded-2xl px-4 py-3" style={{ background: `${activeSubjectColor}12`, border: `1px solid ${activeSubjectColor}25`, color: 'var(--text-primary)' }}>
                  <p className="text-xs uppercase tracking-[0.18em] mb-1" style={{ color: 'var(--text-muted)' }}>Recording into</p>
                  <p className="font-semibold">{activeSubjectName}</p>
                </div>
              )}

              <div className="rounded-2xl p-5 text-center" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                <div className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: isRecording ? 'rgba(239,68,68,0.12)' : 'rgba(59,130,246,0.10)', color: isRecording ? '#ef4444' : '#3b82f6' }}>
                  {isRecording ? <Square size={22} /> : <Mic size={22} />}
                </div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {isRecording ? `Recording ${formatRecordingDuration(recordingSeconds)}` : 'Ready to record a new lecture.'}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  Use Stop & Save to store the audio inside the subject card.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={isRecording ? cancelRecording : closeRecorderModal}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-blue-500/10"
                style={{ border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
              >
                {isRecording ? 'Cancel Recording' : 'Close'}
              </button>
              <button
                onClick={() => {
                  if (isRecording) {
                    stopRecording()
                  } else {
                    void startRecording()
                  }
                }}
                disabled={isUploading}
                className="btn-primary flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
              >
                {isRecording ? 'Stop & Save' : 'Start Recording'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showGeneratedNotesModal && generatedPdfUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(5px)' }}>
          <div className="w-full max-w-5xl glass-card rounded-3xl p-5 animate-fade-in-up" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-lg font-bold" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text-primary)' }}>
                  AI Notes PDF Ready
                </h3>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                  {generatedTopic || 'Lecture notes'} was generated and converted to PDF.
                </p>
              </div>
              <button
                onClick={closeGeneratedNotesModal}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-blue-500/10 transition-colors"
                style={{ color: 'var(--text-muted)' }}
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
              <iframe
                title="Generated lecture notes PDF"
                src={generatedPdfUrl}
                className="w-full"
                style={{ height: '68vh', border: 0 }}
              />
            </div>

            <div className="flex items-center justify-end gap-3 mt-4">
              <a
                href={generatedPdfUrl}
                download={`${makeSafeFileName(generatedTopic || 'lecture-notes')}.pdf`}
                className="px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2"
                style={{ background: 'rgba(59,130,246,0.14)', color: '#60a5fa' }}
              >
                <FileText size={15} /> Download PDF
              </a>
              <button
                onClick={closeGeneratedNotesModal}
                className="px-4 py-2 rounded-xl text-sm font-semibold"
                style={{ border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
