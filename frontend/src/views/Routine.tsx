import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, X, Upload, Trash2 } from 'lucide-react'
import { aiApi, backendApi, type AiRoutineResponse, type RoutineItem } from '../lib/api'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

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
  const startSlot = (start - 360) / 60
  const duration = (end - start) / 60
  return { top: startSlot * 60, height: duration * 60 }
}

function convertTo24Hour(value: string): string {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (!match) return '09:00'
  let hour = Number(match[1])
  const minute = Number(match[2])
  const period = match[3].toUpperCase()

  if (period === 'PM' && hour !== 12) hour += 12
  if (period === 'AM' && hour === 12) hour = 0

  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

type RoutineFormState = {
  subject: string
  day: string
  startTime: string
  endTime: string
  room: string
  lecturer: string
  code: string
  color: string
  status: RoutineItem['status']
  type: RoutineItem['type']
}

export default function Routine() {
  const [routines, setRoutines] = useState<RoutineItem[]>([])
  const [showModal, setShowModal] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [routineUploadFile, setRoutineUploadFile] = useState<File | null>(null)
  const [isAnalyzingRoutine, setIsAnalyzingRoutine] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const [form, setForm] = useState<RoutineFormState>({
    subject: '',
    day: 'Monday',
    startTime: '09:00',
    endTime: '11:00',
    room: '',
    lecturer: '',
    code: '',
    color: '#10b981',
    status: 'active',
    type: 'class',
  })

  const loadRoutines = async () => {
    try {
      const rows = await backendApi.get<RoutineItem[]>('/api/routine')
      setRoutines(rows)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load routine')
    }
  }

  useEffect(() => {
    void loadRoutines()
  }, [])

  const handleAdd = async () => {
    if (!form.subject || !form.startTime || !form.endTime) return

    try {
      const created = await backendApi.post<RoutineItem>('/routine', form)
      setRoutines(prev => [...prev, created])
      setShowModal(false)
      setForm({
        subject: '',
        day: 'Monday',
        startTime: '09:00',
        endTime: '11:00',
        room: '',
        lecturer: '',
        code: '',
        color: '#10b981',
        status: 'active',
        type: 'class',
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add routine entry')
    }
  }

  const handleRoutineScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    if (!validTypes.includes(file.type)) {
      setError('Please upload a PNG, JPG, JPEG, or WEBP image.')
      return
    }

    setRoutineUploadFile(file)
    setError('')
  }

  const closeUploadRoutineModal = () => {
    setShowUploadModal(false)
    setRoutineUploadFile(null)
  }

  const analyzeAndImportRoutine = async () => {
    if (!routineUploadFile) {
      setError('Please upload your routine screenshot first.')
      return
    }

    setIsAnalyzingRoutine(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('image', routineUploadFile)

      const aiResult = await aiApi.post<AiRoutineResponse>('/routine/analyze-routine', formData)
      const createdRows: RoutineItem[] = []

      for (const course of aiResult.courses || []) {
        for (const day of course.days || []) {
          if (!DAYS.includes(day)) continue
          const created = await backendApi.post<RoutineItem>('/routine', {
            subject: course.course_name || course.course_code,
            day,
            startTime: convertTo24Hour(course.start_time),
            endTime: convertTo24Hour(course.end_time),
            room: course.location || '',
            lecturer: course.course_code || '',
            code: course.course_code || '',
            color: '#10b981',
            status: 'active',
            type: 'class',
          })
          createdRows.push(created)
        }
      }

      setRoutines(prev => [...prev, ...createdRows])
      closeUploadRoutineModal()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not analyze the routine image.')
    } finally {
      setIsAnalyzingRoutine(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteConfirmId) return

    try {
      await backendApi.delete(`/routine/${deleteConfirmId}`)
      setRoutines(prev => prev.filter(r => r._id !== deleteConfirmId))
      setShowDeleteConfirm(false)
      setDeleteConfirmId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete routine slot')
    }
  }

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' })
  const totalHours = useMemo(() => (routines.length > 0 ? 13 : 12), [routines.length])

  const statusColor: Record<RoutineItem['status'], string> = {
    active: '#10b981',
    cancelled: '#ef4444',
    paused: '#f59e0b',
  }

  return (
    <div className="animate-fade-in pb-12">
      {error && (
        <div className="mb-4 rounded-xl px-3 py-2 text-sm" style={{ color: '#ef4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          {error}
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h2 className="text-2xl font-bold" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text-primary)' }}>Weekly Schedule</h2>
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
            <Upload size={16} /> Import From Image
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: 'var(--border-color)', background: 'var(--card-bg)' }}>
        <div className="min-w-[1260px]">
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
            <div className="sticky left-0 z-10 border-r" style={{ width: '100px', flex: '0 0 100px', borderColor: 'var(--border-color)', background: 'var(--bg-primary)' }}>
              {TIME_SLOTS.slice(0, totalHours + 1).map((time) => (
                <div key={time}
                     className="text-[10px] font-bold px-3 py-2 opacity-40 flex items-start"
                     style={{ color: 'var(--text-primary)', height: '70px', borderBottom: `1px solid var(--border-color)` }}>
                  {time}
                </div>
              ))}
            </div>

            {DAYS.map((day) => (
              <div key={day} className="flex-1 relative border-r last:border-0" style={{ borderColor: 'var(--border-color)' }}>
                {Array.from({ length: totalHours + 1 }).map((_, i) => (
                  <div key={i} style={{ height: '70px', borderBottom: '1px solid var(--border-color)' }} className="w-full opacity-[0.03] bg-blue-500"></div>
                ))}

                <div className="absolute inset-0">
                  {routines
                    .filter(r => r.day === day)
                    .map((routine) => {
                      const { top, height } = getPositionAndHeight(routine.startTime, routine.endTime)
                      const accentColor = routine.type === 'study' ? '#ef4444' : (routine.color || '#10b981')
                      const statusColorVal = statusColor[routine.status] || '#3b82f6'

                      return (
                        <div
                          key={routine._id}
                          onClick={() => navigate(`/app/notes/${encodeURIComponent(routine.subject)}`)}
                          className="absolute left-1.5 right-1.5 rounded-xl p-3 border-l-[4px] shadow-sm group cursor-pointer transition-all hover:scale-[1.02] hover:z-20 overflow-hidden"
                          style={{
                            top: `${top}px`,
                            height: `${height}px`,
                            background: `${accentColor}12`,
                            borderColor: accentColor,
                            borderStyle: 'solid',
                            borderWidth: '1px 1px 1px 4px',
                            opacity: routine.status === 'cancelled' ? 0.4 : 1,
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
                                  setDeleteConfirmId(routine._id)
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

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-md rounded-3xl p-8 animate-fade-in-up shadow-2xl" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text-primary)' }}>Add Class</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-white"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="Subject Name" className="input-field w-full p-3 rounded-xl" />
              <div className="grid grid-cols-2 gap-4">
                <select value={form.day} onChange={e => setForm({ ...form, day: e.target.value })} className="input-field p-3 rounded-xl">
                  {DAYS.map(d => <option key={d}>{d}</option>)}
                </select>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as RoutineItem['status'] })} className="input-field p-3 rounded-xl">
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input type="time" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} className="input-field p-3 rounded-xl" />
                <input type="time" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} className="input-field p-3 rounded-xl" />
              </div>
              <input value={form.room} onChange={e => setForm({ ...form, room: e.target.value })} placeholder="Room (Optional)" className="input-field w-full p-3 rounded-xl" />
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-xl font-bold" style={{ background: 'var(--input-bg)', color: 'var(--text-secondary)' }}>Cancel</button>
              <button onClick={() => void handleAdd()} className="flex-1 py-3 rounded-xl font-bold bg-blue-600 text-white shadow-lg">Add Class</button>
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
              <button onClick={() => void confirmDelete()} className="flex-1 py-2.5 rounded-xl font-bold bg-red-600 text-white shadow-lg shadow-red-600/20">Delete</button>
            </div>
          </div>
        </div>
      )}

      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md glass-card rounded-2xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Import Timetable</h3>
              <button onClick={closeUploadRoutineModal} className="text-slate-500"><X size={20} /></button>
            </div>
            <label className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-2xl cursor-pointer hover:bg-blue-500/5 transition-all" style={{ borderColor: 'var(--border-color)' }}>
              <Upload size={32} className="text-blue-500 mb-4" />
              <span className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>
                {routineUploadFile ? routineUploadFile.name : 'Choose routine screenshot'}
              </span>
              <input type="file" className="hidden" onChange={handleRoutineScreenshotChange} accept="image/*" />
            </label>
            <button onClick={() => void analyzeAndImportRoutine()} disabled={isAnalyzingRoutine} className="w-full mt-6 py-4 rounded-xl font-black bg-blue-600 text-white shadow-lg disabled:opacity-50">
              {isAnalyzingRoutine ? 'Analyzing Timetable...' : 'Import Routine'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
