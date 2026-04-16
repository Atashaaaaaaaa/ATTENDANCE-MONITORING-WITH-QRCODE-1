'use client'

import React from 'react'
import FaceRegistration from '@/components/FaceRegistration'

/**
 * Blocking gate modal that forces students to register their face
 * before accessing any part of the system.
 * Rendered by GlobalGuard when:
 *   - User is a student
 *   - forcePasswordChange is false (already changed password)
 *   - faceDescriptor is missing or empty
 */
export default function FaceRegistrationGate() {
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
        maxWidth: '480px',
        width: '92%',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'var(--shadow-xl)',
        animation: 'fadeInUp 0.4s ease',
        overflow: 'hidden',
      }}>
        {/* Top accent bar */}
        <div style={{
          height: '4px',
          background: 'linear-gradient(90deg, var(--primary), var(--primary-light), var(--success))',
        }} />

        <div style={{ padding: '32px 28px 28px', overflowY: 'auto', flex: 1 }}>
          {/* Icon */}
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #FFF7ED, #FED7AA)',
            border: '2px solid #FED7AA',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C2410C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="23 7 16 12 23 17 23 7"></polygon>
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
            </svg>
          </div>

          {/* Title */}
          <h2 style={{
            textAlign: 'center',
            fontSize: '1.25rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: '8px',
            letterSpacing: '-0.3px',
          }}>Face Registration Required</h2>

          <p style={{
            textAlign: 'center',
            fontSize: '0.88rem',
            color: 'var(--text-secondary)',
            marginBottom: '24px',
            lineHeight: 1.6,
          }}>
            For attendance verification, you must register your face before accessing the system. This is a one-time setup.
          </p>

          {/* Warning banner */}
          <div style={{
            padding: '10px 14px',
            background: '#FFF7ED',
            borderRadius: '10px',
            border: '1px solid #FED7AA',
            fontSize: '0.8rem',
            color: '#C2410C',
            fontWeight: 500,
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C2410C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            You cannot access attendance features until face registration is complete.
          </div>

          {/* Embedded FaceRegistration component */}
          <FaceRegistration />
        </div>
      </div>
    </div>
  )
}
