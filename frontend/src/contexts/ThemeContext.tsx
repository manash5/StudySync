import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Get theme from localStorage or default to light
    const stored = localStorage.getItem('theme') as Theme | null
    const initial = stored || 'light'
    setTheme(initial)
    applyTheme(initial)
    setMounted(true)
  }, [])

  const applyTheme = (newTheme: Theme) => {
    const root = document.documentElement
    if (newTheme === 'dark') {
      root.style.setProperty('--bg-primary', '#0a0f1e')
      root.style.setProperty('--bg-secondary', '#0f172a')
      root.style.setProperty('--bg-tertiary', '#0d1526')
      root.style.setProperty('--text-primary', '#f0f6ff')
      root.style.setProperty('--text-secondary', '#94a3b8')
      root.style.setProperty('--text-muted', '#475569')
      root.style.setProperty('--border-color', 'rgba(59, 130, 246, 0.15)')
      root.style.setProperty('--card-bg', 'rgba(15, 23, 42, 0.7)')
      root.style.setProperty('--input-bg', 'rgba(15, 23, 42, 0.8)')
    } else {
      root.style.setProperty('--bg-primary', '#ffffff')
      root.style.setProperty('--bg-secondary', '#f8fafc')
      root.style.setProperty('--bg-tertiary', '#f1f5f9')
      root.style.setProperty('--text-primary', '#0f172a')
      root.style.setProperty('--text-secondary', '#475569')
      root.style.setProperty('--text-muted', '#94a3b8')
      root.style.setProperty('--border-color', 'rgba(59, 130, 246, 0.2)')
      root.style.setProperty('--card-bg', 'rgba(59, 130, 246, 0.05)')
      root.style.setProperty('--input-bg', 'rgba(59, 130, 246, 0.03)')
    }
  }

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    applyTheme(newTheme)
    localStorage.setItem('theme', newTheme)
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}
