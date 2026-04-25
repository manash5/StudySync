import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, X, Clock, BookOpen, Upload, Trash2, CalendarDays } from 'lucide-react'

interface RoutineItem {
  id: number
  subject: string
  day: string
  startTime: string // HH:MM format
  endTime: string   // HH:MM format
  room: string
  lecturer: string
  color: string
  status: 'active' | 'cancelled' | 'paused'
  code?: string
  image?: string
}

interface RoutineUploadResult {
  subject: string
  day: string
  startTime: string
  endTime: string
  room?: string
  lecturer?: string
  code?: string
  status?: 'active' | 'cancelled' | 'paused'
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444']

const demoRoutines: RoutineItem[] = [
  { id: 1, subject: 'Web API Development', day: 'Monday', startTime: '09:00', endTime: '11:00', room: 'Block E - SL-6', lecturer: 'ST6003CEM', color: '#10b981', status: 'active', code: 'ST6003CEM' },
  { id: 2, subject: 'Mobile Application Development', day: 'Monday', startTime: '11:00', endTime: '13:00', room: 'Block E - SL-6', lecturer: 'ST6002CEM', color: '#10b981', status: 'active', code: 'ST6002CEM' },
  { id: 3, subject: 'Seminar Hall Design Thinking', day: 'Tuesday', startTime: '09:00', endTime: '11:00', room: 'Seminar Hall STA309IAE', lecturer: 'STA309IAE', color: '#10b981', status: 'active' },
  { id: 4, subject: 'Web API Development', day: 'Wednesday', startTime: '09:00', endTime: '11:00', room: 'Block E - SL-6', lecturer: 'ST6003CEM', color: '#10b981', status: 'active', code: 'ST6003CEM' },
  { id: 5, subject: 'Mobile Application Development', day: 'Wednesday', startTime: '11:00', endTime: '13:00', room: 'Block E - SL-6', lecturer: 'ST6002CEM', color: '#10b981', status: 'active', code: 'ST6002CEM' },
  { id: 6, subject: 'Web API Development', day: 'Friday', startTime: '09:00', endTime: '11:00', room: 'Block E - SL-6', lecturer: 'ST6003CEM', color: '#10b981', status: 'active', code: 'ST6003CEM' },
  { id: 7, subject: 'Mobile Application Development', day: 'Friday', startTime: '11:00', endTime: '13:00', room: 'Block E - SL-6', lecturer: 'ST6002CEM', color: '#10b981', status: 'active', code: 'ST6002CEM' },
]

const studyRoutines: RoutineItem[] = [
  { id: 101, subject: 'ML Review', day: 'Monday', startTime: '14:00', endTime: '16:00', room: 'Library', lecturer: 'Self', color: '#ef4444', status: 'active' },
  { id: 102, subject: 'Math Practice', day: 'Tuesday', startTime: '11:00', endTime: '13:00', room: 'Dorm', lecturer: 'Self', color: '#ef4444', status: 'active' },
  { id: 103, subject: 'Coding Lab', day: 'Wednesday', startTime: '14:00', endTime: '17:00', room: 'Computer Lab', lecturer: 'Self', color: '#ef4444', status: 'active' },
  { id: 104, subject: 'Project Work', day: 'Thursday', startTime: '09:00', endTime: '12:00', room: 'Cafe', lecturer: 'Self', color: '#ef4444', status: 'active' },
]

// Generate time slots from 6:00 AM to 6:00 PM
const TIME_SLOTS = Array.from({ length: 25 }, (_, i) => {
  const hour = 6 + i
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
  const period = hour >= 12 ? 'PM' : 'AM'
  return `${String(displayHour).padStart(2, '0')}:00 ${period}`
})

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

function getPositionAndHeight(startTime: string, endTime: string) {
  const start = timeToMinutes(startTime)
  const end = timeToMinutes(endTime)
  const startSlot = (start - 360) / 60 // 360 = 6:00 AM in minutes
  const duration = (end - start) / 60
  return { top: startSlot * 60, height: duration * 60 }
}

export default function Routine() {
  const [routines, setRoutines] = useState<RoutineItem[]>([...demoRoutines, ...studyRoutines])
  const [showModal, setShowModal] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [routineUploadFile, setRoutineUploadFile] = useState<File | null>(null)
  const [routineUploadPreview, setRoutineUploadPreview] = useState<string | null>(null)
  const [isAnalyzingRoutine, setIsAnalyzingRoutine] = useState(false)
  const [uploadRoutineError, setUploadRoutineError] = useState('')
  const navigate = useNavigate()

  const [form, setForm] = useState({
    subject: '',
    day: 'Monday',
    startTime: '09:00',
    endTime: '11:00',
    room: '',
    lecturer: '',
    code: '',
    color: '#10b981',
    status: 'active' as const
  })

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => setImagePreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleAdd = () => {
    if (!form.subject || !form.startTime || !form.endTime) return
    setRoutines(prev => [...prev, { ...form, id: Date.now(), image: imagePreview || undefined }])
    setShowModal(false)
    setForm({
      subject: '', day: 'Monday', startTime: '09:00', endTime: '11:00', 
      room: '', lecturer: '', code: '', color: '#10b981', status: 'active'
    })
    setImagePreview(null)
  }

  const handleDelete = (id: number) => {
    setDeleteConfirmId(id)
    setShowDeleteConfirm(true)
  }

  const handleRoutineScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    if (!validTypes.includes(file.type)) {
      setUploadRoutineError('Please upload a PNG, JPG, JPEG, or WEBP image.')
      return
    }

    const previewUrl = URL.createObjectURL(file)
    setRoutineUploadFile(file)
    setRoutineUploadPreview(previewUrl)
    setUploadRoutineError('')
  }

