import { useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ChevronLeft, ChevronRight, BookOpen, Brain, AlertCircle, Lightbulb, Check, Clock, FileText } from 'lucide-react'

interface Lecture {
  id: number
  title: string
  number: string
  duration: string
  mainTopic: string
  prerequisites: string[]
  keyConcepts: { concept: string; score: number }[]
  importantPoints: string[]
  notes: string
  reviewed: boolean
}

const subjectData: Record<string, { color: string; lectures: Lecture[] }> = {
  'Machine Learning': {
    color: '#3b82f6',
    lectures: [
      {
        id: 1, number: 'Lecture 1', title: 'Introduction to ML', duration: '90 min',
        mainTopic: 'What is Machine Learning and its types',
        prerequisites: ['Basic Statistics', 'Linear Algebra', 'Python Programming'],
        keyConcepts: [
          { concept: 'Supervised Learning', score: 0.92 },
          { concept: 'Unsupervised Learning', score: 0.88 },
          { concept: 'Reinforcement Learning', score: 0.76 },
          { concept: 'Training vs Testing', score: 0.71 },
        ],
        importantPoints: [
          'ML is about learning patterns from data without being explicitly programmed',
          'Overfitting occurs when model learns noise in training data',
          'Cross-validation is key to evaluating generalization',
        ],
        notes: 'Machine learning is a subfield of AI that gives systems the ability to learn and improve from experience. The three main types are supervised (labeled data), unsupervised (unlabeled), and reinforcement learning (reward-based). Key distinction: training data vs test data. Always split data before any preprocessing to avoid data leakage.',
        reviewed: true,
      },
      {
        id: 2, number: 'Lecture 2', title: 'Linear Regression', duration: '90 min',
        mainTopic: 'Linear regression and cost functions',
        prerequisites: ['Calculus (derivatives)', 'Statistics', 'Lecture 1'],
        keyConcepts: [
          { concept: 'Hypothesis Function', score: 0.95 },
          { concept: 'Cost Function (MSE)', score: 0.91 },
          { concept: 'Gradient Descent', score: 0.89 },
          { concept: 'Learning Rate', score: 0.82 },
        ],
        importantPoints: [
          'Cost function J(θ) measures how wrong predictions are',
          'Gradient descent minimizes cost by updating parameters in direction of steepest descent',
          'Learning rate α controls step size — too large diverges, too small is slow',
        ],
        notes: 'Linear regression fits a line y = θ₀ + θ₁x to data. We minimize the MSE cost function using gradient descent. At each step: θⱼ := θⱼ - α · ∂J/∂θⱼ. Feature normalization is critical for gradient descent to converge efficiently.',
        reviewed: false,
      },
      {
        id: 3, number: 'Lecture 3', title: 'Gradient Descent', duration: '90 min',
        mainTopic: 'Optimization via gradient descent variants',
        prerequisites: ['Linear Regression', 'Calculus', 'Matrix Operations'],
        keyConcepts: [
          { concept: 'Batch GD', score: 0.90 },
          { concept: 'Stochastic GD', score: 0.87 },
          { concept: 'Mini-batch GD', score: 0.85 },
          { concept: 'Learning Rate Decay', score: 0.79 },
          { concept: 'Momentum', score: 0.74 },
        ],
        importantPoints: [
          'SGD uses one sample at a time — faster but noisier',
          'Mini-batch (32-256 samples) is the practical standard',
          'Adam optimizer combines momentum and RMSProp',
        ],
        notes: 'Batch GD computes gradient over entire dataset — accurate but slow. SGD is fast but noisy. Mini-batch GD is the balance. Advanced optimizers: Momentum (smooth out oscillations), RMSProp (adaptive learning rates), Adam (combines both). Always shuffle data for SGD.',
        reviewed: false,
      },
    ],
  },
  'Linear Algebra': {
    color: '#8b5cf6',
    lectures: [
      {
        id: 1, number: 'Lecture 1', title: 'Vectors & Vector Spaces', duration: '60 min',
        mainTopic: 'Vectors, operations and vector spaces',
        prerequisites: ['High school math'],
        keyConcepts: [
          { concept: 'Vector Addition', score: 0.90 },
          { concept: 'Scalar Multiplication', score: 0.88 },
          { concept: 'Dot Product', score: 0.85 },
          { concept: 'Linear Independence', score: 0.80 },
        ],
        importantPoints: [
          'Vectors represent magnitude and direction in n-dimensional space',
          'Linear independence: no vector can be written as combination of others',
          'Basis vectors span the entire vector space',
        ],
        notes: 'A vector space V must satisfy 8 axioms including closure under addition and scalar multiplication. Key operation: dot product a·b = |a||b|cos(θ) — gives projection. Linear independence is critical for basis. R^n has standard basis e₁, e₂, ..., eₙ.',
        reviewed: true,
      },
    ],
  },
  'Neural Networks': {
    color: '#06b6d4',
    lectures: [
      {
        id: 1, number: 'Lecture 1', title: 'Perceptrons & Neurons', duration: '90 min',
        mainTopic: 'Biological inspiration and artificial neurons',
        prerequisites: ['Linear Algebra', 'Calculus', 'Machine Learning basics'],
        keyConcepts: [
          { concept: 'Artificial Neuron', score: 0.93 },
          { concept: 'Weights & Biases', score: 0.89 },
          { concept: 'Activation Functions', score: 0.88 },
          { concept: 'Perceptron Learning Rule', score: 0.80 },
        ],
        importantPoints: [
          'Output: f(Σwᵢxᵢ + b) where f is the activation function',
          'ReLU is most popular — avoids vanishing gradient',
          'Universal approximation theorem: one hidden layer can approximate any function',
        ],
        notes: 'A neuron computes a weighted sum of inputs plus bias, then applies an activation function. Sigmoid squashes to (0,1), tanh to (-1,1), ReLU max(0,x). Deep networks stack layers to learn hierarchical representations.',
        reviewed: false,
      },
    ],
  },
  'Probability Theory': {
    color: '#10b981',
    lectures: [
      {
        id: 1, number: 'Lecture 1', title: "Bayes' Theorem", duration: '60 min',
        mainTopic: 'Conditional probability and Bayesian reasoning',
        prerequisites: ['Basic Probability', 'Set Theory'],
        keyConcepts: [
          { concept: 'Conditional Probability', score: 0.95 },
          { concept: 'Bayes Theorem', score: 0.93 },
          { concept: 'Prior/Posterior', score: 0.88 },
          { concept: 'Independence', score: 0.82 },
        ],
        importantPoints: [
          "Bayes: P(A|B) = P(B|A) · P(A) / P(B)",
          'Prior is belief before evidence; posterior is updated belief',
          'Used in spam filtering, medical diagnosis, ML classifiers',
        ],
        notes: "Bayes' theorem allows updating probabilities with new evidence. P(H|E) = P(E|H) · P(H) / P(E). The denominator P(E) normalizes over all hypotheses. Bayesian reasoning is fundamental to probabilistic machine learning models.",
        reviewed: false,
      },
    ],
  },
}

