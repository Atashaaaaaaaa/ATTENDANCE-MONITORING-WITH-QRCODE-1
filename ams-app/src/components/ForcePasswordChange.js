'use client'

import React, { useState } from 'react'
import { auth, db } from '@/lib/firebase'
import { updatePassword } from 'firebase/auth'
import { doc, updateDoc } from 'firebase/firestore'
import { useAuth } from '@/context/AuthContext'

import { useRouter } from 'next/navigation'

export default function ForcePasswordChange() {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const { user, logout } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    try {
      // Update password in Firebase Auth
      await updatePassword(user, newPassword)

      // Update Firestore document
      const userRef = doc(db, 'users', user.uid)
      await updateDoc(userRef, { forcePasswordChange: false })

      setSuccess('Password updated! Please log in again with your new password.')
      
      // Log out manually, then redirect to login in a few seconds or immediately
      setTimeout(async () => {
        await logout()
        router.push('/login')
      }, 2000)
    } catch (err) {
      console.error('Failed to update password:', err)
      setError(err.message || 'Failed to update password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.55)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999,
      animation: 'fadeIn 0.3s ease',
    }}>
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-xl)',
        maxWidth: '440px',
        width: '90%',
        boxShadow: 'var(--shadow-xl)',
        animation: 'fadeInUp 0.4s ease',
        overflow: 'hidden',
      }}>
        {/* Top accent bar */}
        <div style={{
          height: '4px',
          background: 'linear-gradient(90deg, var(--primary), var(--primary-light), var(--success))',
        }} />

        <div style={{ padding: '36px 32px 32px' }}>
          {/* Shield icon */}
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent-soft), var(--bg-body))',
            border: '2px solid var(--border-green)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              <path d="M9 12l2 2 4-4" stroke="var(--success)" strokeWidth="2.5"></path>
            </svg>
          </div>

          {/* Title */}
          <h2 style={{
            textAlign: 'center',
            fontSize: '1.3rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: '8px',
            letterSpacing: '-0.3px',
          }}>Password Change Required</h2>

          <p style={{
            textAlign: 'center',
            fontSize: '0.88rem',
            color: 'var(--text-secondary)',
            marginBottom: '28px',
            lineHeight: 1.6,
          }}>
            For security reasons, you must change your password before continuing.
          </p>

          {/* Error message */}
          {error && (
            <div style={{
              padding: '12px 16px',
              background: 'var(--danger-bg)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--danger)',
              fontSize: '0.85rem',
              color: 'var(--danger)',
              marginBottom: '20px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              {error}
            </div>
          )}

          {/* Success message */}
          {success && (
            <div style={{
              padding: '20px',
              background: 'var(--success-bg)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-green)',
              textAlign: 'center',
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <div style={{
                fontSize: '0.95rem',
                fontWeight: 600,
                color: 'var(--primary-dark)',
                marginBottom: '4px',
              }}>Password Updated Successfully</div>
              <div style={{
                fontSize: '0.82rem',
                color: 'var(--text-secondary)',
              }}>Redirecting to login...</div>
            </div>
          )}

          {/* Form */}
          {!success && (
            <form onSubmit={handleSubmit}>
              {/* New Password */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                }}>New Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    placeholder="Enter new password"
                    style={{
                      width: '100%',
                      padding: '12px 44px 12px 16px',
                      border: '1.5px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.9rem',
                      fontFamily: 'var(--font-family)',
                      background: 'var(--bg-body)',
                      color: 'var(--text-primary)',
                      transition: 'var(--transition-fast)',
                      outline: 'none',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'var(--primary)'
                      e.target.style.boxShadow = '0 0 0 3px var(--accent-glow)'
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'var(--border-color)'
                      e.target.style.boxShadow = 'none'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    style={{
                      position: 'absolute', right: '12px', top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      padding: '4px', display: 'flex', alignItems: 'center',
                      color: 'var(--text-muted)',
                      transition: 'var(--transition-fast)',
                    }}
                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"></path><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"></path><line x1="1" y1="1" x2="23" y2="23"></line><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"></path></svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                }}>Confirm New Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Confirm new password"
                    style={{
                      width: '100%',
                      padding: '12px 44px 12px 16px',
                      border: '1.5px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.9rem',
                      fontFamily: 'var(--font-family)',
                      background: 'var(--bg-body)',
                      color: 'var(--text-primary)',
                      transition: 'var(--transition-fast)',
                      outline: 'none',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'var(--primary)'
                      e.target.style.boxShadow = '0 0 0 3px var(--accent-glow)'
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'var(--border-color)'
                      e.target.style.boxShadow = 'none'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      position: 'absolute', right: '12px', top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      padding: '4px', display: 'flex', alignItems: 'center',
                      color: 'var(--text-muted)',
                      transition: 'var(--transition-fast)',
                    }}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"></path><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"></path><line x1="1" y1="1" x2="23" y2="23"></line><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"></path></svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Password strength hint */}
              <div style={{
                padding: '10px 14px',
                background: 'var(--accent-soft)',
                borderRadius: 'var(--radius-sm)',
                border: '1px dashed var(--border-green)',
                fontSize: '0.78rem',
                color: 'var(--primary-dark)',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                Password must be at least 6 characters long.
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: loading
                    ? 'var(--text-muted)'
                    : 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  fontFamily: 'var(--font-family)',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'var(--transition-base)',
                  boxShadow: loading ? 'none' : '0 4px 15px rgba(74, 124, 89, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                {loading ? (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                      <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                    </svg>
                    Updating...
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    </svg>
                    Update Password
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Spinner keyframe (inline for loading state) */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