  const closeUploadRoutineModal = () => {
    setShowUploadModal(false)
    setUploadRoutineError('')
    setRoutineUploadFile(null)
    if (routineUploadPreview) {
      URL.revokeObjectURL(routineUploadPreview)
    }
    setRoutineUploadPreview(null)
  }

  const normalizeRoutineFromBackend = (entry: RoutineUploadResult, index: number): RoutineItem | null => {
    const normalizedDay = DAYS.find((d) => d.toLowerCase() === entry.day?.toLowerCase())
    const validTime = /^([01]\d|2[0-3]):[0-5]\d$/
    if (!entry.subject || !normalizedDay || !validTime.test(entry.startTime) || !validTime.test(entry.endTime)) {
      return null
    }

    return {
      id: Date.now() + index,
      subject: entry.subject,
      day: normalizedDay,
      startTime: entry.startTime,
      endTime: entry.endTime,
      room: entry.room || '',
      lecturer: entry.lecturer || entry.code || '',
      color: '#10b981',
      status: entry.status || 'active',
      code: entry.code,
    }
  }

  const analyzeAndImportRoutine = async () => {
    if (!routineUploadFile) {
      setUploadRoutineError('Please upload your routine screenshot first.')
      return
    }

    setIsAnalyzingRoutine(true)
    setUploadRoutineError('')

    try {
      const formData = new FormData()
      formData.append('routineImage', routineUploadFile)

      const response = await fetch('/api/routine/analyze', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Backend analysis failed')
      }

      const data = await response.json()
      const rows: RoutineUploadResult[] = Array.isArray(data?.routines)
        ? data.routines
        : Array.isArray(data?.data)
          ? data.data
          : []

      const parsed = rows
        .map((entry, index) => normalizeRoutineFromBackend(entry, index))
        .filter((entry): entry is RoutineItem => Boolean(entry))

      if (!parsed.length) {
        throw new Error('No classes were detected from this screenshot.')
      }

      setRoutines((prev) => {
        const dedupedNew = parsed.filter(
          (newItem) => !prev.some(
            (existing) =>
              existing.subject.toLowerCase() === newItem.subject.toLowerCase() &&
              existing.day === newItem.day &&
              existing.startTime === newItem.startTime &&
              existing.endTime === newItem.endTime,
          ),
        )
        return [...prev, ...dedupedNew]
      })

      closeUploadRoutineModal()
    } catch {
      setUploadRoutineError('Could not analyze the routine image. Make sure backend route /api/routine/analyze is running and returns parsed classes.')
    } finally {
      setIsAnalyzingRoutine(false)
    }
  }

