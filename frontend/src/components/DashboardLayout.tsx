import { useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, CalendarDays, FileText, Bell,
  LogOut, Settings, ChevronRight, Menu, X, User, Sun, Moon, Music, ListTodo,
  Brain, Sparkles, Flame, TrendingUp
} from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'
import Logo from './Logo'

const navItems = [
  { to: '/app/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/app/routine', icon: CalendarDays, label: 'Routine' },
  { to: '/app/study-plan', icon: ListTodo, label: 'Study Plan' },
  { to: '/app/notes', icon: FileText, label: 'Notes' },
  { to: '/app/lectures', icon: Music, label: 'Lectures' },
]

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()

  const pageTitle = navItems.find(n => location.pathname.startsWith(n.to))?.label || 'Dashboard'

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between p-5 mb-2">
        <Logo size={30} />
        <button onClick={() => setSidebarOpen(false)}
                className="hidden lg:flex w-7 h-7 rounded-lg items-center justify-center hover:bg-blue-500/10 transition-colors"
                style={{ color: 'var(--text-muted)' }}>
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-1">
        <p className="text-xs font-medium px-3 mb-2" style={{ color: 'var(--text-muted)' }}>MENU</p>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setMobileSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                isActive ? 'nav-link-active' : 'hover:bg-blue-500/5'
              }`
            }
            style={({ isActive }) => ({ color: isActive ? '#60a5fa' : 'var(--text-secondary)' })}
          >
            {({ isActive }) => (
              <>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${isActive ? 'bg-blue-600' : 'group-hover:bg-blue-500/10'}`}>
                  <Icon size={16} className={isActive ? 'text-white' : ''} />
                </div>
                <span>{label}</span>
                {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-4 space-y-1 border-t mt-4 pt-4" style={{ borderColor: 'var(--border-color)' }}>
        <NavLink
          to="/app/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm w-full transition-all group ${
              isActive ? 'nav-link-active' : 'hover:bg-blue-500/5'
            }`
          }
          style={({ isActive }) => ({ color: isActive ? '#60a5fa' : 'var(--text-secondary)' })}
        >
          {({ isActive }) => (
            <>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${isActive ? 'bg-blue-600' : 'group-hover:bg-blue-500/10'}`}>
                <Settings size={16} className={isActive ? 'text-white' : ''} />
              </div>
              <span>Settings</span>
              {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400" />}
            </>
          )}
        </NavLink>
        <button onClick={() => navigate('/')}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm w-full hover:bg-red-500/5 transition-colors"
                style={{ color: 'var(--text-muted)' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.08)' }}>
            <LogOut size={16} className="text-red-400" />
          </div>
          Sign out
        </button>
        {/* User */}
        <div className="flex items-center gap-3 px-3 py-2.5 mt-1 rounded-xl" style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid var(--border-color)' }}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            P
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>Prashant</div>
            <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>Softwarica College</div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* Desktop Sidebar */}
      <aside
        className="hidden lg:flex flex-col flex-shrink-0 transition-all duration-300 overflow-hidden"
        style={{
          width: sidebarOpen ? '240px' : '0px',
          background: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border-color)',
        }}
      >
        <SidebarContent />
      </aside>

      {/* Collapsed sidebar toggle */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="hidden lg:flex fixed left-0 top-1/2 -translate-y-1/2 z-30 w-6 h-16 items-center justify-center rounded-r-xl transition-all hover:w-8"
          style={{ background: 'rgba(37,99,235,0.3)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)' }}
        >
          <ChevronRight size={14} />
        </button>
      )}

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/60" onClick={() => setMobileSidebarOpen(false)} />
          <aside className="relative z-50 w-64 flex flex-col" style={{ background: 'var(--bg-secondary)' }}>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Top bar (Fixed Z-Index to prevent content overlap) */}
        <header className="flex-shrink-0 flex items-center justify-between px-8 py-5 z-[100] relative"
                style={{ borderBottom: '1.5px solid var(--border-color)', background: 'var(--bg-primary)', backdropFilter: 'blur(20px)' }}>
          <div className="flex items-center gap-4">
            <button className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl transition-all hover:bg-blue-500/10"
                    style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
                    onClick={() => setMobileSidebarOpen(true)}>
              <Menu size={20} />
            </button>
            <div>
              <h1 className="font-bold text-xl tracking-tight" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text-primary)' }}>{pageTitle}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <button 
              onClick={toggleTheme}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:bg-slate-100 group border border-slate-200/60"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <Sun size={18} className="group-hover:text-yellow-500 text-slate-500" /> : <Moon size={18} className="group-hover:text-indigo-600 text-slate-500" />}
            </button>

            <div className="relative">
              <button 
                id="notification-bell"
                onClick={(e) => {
                  e.stopPropagation();
                  setNotificationsOpen(!notificationsOpen);
                }}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all hover:bg-slate-100 cursor-pointer relative group border border-slate-200/60 ${notificationsOpen ? 'bg-slate-50' : ''}`}
              >
                <Bell size={18} className="text-slate-500 group-hover:text-blue-600" />
                <span className="absolute top-[2px] right-[2px] w-2 h-2 rounded-full bg-red-500 border-2 border-white" />
              </button>

              {notificationsOpen && (
                <>
                  <div className="fixed inset-0 z-[110]" onClick={() => setNotificationsOpen(false)} />
                  <div className="absolute right-0 mt-4 w-[420px] max-w-[calc(100vw-1rem)] bg-white rounded-[20px] shadow-[0_10px_40px_rgba(0,0,0,0.12)] border border-slate-200/80 z-[120] animate-fade-in origin-top overflow-visible">
                    {/* Centered Arrow */}
                    <div className="absolute top-[-9px] right-[12px] w-4 h-4 bg-white border-t border-l border-slate-200/80 rotate-45 z-[-1]" />
                    
                    <div className="p-5 border-b border-slate-100">
                      <div className="flex items-center justify-between mb-5">
                         <h3 className="text-lg font-bold text-slate-800">Notifications</h3>
                         <button className="text-sm font-medium text-slate-400 hover:text-blue-600 transition-colors whitespace-nowrap">Mark all as read</button>
                      </div>
                    </div>

                    <div className="max-h-[420px] overflow-y-auto custom-scrollbar">
                      {[
                        { name: 'Recall Engine', action: 'ready for Machine Learning', time: '5 minutes ago', type: 'Topic: Gradient Descent', unread: true },
                        { name: 'StudySync System', action: 'generated your evening strategy', time: '1 hour ago', type: 'Schedule Update', unread: true },
                        { name: 'Dr. Sarah', action: 'shared a new research paper', time: '3 hours ago', type: 'Advanced AI', file: 'Neural_Dynamics_2025.pdf', unread: false, actions: true },
                        { name: 'Streak Monitor', action: 'Consistency milestone reached!', time: '6 hours ago', type: '7 Day Streak', unread: false },
                        { name: 'Course Assistant', action: 'shared lecture notes with you', time: 'Yesterday', type: 'Data Structures', file: 'Binary_Trees_Final.pdf', unread: false },
                      ].map((notif, i) => (
                        <div key={i} className="p-4 hover:bg-slate-50 transition-all cursor-pointer border-b border-slate-100 last:border-0 group">
                          <div className="flex gap-3">
                            <div className="pt-1">
                              <div
                                className={`w-2.5 h-2.5 rounded-full ${notif.unread ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.55)]' : 'bg-slate-200'}`}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start mb-1">
                                <p className="text-[14px] leading-tight text-slate-800">
                                  <span className="font-bold">{notif.name} </span>
                                  <span>{notif.action}</span>
                                </p>
                              </div>
                              <p className="text-[11px] text-slate-400 font-semibold tracking-tight">
                                {notif.time}  •  {notif.type}
                              </p>

                              {notif.actions && (
                                <div className="flex gap-2 mt-4">
                                  <button className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-[11px] font-bold hover:bg-slate-200 transition-all active:scale-95">Decline</button>
                                  <button className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-[11px] font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/25 active:scale-95">View Paper</button>
                                </div>
                              )}

                              {notif.file && (
                                <div className="mt-3 p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-2.5 group-hover:bg-white transition-all border-dashed">
                                  <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center">
                                    <FileText size={14} className="text-blue-500" />
                                  </div>
                                  <span className="text-xs font-bold text-slate-600 truncate">{notif.file}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="p-4 border-t border-slate-100 bg-slate-50/50 rounded-b-[20px] flex justify-center gap-[-8px]">
                        <div className="flex -space-x-3">
                           {[1,2,3].map(j => <div key={j} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-xs">👤</div>)}
                           <div className="w-8 h-8 rounded-full border-2 border-white bg-white flex items-center justify-center text-[10px] font-bold text-slate-400">+2</div>
                        </div>
                    </div>
                  </div>
                </>
              )}
            </div>


          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6" style={{ background: 'var(--bg-primary)' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