export default function NoteDetail() {
  const { subject } = useParams<{ subject: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const decodedSubject = decodeURIComponent(subject || '')
  const data = subjectData[decodedSubject] || subjectData['Machine Learning']
  const { color, lectures } = data
  const [isExporting, setIsExporting] = useState(false)

  // Jump to the lecture specified in ?lecture= query param
  const lectureParam = new URLSearchParams(location.search).get('lecture')
  const initialIdx = lectureParam
    ? Math.max(0, lectures.findIndex(l => l.title.toLowerCase() === decodeURIComponent(lectureParam).toLowerCase()))
    : 0

  const [activeIdx, setActiveIdx] = useState(initialIdx)
  const [reviewed, setReviewed] = useState<Record<number, boolean>>(
    Object.fromEntries(lectures.map((l: any) => [l.id, l.reviewed]))
  )

  const lecture = lectures[activeIdx]

  const handleDownloadPDF = async () => {
    setIsExporting(true);
    const element = document.getElementById('note-content-area');
    const h2p = (window as any).html2pdf;
    
    if (!element || !h2p) {
       alert('PDF Engine is warming up. Please try again in a second.');
       setIsExporting(false);
       return;
    }
    
    try {
      const opt = {
        margin: 0.4,
        filename: `${lecture.title}_Notes.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true, logging: false },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
      };
      await h2p().from(element).set(opt).save();
    } catch (err) {
      console.error('PDF Export failed:', err);
      window.print(); // Fallback to print if auto-save fails
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto animate-fade-in" id="note-content-area">
      {/* Breadcrumb */}
      <button onClick={() => navigate('/app/notes')}
              className="flex items-center gap-1.5 text-sm mb-6 hover:text-blue-300 transition-colors"
              style={{ color: 'var(--text-muted)' }}>
        <ChevronLeft size={15} /> Notes / {decodedSubject}
      </button>

      <div className="flex gap-5">
        {/* Lecture list sidebar */}
        <div className="w-56 flex-shrink-0">
          <h3 className="text-xs font-medium mb-3 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Lectures</h3>
          <div className="space-y-1.5">
            {lectures.map((lec, i) => (
              <button key={lec.id} onClick={() => setActiveIdx(i)}
                      className="w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all"
                      style={{
                        background: activeIdx === i ? `${color}18` : 'transparent',
                        border: `1px solid ${activeIdx === i ? color + '40' : 'transparent'}`,
                        color: activeIdx === i ? color : 'var(--text-secondary)',
                      }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{lec.number}</span>
                  {reviewed[lec.id] && <Check size={11} style={{ color }} />}
                </div>
                <div className="font-medium truncate mt-0.5">{lec.title}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Main note view */}
        <div className="flex-1 min-w-0">
          {/* Note header */}
          <div className="glass-card rounded-2xl p-5 mb-4"
               style={{ borderTop: `3px solid ${color}` }}>
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}>
                    {lecture.number}
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
                  onClick={() => setReviewed(prev => ({ ...prev, [lecture.id]: !prev[lecture.id] }))}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background: reviewed[lecture.id] ? `${color}20` : 'rgba(59,130,246,0.05)',
                    border: `1px solid ${reviewed[lecture.id] ? color + '50' : 'rgba(59,130,246,0.2)'}`,
                    color: reviewed[lecture.id] ? color : 'var(--text-secondary)',
                  }}>
                  <Check size={14} />
                  {reviewed[lecture.id] ? 'Reviewed' : 'Mark Reviewed'}
                </button>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            {/* Prerequisites */}
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

            {/* Key concepts */}
            <div className="glass-card rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Brain size={15} style={{ color }} />
                <h4 className="font-semibold text-sm" style={{ fontFamily: 'Sora, sans-serif' }}>Key Concepts</h4>
                <span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>TF-IDF scored</span>
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

          {/* Important points */}
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

          {/* Notes */}
          <div className="glass-card rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText size={15} className="text-blue-400" />
              <h4 className="font-semibold text-sm" style={{ fontFamily: 'Sora, sans-serif' }}>Lecture Notes</h4>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{lecture.notes}</p>
          </div>

          {/* Navigation */}
          <div className="flex justify-between mt-4">
            <button onClick={() => setActiveIdx(Math.max(0, activeIdx - 1))}
                    disabled={activeIdx === 0}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all disabled:opacity-30"
                    style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
              <ChevronLeft size={15} /> Previous
            </button>
            <button onClick={() => setActiveIdx(Math.min(lectures.length - 1, activeIdx + 1))}
                    disabled={activeIdx === lectures.length - 1}
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