  const confirmDelete = () => {
    if (deleteConfirmId !== null) {
      setRoutines(prev => prev.filter(r => r.id !== deleteConfirmId))
      setShowDeleteConfirm(false)
      setDeleteConfirmId(null)
    }
  }

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' })
  const totalHours = routines.length > 0 ? 13 : 12 // 6 AM to 7 PM or 6 PM

  const statusColor = {
    active: '#10b981',    // Green
    cancelled: '#ef4444',  // Red  
    paused: '#f59e0b',     // Amber
  }

  return (
    <div className="animate-fade-in pb-12">
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h2 className="text-2xl font-bold" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text-primary)' }}>Weekly Schedule</h2>
          <div className="flex items-center gap-4 mt-2">
             <div className="flex items-center gap-2">
               <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#10b981' }} />
               <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>College Track</span>
             </div>
             <div className="flex items-center gap-2">
               <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#ef4444' }} />
               <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Study Plan</span>
             </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowModal(true)} 
            className="btn-primary px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 bg-blue-600 text-white shadow-lg shadow-blue-600/20"
          >
            <Plus size={16} /> Add Slot
          </button>
          <button 
            onClick={() => setShowUploadModal(true)}
            className="px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all"
            style={{ background: 'var(--input-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
          >
            <Upload size={16} /> Sync Routine
          </button>
        </div>
      </div>

      {/* 2. Calendar Grid */}
      <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: 'var(--border-color)', background: 'var(--card-bg)' }}>
        <div className="min-w-[1260px]">
          {/* Day Headers */}
          <div className="flex border-b" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)' }}>
            <div className="sticky left-0 z-20 border-r" style={{ width: '100px', flex: '0 0 100px', borderColor: 'var(--border-color)', background: 'var(--bg-secondary)' }}></div>
            {DAYS.map((day) => (
              <div key={day} className="flex-1 p-4 text-center border-r last:border-0" style={{ borderColor: 'var(--border-color)' }}>
                <div className="font-bold text-[10px] uppercase opacity-40 mb-1" style={{ color: 'var(--text-primary)' }}>{day.slice(0, 3)}</div>
                <div className={`font-bold text-sm ${day === today ? 'text-blue-500' : ''}`} style={{ color: day === today ? '' : 'var(--text-primary)' }}>{day}</div>
              </div>
            ))}
          </div>

          <div className="flex relative">
            {/* Time Indicators */}
            <div className="sticky left-0 z-10 border-r" style={{ width: '100px', flex: '0 0 100px', borderColor: 'var(--border-color)', background: 'var(--bg-primary)' }}>
              {TIME_SLOTS.slice(0, totalHours + 1).map((time) => (
                <div key={time} 
                     className="text-[10px] font-bold px-3 py-2 opacity-40 flex items-start" 
                     style={{ color: 'var(--text-primary)', height: '70px', borderBottom: `1px solid var(--border-color)` }}>
                  {time}
                </div>
              ))}
            </div>

            {/* Daily Columns */}
            {DAYS.map((day) => (
              <div key={day} className="flex-1 relative border-r last:border-0" style={{ borderColor: 'var(--border-color)' }}>
                {/* Visual grid lines */}
                {Array.from({ length: totalHours + 1 }).map((_, i) => (
                  <div key={i} style={{ height: '70px', borderBottom: '1px solid var(--border-color)' }} className="w-full opacity-[0.03] bg-blue-500"></div>
                ))}
                
                {/* Sessions */}
                <div className="absolute inset-0">
                  {routines
                    .filter(r => r.day === day)
                    .map((routine) => {
                      const { top, height } = getPositionAndHeight(routine.startTime, routine.endTime)
                      const isStudy = routine.color === '#ef4444' || routine.lecturer === 'Self'
                      const accentColor = isStudy ? '#ef4444' : '#10b981'
                      const statusColorVal = statusColor[routine.status] || '#3b82f6'
                      
                      return (
                        <div
                          key={routine.id}
                          onClick={() => navigate(`/app/notes/${encodeURIComponent(routine.subject)}`)}
                          className="absolute left-1.5 right-1.5 rounded-xl p-3 border-l-[4px] shadow-sm group cursor-pointer transition-all hover:scale-[1.02] hover:z-20 overflow-hidden"
                          style={{
                            top: `${top}px`,
                            height: `${height}px`,
                            background: `${accentColor}12`,
                            borderColor: accentColor,
                            borderStyle: 'solid',
                            borderWidth: `1px 1px 1px 4px`,
                            opacity: routine.status === 'cancelled' ? 0.4 : 1
                          }}
                        >
                          <div className="flex flex-col h-full justify-between">
                            <div>
                               <div className="flex items-center justify-between gap-1 mb-1">
                                  <span className="text-[9px] font-black tracking-tighter opacity-70 whitespace-nowrap" style={{ color: accentColor }}>
                                    {routine.startTime} — {routine.endTime}
                                  </span>
                                  {routine.status !== 'active' && (
                                    <span className="text-[8px] font-black uppercase px-1 rounded-sm" style={{ background: `${statusColorVal}20`, color: statusColorVal }}>
                                      {routine.status}
                                    </span>
                                  )}
                               </div>
                               <h4 className="font-bold text-xs leading-tight line-clamp-2" style={{ color: 'var(--text-primary)' }}>
                                 {routine.subject}
                               </h4>
                            </div>
                            
                            <div className="flex items-center justify-between gap-2 mt-auto">
                              <span className="text-[9px] font-bold opacity-40 truncate" style={{ color: 'var(--text-primary)' }}>{routine.room || routine.code || ''}</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setDeleteConfirmId(routine.id)
                                  setShowDeleteConfirm(true)
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-red-500/10"
                              >
                                <Trash2 size={12} className="text-red-500" />
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
        </div>
      </div>

      {/* 3. Modals */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-md rounded-3xl p-8 animate-fade-in-up shadow-2xl" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text-primary)' }}>Add Class</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-white"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <input value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} placeholder="Subject Name" className="input-field w-full p-3 rounded-xl" />
              <div className="grid grid-cols-2 gap-4">
                <select value={form.day} onChange={e => setForm({...form, day: e.target.value})} className="input-field p-3 rounded-xl">
                  {DAYS.map(d => <option key={d}>{d}</option>)}
                </select>
                <select value={form.status} onChange={e => setForm({...form, status: e.target.value as any})} className="input-field p-3 rounded-xl">
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input type="time" value={form.startTime} onChange={e => setForm({...form, startTime: e.target.value})} className="input-field p-3 rounded-xl" />
                <input type="time" value={form.endTime} onChange={e => setForm({...form, endTime: e.target.value})} className="input-field p-3 rounded-xl" />
              </div>
              <input value={form.room} onChange={e => setForm({...form, room: e.target.value})} placeholder="Room (Optional)" className="input-field w-full p-3 rounded-xl" />
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-xl font-bold" style={{ background: 'var(--input-bg)', color: 'var(--text-secondary)' }}>Cancel</button>
              <button onClick={handleAdd} className="flex-1 py-3 rounded-xl font-bold bg-blue-600 text-white shadow-lg">Add Class</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm glass-card rounded-2xl p-6 border-red-500/20">
            <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Delete Slot?</h3>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>Are you sure you want to remove this session from your routine?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2.5 rounded-xl font-bold" style={{ background: 'var(--input-bg)', color: 'var(--text-secondary)' }}>Cancel</button>
              <button onClick={confirmDelete} className="flex-1 py-2.5 rounded-xl font-bold bg-red-600 text-white shadow-lg shadow-red-600/20">Delete</button>
            </div>
          </div>
        </div>
      )}

      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md glass-card rounded-2xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Sync Timetable</h3>
              <button onClick={closeUploadRoutineModal} className="text-slate-500"><X size={20} /></button>
            </div>
            <label className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-2xl cursor-pointer hover:bg-blue-500/5 transition-all" style={{ borderColor: 'var(--border-color)' }}>
              <Upload size={32} className="text-blue-500 mb-4" />
              <span className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>
                {routineUploadFile ? routineUploadFile.name : 'Choose routine screenshot'}
              </span>
              <input type="file" className="hidden" onChange={handleRoutineScreenshotChange} accept="image/*" />
            </label>
            <button onClick={analyzeAndImportRoutine} disabled={isAnalyzingRoutine} className="w-full mt-6 py-4 rounded-xl font-black bg-blue-600 text-white shadow-lg disabled:opacity-50">
              {isAnalyzingRoutine ? 'Analyzing Timetable...' : 'Import Routine'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
