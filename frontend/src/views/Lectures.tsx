import { useState, useRef } from 'react'
import { Upload, Mic, X, Play, Pause, Download, Trash2, Clock, Pencil, Check } from 'lucide-react'

interface Lecture {
  id: number
  subject: string
  fileName: string
  fileSize: string
  duration: string
  uploadedAt: string
  type: 'upload' | 'recording'
}

const demoLectures: Lecture[] = [
  { id: 1, subject: 'Web API Development', fileName: 'Lecture_01_APIs.mp3', fileSize: '45.2 MB', duration: '1:23:45', uploadedAt: '2024-04-20', type: 'upload' },
  { id: 2, subject: 'Mobile Development', fileName: 'Class_Recording_04-25.mp3', fileSize: '52.8 MB', duration: '1:45:20', uploadedAt: '2024-04-25', type: 'recording' },
]

export default function Lectures() {
  const [lectures, setLectures] = useState<Lecture[]>(demoLectures)
  const [isRecording, setIsRecording] = useState(false)
  const [playingId, setPlayingId] = useState<number | null>(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')
  const editInputRef = useRef<HTMLInputElement>(null)

  const startEdit = (lecture: Lecture) => {
    setEditingId(lecture.id)
    setEditingName(lecture.fileName)
    setTimeout(() => editInputRef.current?.focus(), 50)
  }

  const commitEdit = (id: number) => {
    if (editingName.trim()) {
      setLectures(prev => prev.map(l => l.id === id ? { ...l, fileName: editingName.trim() } : l))
    }
    setEditingId(null)
    setEditingName('')
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('audio/')) {
      setSelectedFile(file)
    }
  }

  const handleUpload = () => {
    if (!selectedFile || !selectedSubject) return
    const newLecture: Lecture = {
      id: Date.now(),
      subject: selectedSubject,
      fileName: selectedFile.name,
      fileSize: `${(selectedFile.size / 1024 / 1024).toFixed(1)} MB`,
      duration: '00:00:00',
      uploadedAt: new Date().toLocaleDateString(),
      type: 'upload'
    }
    setLectures(prev => [newLecture, ...prev])
    setShowUploadModal(false)
    setSelectedFile(null)
    setSelectedSubject('')
  }

  const handleStartRecording = () => setIsRecording(true)

  const handleStopRecording = () => {
    setIsRecording(false)
    const newLecture: Lecture = {
      id: Date.now(),
      subject: 'New Recording',
      fileName: `Recording_${new Date().toISOString().slice(0, 10)}.mp3`,
      fileSize: '23.5 MB',
      duration: '45:30',
      uploadedAt: new Date().toLocaleDateString(),
      type: 'recording'
    }
    setLectures(prev => [newLecture, ...prev])
  }

  const handleDelete = (id: number) => {
    setLectures(prev => prev.filter(l => l.id !== id))
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
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
          <button
            onClick={handleStartRecording}
            disabled={isRecording}
            className="px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all"
            style={{
              background: isRecording ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.1)',
              border: `1px solid ${isRecording ? 'rgba(239, 68, 68, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`,
              color: isRecording ? '#ef4444' : '#60a5fa'
            }}
          >
            <Mic size={15} /> {isRecording ? 'Recording...' : 'Record Lecture'}
          </button>
          {isRecording && (
            <button
              onClick={handleStopRecording}
              className="px-4 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all"
              style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', color: '#22c55e' }}
            >
              Stop
            </button>
          )}
        </div>
      </div>

      {/* Lectures List */}
      <div className="space-y-3">
        {lectures.length === 0 ? (
          <div className="text-center py-16" style={{ background: 'var(--bg-secondary)', borderRadius: '16px', border: '1px dashed var(--border-color)' }}>
            <Mic size={48} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>No lectures yet</h3>
            <p style={{ color: 'var(--text-muted)' }}>Upload or record your first lecture to get started</p>
          </div>
        ) : (
          lectures.map(lecture => (
            <div
              key={lecture.id}
              className="glass-card rounded-2xl p-4 flex items-center gap-4 group transition-all"
              style={{ border: '1px solid var(--border-color)' }}
            >
              {/* Play Button */}
              <button
                onClick={() => setPlayingId(playingId === lecture.id ? null : lecture.id)}
                className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                style={{
                  background: playingId === lecture.id ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.1)',
                  color: '#60a5fa'
                }}
              >
                {playingId === lecture.id ? <Pause size={20} /> : <Play size={20} />}
              </button>

              {/* Info — with inline name edit */}
              <div className="flex-1 min-w-0">
                {editingId === lecture.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      ref={editInputRef}
                      value={editingName}
                      onChange={e => setEditingName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') commitEdit(lecture.id)
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
                      onClick={() => commitEdit(lecture.id)}
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
                    {lecture.type === 'recording' ? '🎙️ Recording' : '📁 Upload'}
                  </span>
                  <span>{lecture.subject}</span>
                  <span className="flex items-center gap-1">
                    <Clock size={14} /> {lecture.duration}
                  </span>
                  <span>{lecture.fileSize}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{lecture.uploadedAt}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors hover:bg-blue-500/10"
                  style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
                  title="Download"
                >
                  <Download size={16} />
                </button>
                <button
                  onClick={() => handleDelete(lecture.id)}
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

      {/* Upload Modal */}
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
                <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Lecture File (MP3, WAV, M4A) *</label>
                <label className="flex items-center justify-center gap-3 p-6 rounded-xl cursor-pointer transition-all"
                       style={{ border: '1px dashed var(--border-color)', background: 'rgba(59,130,246,0.03)' }}>
                  <div className="text-center">
                    <Upload size={24} className="mx-auto mb-2" style={{ color: '#60a5fa' }} />
                    <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                      {selectedFile ? selectedFile.name : 'Click to select or drag file here'}
                    </span>
                    <span className="text-xs block mt-1" style={{ color: 'var(--text-muted)' }}>Max 500 MB</span>
                  </div>
                  <input type="file" accept="audio/*" className="hidden" onChange={handleFileSelect} />
                </label>
              </div>

              {selectedFile && (
                <div className="p-3 rounded-xl" style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                  <p className="text-sm font-medium" style={{ color: '#22c55e' }}>✓ File selected: {selectedFile.name}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowUploadModal(false); setSelectedFile(null); }}
                      className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-blue-500/10"
                      style={{ border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                Cancel
              </button>
              <button onClick={handleUpload}
                      disabled={!selectedFile || !selectedSubject}
                      className="btn-primary flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50">
                Upload
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
