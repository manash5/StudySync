'use client'

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import LandingPage from './views/LandingPage'
import LoginPage from './views/LoginPage'
import SignupPage from './views/SignupPage'
import DashboardLayout from './components/DashboardLayout'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './contexts/AuthContext'
import Dashboard from './views/Dashboard'
import Routine from './views/Routine'
import Notes from './views/Notes'
import NoteDetail from './views/NoteDetail'
import Lectures from './views/Lectures'
import Settings from './views/Settings'
import StudyPlan from './views/StudyPlan'

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route
              path="/app"
              element={(
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              )}
            >
              <Route index element={<Navigate to="/app/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="routine" element={<Routine />} />
              <Route path="study-plan" element={<StudyPlan />} />
              <Route path="notes" element={<Notes />} />
              <Route path="notes/:subject" element={<NoteDetail />} />
              <Route path="lectures" element={<Lectures />} />
              <Route path="settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
