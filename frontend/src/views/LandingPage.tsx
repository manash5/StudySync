import { Link } from 'react-router-dom'
import { ArrowRight, Brain, Calendar, FileText, Mic, Sparkles, ChevronRight, Check, BarChart3, Zap, BookOpen } from 'lucide-react'
import Logo from '../components/Logo'

export default function LandingPage() {
  return (
    <div className="min-h-screen mesh-bg font-sans">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4"
           style={{ background: 'rgba(10,15,30,0.8)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(59,130,246,0.1)' }}>
        <Logo size={34} />
        <div className="hidden md:flex items-center gap-8 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <a href="#features" className="hover:text-blue-400 transition-colors">Features</a>
          <a href="#how" className="hover:text-blue-400 transition-colors">How it works</a>
          <a href="#pricing" className="hover:text-blue-400 transition-colors">Pricing</a>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="px-4 py-2 text-sm rounded-lg transition-all hover:text-blue-400"
                style={{ color: 'var(--text-secondary)' }}>
            Sign in
          </Link>
          <Link to="/signup" className="btn-primary px-5 py-2 text-sm rounded-xl font-semibold flex items-center gap-1.5">
            Get started <ArrowRight size={14} />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        {/* BG orbs */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
             style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 70%)' }} />
        <div className="absolute top-40 left-1/4 w-64 h-64 rounded-full pointer-events-none"
             style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)' }} />

        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-6 animate-fade-in"
               style={{ background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.3)', color: '#1e40af' }}>
            <Sparkles size={12} />
            AI-Powered Study Assistant
          </div>

          <h1 className="font-display text-5xl md:text-7xl font-bold mb-6 leading-tight animate-fade-in-up"
              style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text-primary)' }}>
            Your Semester,
            <br />
            <span style={{ background: 'linear-gradient(135deg, #2563eb 0%, #60a5fa 50%, #0ea5e9 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Made Easy</span>
            <br />
            Smarter Learning
          </h1>

          <p className="text-lg md:text-xl mb-10 max-w-2xl mx-auto animate-fade-in-up delay-200"
             style={{ color: 'var(--text-secondary)', lineHeight: '1.7' }}>
            Organize your lectures, schedule your studies, and ace your exams. 
            All powered by AI to give you the perfect study plan every single day.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up delay-300">
            <Link to="/signup" className="btn-primary px-8 py-3.5 rounded-xl font-semibold text-base flex items-center gap-2 w-full sm:w-auto justify-center">
              Start for free <ArrowRight size={16} />
            </Link>
            <a href="#how" className="px-8 py-3.5 rounded-xl font-medium text-sm w-full sm:w-auto text-center transition-all hover:text-blue-400"
               style={{ color: 'var(--text-secondary)', border: '1px solid rgba(59,130,246,0.2)' }}>
              See how it works
            </a>
          </div>

          {/* Trust badges */}
          <div className="flex items-center justify-center gap-6 mt-10 animate-fade-in delay-500">
            {['Ebbinghaus Algorithm', 'TF-IDF Scoring', 'Speaker Isolation'].map(t => (
              <div key={t} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                <Check size={12} className="text-blue-500" /> {t}
              </div>
            ))}
          </div>
        </div>

        {/* Dashboard preview */}
        <div className="max-w-5xl mx-auto mt-16 animate-fade-in-up delay-400">
          <div className="glass-card rounded-2xl p-1 blue-glow">
            <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-card)' }}>
              {/* Mock dashboard header */}
              <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="w-3 h-3 rounded-full bg-red-500 opacity-70"/>
                <div className="w-3 h-3 rounded-full bg-yellow-500 opacity-70"/>
                <div className="w-3 h-3 rounded-full bg-green-500 opacity-70"/>
                <span className="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>studysync.app/dashboard</span>
              </div>
              {/* Mock content */}
              <div className="flex" style={{ minHeight: '280px' }}>
                {/* Sidebar mock */}
                <div className="w-16 flex-shrink-0 flex flex-col items-center py-4 gap-4"
                     style={{ background: 'var(--bg-sidebar)', borderRight: '1px solid var(--border)' }}>
                  {[BarChart3, Calendar, FileText].map((Icon, i) => (
                    <div key={i} className={`w-9 h-9 rounded-lg flex items-center justify-center ${i === 0 ? 'bg-blue-600' : ''}`}
                         style={i !== 0 ? { background: 'rgba(59,130,246,0.08)' } : {}}>
                      <Icon size={16} className={i === 0 ? 'text-white' : 'text-blue-400'} />
                    </div>
                  ))}
                </div>
                {/* Main area mock */}
                <div className="flex-1 p-5">
                  <div className="flex justify-between items-start mb-5">
                    <div>
                      <div className="h-5 w-32 rounded-md mb-2" style={{ background: 'rgba(59,130,246,0.15)' }}/>
                      <div className="h-3 w-48 rounded-md" style={{ background: 'rgba(59,130,246,0.07)' }}/>
                    </div>
                    <div className="h-8 w-28 rounded-lg" style={{ background: 'rgba(37,99,235,0.3)' }}/>
                  </div>
                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-3 mb-5">
                    {[['4', 'Subjects'], ['18', 'Lectures'], ['92%', 'On Track']].map(([v, l]) => (
                      <div key={l} className="rounded-xl p-3" style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid var(--border)' }}>
                        <div className="text-lg font-bold text-blue-400">{v}</div>
                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{l}</div>
                      </div>
                    ))}
                  </div>
                  {/* Today's plan */}
                  <div className="space-y-2">
                    {['Gradient Descent — 45 min', 'Linear Algebra Review — 20 min', 'Neural Networks — 30 min'].map((item, i) => (
                      <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg" style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid var(--border)' }}>
                        <div className={`w-4 h-4 rounded flex-shrink-0 ${i === 0 ? 'bg-blue-600' : ''}`}
                             style={i !== 0 ? { border: '1.5px solid rgba(59,130,246,0.3)' } : {}} />
                        <span className="text-xs" style={{ color: i === 0 ? 'var(--text-secondary)' : 'var(--text-muted)', textDecoration: i === 0 ? 'line-through' : 'none' }}>{item}</span>
                        <span className="ml-auto text-xs text-blue-500">Study</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-4"
                 style={{ background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.3)', color: '#1e40af' }}>
              Why Choose StudySync
            </div>
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-4" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text-primary)' }}>
              Everything you need to <span style={{ background: 'linear-gradient(135deg, #2563eb 0%, #60a5fa 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>study smarter</span>
            </h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
              From lecture uploads to personalized study schedules — we handle everything so you can focus on learning.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Mic, title: 'Record & Upload Lectures', desc: 'Capture lectures in the app or upload recordings from any source. Start building your lecture library instantly.', color: '#2563eb' },
              { icon: Brain, title: 'Smart Note Generation', desc: 'AI automatically creates organized notes with key concepts, definitions, and important points you need to study.', color: '#7c3aed' },
              { icon: BookOpen, title: 'Organized Study Materials', desc: 'Everything organized by subject, topic, and lecture. Find what you need instantly whenever you study.', color: '#0891b2' },
              { icon: Calendar, title: 'Personalized Study Plan', desc: 'Get a custom daily schedule that adapts to your learning pace and exam dates. Never wonder what to study.', color: '#059669' },
              { icon: Zap, title: 'Progress Tracking', desc: 'See your completion rates, time spent studying, and overall readiness at a glance with beautiful dashboards.', color: '#d97706' },
              { icon: BarChart3, title: 'Exam Preparation', desc: 'Get ready for exams with confidence. Track which topics you know and which need more review.', color: '#dc2626' },
            ].map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="glass-card rounded-2xl p-6 hover:border-blue-400/40 transition-all group"
                   style={{ transition: 'transform 0.2s, box-shadow 0.2s', background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}
                   onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 12px 40px rgba(59,130,246,0.1)'; }}
                   onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'none'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                     style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
                  <Icon size={20} style={{ color }} />
                </div>
                <h3 className="font-semibold text-base mb-2" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text-primary)' }}>{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-24 px-6" style={{ background: 'rgba(37,99,235,0.04)' }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl font-bold mb-4" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text-primary)' }}>
              From lecture to <span style={{ background: 'linear-gradient(135deg, #2563eb 0%, #60a5fa 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>exam ready</span>
            </h2>
            <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>Follow these 4 simple steps.</p>
          </div>

          <div className="space-y-4">
            {[
              { step: '01', title: 'Upload your lectures', desc: 'Record in the app or upload audio files from any class. Works with MP3, WAV, M4A, and more.' },
              { step: '02', title: 'AI organizes everything', desc: 'Automatic transcription, note generation, and concept extraction happen in seconds.' },
              { step: '03', title: 'Get your study schedule', desc: 'Smart algorithm creates a personalized daily study plan based on your exam dates.' },
              { step: '04', title: 'Study and track progress', desc: 'Follow your plan each day, track completion, and watch your retention improve.' },
            ].map(({ step, title, desc }, i) => (
              <div key={step} className="flex gap-6 p-6 glass-card rounded-2xl items-start"
                   style={{ animationDelay: `${i * 0.1}s`, background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
                <div className="font-display text-4xl font-bold flex-shrink-0" style={{ fontFamily: 'Sora, sans-serif', color: '#2563eb' }}>
                  {step}
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1 text-base" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text-primary)' }}>{title}</h3>
                  <p style={{ color: 'var(--text-secondary)' }}>{desc}</p>
                </div>
                <ChevronRight className="ml-auto flex-shrink-0 text-blue-500 mt-1" size={20} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="glass-card rounded-3xl p-12 blue-glow"
               style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.12), rgba(96,165,250,0.06))' }}>
            <h2 className="font-display text-4xl font-bold mb-4" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text-primary)' }}>
              Ready to <span style={{ background: 'linear-gradient(135deg, #2563eb 0%, #60a5fa 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>ace your exams?</span>
            </h2>
            <p className="mb-8 text-lg" style={{ color: 'var(--text-secondary)' }}>
              Join thousands of students who study smarter, not harder.
            </p>
            <Link to="/signup" className="px-10 py-4 rounded-xl font-semibold text-base inline-flex items-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)', color: 'white', border: 'none' }}>
              Start studying free today <ArrowRight size={16} />
            </Link>
            <p className="mt-4 text-xs" style={{ color: 'var(--text-secondary)' }}>No credit card required. Free forever plan available.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-6 text-center" style={{ borderTop: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
        <Logo size={28} />
        <p className="mt-4 text-xs">© 2025 StudySync. Your semester, made easy.</p>
      </footer>
    </div>
  )
}
