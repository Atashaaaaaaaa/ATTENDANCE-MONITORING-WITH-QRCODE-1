'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import './login.css'

export default function LoginPage() {
  const router = useRouter()
  const { signIn, userRole, loading: authLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Redirect if already authenticated
  useEffect(() => {
    if (userRole) {
      const dashboardPath = {
        admin: '/admin/overview',
        teacher: '/teacher/dashboard',
        student: '/student/attendance',
      }
      router.push(dashboardPath[userRole] || '/login')
    }
  }, [userRole, router])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Validation
      if (!email.trim()) {
        throw new Error('Email is required')
      }
      if (!password) {
        throw new Error('Password is required')
      }

      // Sign in with email and password
      await signIn(email, password)
    } catch (err) {
      setError(err.message || 'Authentication failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-wrapper">
      <div className="login-container">
        {/* LEFT SIDE */}
        <div className="login-left">
          <div className="login-header-logo">
            <div className="logo-icon"></div>
            <span>AMS</span>
          </div>

          <div className="login-form-wrapper">
            <h1 className="login-title">Sign In</h1>
            <p className="login-subtitle">Welcome back to Attendance Monitoring System</p>

            {error && <div className="login-error">{error}</div>}

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="input-group">
                <div className="input-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                </div>
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <div className="input-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                </div>
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="login-btn" disabled={loading || authLoading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <div className="form-links">
              <a href="#" className="forgot-link">Forgot your password?</a>
            </div>

            <div className="signup-prompt">
              <p>Don't have an account? <a href="/role-select">Sign up here</a></p>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="login-right">
          <div className="visual-content">
            <h2>Attendance Monitoring System</h2>
            <p>Streamline your attendance management with our modern platform</p>
          </div>
        </div>
      </div>
    </div>
  )
}
