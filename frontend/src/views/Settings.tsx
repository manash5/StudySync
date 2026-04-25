import { useState } from 'react'
import { Save, Bell, Lock, User, LogOut, Trash2, Eye, EyeOff } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'

interface UserSettings {
  fullName: string
  email: string
  phone: string
  university: string
  department: string
}

export default function Settings() {
  const { theme, toggleTheme } = useTheme()
  const [settings, setSettings] = useState<UserSettings>({
    fullName: 'Prashant Khadka',
    email: 'prashant@example.com',
    phone: '+977 9800123456',
    university: 'Softwarica College',
    department: 'Computer Science Engineering'
  })

  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    lectureReminders: true,
    classReminders: true,
    assignmentDue: true,
    weeklyDigest: false,
  })

  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' })
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false })

  const handleSettingsChange = (field: keyof UserSettings, value: string) => {
    setSettings(prev => ({ ...prev, [field]: value }))
  }

  const handleNotificationChange = (field: keyof typeof notifications) => {
    setNotifications(prev => ({ ...prev, [field]: !prev[field] }))
  }

  return (
    <div className="animate-fade-in max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text-primary)' }}>Settings</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Manage your account preferences and configurations</p>
      </div>

      {/* Settings Sections */}
      <div className="space-y-6">
        {/* Profile Settings */}
        <div className="glass-card rounded-2xl p-6" style={{ border: '1px solid var(--border-color)' }}>
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <User size={20} /> Profile Settings
          </h3>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Full Name</label>
                <input
                  value={settings.fullName}
                  onChange={e => handleSettingsChange('fullName', e.target.value)}
                  className="input-field w-full px-3.5 py-2.5 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Email</label>
                <input
                  value={settings.email}
                  onChange={e => handleSettingsChange('email', e.target.value)}
                  type="email"
                  className="input-field w-full px-3.5 py-2.5 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Phone</label>
                <input
                  value={settings.phone}
                  onChange={e => handleSettingsChange('phone', e.target.value)}
                  className="input-field w-full px-3.5 py-2.5 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>University</label>
                <input
                  value={settings.university}
                  onChange={e => handleSettingsChange('university', e.target.value)}
                  className="input-field w-full px-3.5 py-2.5 rounded-xl text-sm"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Department</label>
              <input
                value={settings.department}
                onChange={e => handleSettingsChange('department', e.target.value)}
                className="input-field w-full px-3.5 py-2.5 rounded-xl text-sm"
              />
            </div>

            <button className="btn-primary px-6 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 mt-4">
              <Save size={16} /> Save Profile
            </button>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="glass-card rounded-2xl p-6" style={{ border: '1px solid var(--border-color)' }}>
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Bell size={20} /> Notification Preferences
          </h3>

          <div className="space-y-3">
            {Object.entries(notifications).map(([key, value]) => {
              const label = {
                emailNotifications: 'Email Notifications',
                lectureReminders: 'Lecture Reminders',
                classReminders: 'Class Reminders',
                assignmentDue: 'Assignment Due Alerts',
                weeklyDigest: 'Weekly Study Digest'
              }[key as keyof typeof notifications]

              return (
                <label key={key} className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all"
                       style={{ background: 'rgba(59, 130, 246, 0.05)' }}>
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={() => handleNotificationChange(key as keyof typeof notifications)}
                    className="w-5 h-5 rounded accent-blue-500 cursor-pointer"
                  />
                  <span style={{ color: 'var(--text-primary)' }}>{label}</span>
                </label>
              )
            })}
          </div>
        </div>

        {/* Theme Settings */}
        <div className="glass-card rounded-2xl p-6" style={{ border: '1px solid var(--border-color)' }}>
          <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Theme</h3>

          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p style={{ color: 'var(--text-secondary)' }} className="mb-2">
                Current theme: <span className="font-semibold capitalize">{theme}</span>
              </p>
              <p style={{ color: 'var(--text-muted)' }} className="text-sm">
                Customize the appearance of StudySync to match your preference.
              </p>
            </div>
            <button
              onClick={toggleTheme}
              className="btn-primary px-6 py-2.5 rounded-xl font-semibold text-sm whitespace-nowrap"
            >
              Switch to {theme === 'dark' ? 'Light' : 'Dark'} Mode
            </button>
          </div>
        </div>

        {/* Password Settings */}
        <div className="glass-card rounded-2xl p-6" style={{ border: '1px solid var(--border-color)' }}>
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Lock size={20} /> Password & Security
          </h3>

          {!showPasswordForm ? (
            <button
              onClick={() => setShowPasswordForm(true)}
              className="btn-primary px-6 py-2.5 rounded-xl font-semibold text-sm"
            >
              Change Password
            </button>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Current Password</label>
                <div className="relative">
                  <input
                    value={passwords.current}
                    onChange={e => setPasswords(prev => ({ ...prev, current: e.target.value }))}
                    type={showPasswords.current ? 'text' : 'password'}
                    className="input-field w-full px-3.5 py-2.5 rounded-xl text-sm pr-10"
                  />
                  <button
                    onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {showPasswords.current ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>New Password</label>
                <div className="relative">
                  <input
                    value={passwords.new}
                    onChange={e => setPasswords(prev => ({ ...prev, new: e.target.value }))}
                    type={showPasswords.new ? 'text' : 'password'}
                    className="input-field w-full px-3.5 py-2.5 rounded-xl text-sm pr-10"
                  />
                  <button
                    onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {showPasswords.new ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Confirm Password</label>
                <input
                  value={passwords.confirm}
                  onChange={e => setPasswords(prev => ({ ...prev, confirm: e.target.value }))}
                  type="password"
                  className="input-field w-full px-3.5 py-2.5 rounded-xl text-sm"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowPasswordForm(false)
                    setPasswords({ current: '', new: '', confirm: '' })
                  }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-blue-500/10"
                  style={{ border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
                >
                  Cancel
                </button>
                <button className="btn-primary flex-1 py-2.5 rounded-xl text-sm font-semibold">
                  Update Password
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Danger Zone */}
        <div className="glass-card rounded-2xl p-6" style={{ border: '1px solid rgba(239, 68, 68, 0.2)', background: 'rgba(239, 68, 68, 0.03)' }}>
          <h3 className="text-lg font-bold mb-4" style={{ color: '#ef4444' }}>Danger Zone</h3>

          <div className="space-y-3">
            <div>
              <p style={{ color: 'var(--text-secondary)' }} className="mb-2 font-medium">Delete Account</p>
              <p style={{ color: 'var(--text-muted)' }} className="text-sm mb-3">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
              <button className="px-6 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all"
                      style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444' }}>
                <Trash2 size={16} /> Delete Account
              </button>
            </div>

            <div className="border-t pt-4" style={{ borderColor: 'rgba(239, 68, 68, 0.2)' }}>
              <p style={{ color: 'var(--text-secondary)' }} className="mb-2 font-medium">Sign Out</p>
              <p style={{ color: 'var(--text-muted)' }} className="text-sm mb-3">
                Sign out from this device and all other sessions.
              </p>
              <button className="px-6 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all"
                      style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444' }}>
                <LogOut size={16} /> Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
