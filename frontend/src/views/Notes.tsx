import { useNavigate } from 'react-router-dom'
import { FileText, ChevronRight, BookOpen, Brain, Clock } from 'lucide-react'

const subjects = [
  {
    name: 'Machine Learning',
    lectures: 8,
    color: '#3b82f6',
    lastStudied: '2 hours ago',
    concepts: ['Gradient Descent', 'Linear Regression', 'Neural Networks', 'Backpropagation'],
    progress: 75,
    notes: 8,
  },
  {
    name: 'Linear Algebra',
    lectures: 6,
    color: '#8b5cf6',
    lastStudied: 'Yesterday',
    concepts: ['Matrices', 'Eigenvalues', 'Vector Spaces', 'Transformations'],
    progress: 66,
    notes: 6,
  },
  {
    name: 'Neural Networks',
    lectures: 5,
    color: '#06b6d4',
    lastStudied: '3 days ago',
    concepts: ['Perceptrons', 'Activation Functions', 'Backprop', 'CNNs'],
    progress: 40,
    notes: 5,
  },
  {
    name: 'Probability Theory',
    lectures: 7,
    color: '#10b981',
    lastStudied: '1 week ago',
    concepts: ['Bayes Theorem', 'Distributions', 'Expectation', 'Markov Chains'],
    progress: 71,
    notes: 7,
  },
]

export default function Notes() {
  const navigate = useNavigate()

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Subjects', value: '4', icon: BookOpen, color: '#3b82f6' },
          { label: 'Lecture Notes', value: '26', icon: FileText, color: '#8b5cf6' },
          { label: 'Key Concepts', value: '84', icon: Brain, color: '#06b6d4' },
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

      {/* Subject cards */}
      <div className="grid sm:grid-cols-2 gap-4">
        {subjects.map(s => (
          <div
            key={s.name}
            className="glass-card rounded-2xl p-5 cursor-pointer transition-all hover:scale-[1.02] group"
            style={{ borderLeft: `3px solid ${s.color}` }}
            onClick={() => navigate(`/app/notes/${encodeURIComponent(s.name)}`)}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-bold text-base mb-0.5" style={{ fontFamily: 'Sora, sans-serif' }}>{s.name}</h3>
                <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <Clock size={11} /> {s.lastStudied}
                </div>
              </div>
              <ChevronRight size={18} className="text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
            </div>

            {/* Progress */}
            <div className="mb-3">
              <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                <span>{s.lectures} lectures</span>
                <span>{s.progress}% done</span>
              </div>
              <div className="h-1.5 rounded-full" style={{ background: 'rgba(59,130,246,0.1)' }}>
                <div className="h-full rounded-full" style={{ width: `${s.progress}%`, background: s.color }} />
              </div>
            </div>

            {/* Concepts preview */}
            <div className="flex flex-wrap gap-1.5">
              {s.concepts.slice(0, 3).map(c => (
                <span key={c} className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: `${s.color}15`, color: s.color, border: `1px solid ${s.color}25` }}>
                  {c}
                </span>
              ))}
              {s.concepts.length > 3 && (
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(59,130,246,0.08)', color: 'var(--text-muted)' }}>
                  +{s.concepts.length - 3} more
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
