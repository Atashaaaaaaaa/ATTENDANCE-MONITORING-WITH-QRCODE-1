'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import Webcam from 'react-webcam'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/context/AuthContext'
import { loadModels, getDescriptor, areModelsLoaded } from '@/lib/faceService'

export default function FaceRegistration() {
  const { user, userData, setUserData } = useAuth()
  const webcamRef = useRef(null)
  const [modelsReady, setModelsReady] = useState(false)
  const [modelsError, setModelsError] = useState(null)
  const [showCamera, setShowCamera] = useState(false)
  const [capturing, setCapturing] = useState(false)
  const [status, setStatus] = useState(null) // 'success' | 'error' | 'no_face'
  const [statusMessage, setStatusMessage] = useState('')

  const hasRegisteredFace = userData?.faceDescriptor && userData.faceDescriptor.length > 0

  // Load face-api models on mount
  useEffect(() => {
    if (areModelsLoaded()) {
      setModelsReady(true)
      return
    }
    loadModels()
      .then(() => setModelsReady(true))
      .catch((err) => {
        setModelsError('Failed to load face recognition models. Please refresh.')
        console.error(err)
      })
  }, [])

  const handleOpenCamera = () => {
    setShowCamera(true)
    setStatus(null)
    setStatusMessage('')
  }

  const handleCloseCamera = () => {
    setShowCamera(false)
    setCapturing(false)
  }

  const handleCapture = useCallback(async () => {
    if (!webcamRef.current) return
    setCapturing(true)
    setStatus(null)
    setStatusMessage('Detecting face...')

    try {
      // Get the underlying video element from react-webcam
      const video = webcamRef.current.video
      if (!video || video.readyState < 2) {
        setStatus('error')
        setStatusMessage('Camera not ready. Please wait a moment.')
        setCapturing(false)
        return
      }

      // Draw video frame to a canvas for face detection
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0)

      const descriptor = await getDescriptor(canvas)

      if (!descriptor) {
        setStatus('no_face')
        setStatusMessage('No face detected. Please position your face clearly in the frame and try again.')
        setCapturing(false)
        return
      }

      // Save descriptor to Firestore (convert Float32Array to regular array for storage)
      const descriptorArray = Array.from(descriptor)

      // Save to both users and students collections
      const userDocRef = doc(db, 'users', user.uid)
      await updateDoc(userDocRef, { faceDescriptor: descriptorArray })

      try {
        const studentDocRef = doc(db, 'students', user.uid)
        await updateDoc(studentDocRef, { faceDescriptor: descriptorArray })
      } catch (e) {
        // students collection doc might not exist - that's okay
      }

      // Update local state
      if (setUserData) {
        setUserData(prev => ({ ...prev, faceDescriptor: descriptorArray }))
      }

      setStatus('success')
      setStatusMessage('Face registered successfully! Your face data is now saved for attendance verification.')
      setShowCamera(false)
    } catch (err) {
      console.error('Face registration error:', err)
      setStatus('error')
      setStatusMessage(err.message || 'An error occurred during face registration.')
    } finally {
      setCapturing(false)
    }
  }, [user?.uid, setUserData])

  return (
    <div style={{
      background: 'var(--bg-card)',
      borderRadius: 'var(--radius-xl)',
      border: '1px solid var(--border-light)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '20px 24px',
        borderBottom: '1px solid var(--border-light)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '50%',
            background: hasRegisteredFace ? '#ECFDF5' : '#FFF7ED',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke={hasRegisteredFace ? '#047857' : '#C2410C'}
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Face Recognition
            </h3>
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              {hasRegisteredFace ? 'Face data registered ✓' : 'Not registered yet'}
            </p>
          </div>
        </div>

        {/* Status badge */}
        <div style={{
          padding: '5px 12px', borderRadius: '20px',
          background: hasRegisteredFace ? '#ECFDF5' : '#FEF2F2',
          color: hasRegisteredFace ? '#047857' : '#991B1B',
          fontSize: '0.75rem', fontWeight: 700,
          display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          <span style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: hasRegisteredFace ? '#10B981' : '#EF4444',
            display: 'inline-block',
          }}></span>
          {hasRegisteredFace ? 'Registered' : 'Required'}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '20px 24px' }}>
        {/* Model loading state */}
        {!modelsReady && !modelsError && (
          <div style={{
            textAlign: 'center', padding: '24px',
            color: 'var(--text-muted)', fontSize: '0.85rem',
          }}>
            <div style={{
              width: '24px', height: '24px', border: '3px solid var(--border-light)',
              borderTopColor: 'var(--primary)', borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 12px',
            }}></div>
            Loading face recognition models...
          </div>
        )}

        {modelsError && (
          <div style={{
            padding: '12px 16px', background: '#FEF2F2',
            borderRadius: '10px', border: '1px solid #FECACA',
            fontSize: '0.85rem', color: '#991B1B', fontWeight: 500,
          }}>
            {modelsError}
          </div>
        )}

        {/* Status messages */}
        {status && (
          <div style={{
            padding: '12px 16px', borderRadius: '10px', marginBottom: '16px',
            fontSize: '0.85rem', fontWeight: 500,
            display: 'flex', alignItems: 'center', gap: '10px',
            background: status === 'success' ? '#ECFDF5' : status === 'no_face' ? '#FFF7ED' : '#FEF2F2',
            border: `1px solid ${status === 'success' ? '#A7F3D0' : status === 'no_face' ? '#FED7AA' : '#FECACA'}`,
            color: status === 'success' ? '#047857' : status === 'no_face' ? '#C2410C' : '#991B1B',
          }}>
            {status === 'success' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            ) : status === 'no_face' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            )}
            {statusMessage}
          </div>
        )}

        {/* Webcam */}
        {showCamera && modelsReady && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{
              position: 'relative', borderRadius: '12px', overflow: 'hidden',
              background: '#000', marginBottom: '12px',
            }}>
              <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                videoConstraints={{
                  width: 640, height: 480,
                  facingMode: 'user',
                }}
                mirrored={true}
                style={{
                  width: '100%', display: 'block',
                  maxHeight: '360px', objectFit: 'cover',
                }}
              />
              {/* Face guide overlay */}
              <div style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '180px', height: '220px',
                border: '3px solid rgba(74, 124, 89, 0.8)',
                borderRadius: '50%',
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.25)',
              }}></div>
              {/* Instructions */}
              <div style={{
                position: 'absolute', bottom: '12px', left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                padding: '8px 16px', borderRadius: '8px',
                color: 'white', fontSize: '0.78rem', fontWeight: 600,
                whiteSpace: 'nowrap',
              }}>
                Position your face in the circle
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleCloseCamera}
                style={{
                  flex: 1, padding: '12px', borderRadius: '10px',
                  border: '1.5px solid var(--border-light)', background: 'var(--bg-body)',
                  color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCapture}
                disabled={capturing}
                style={{
                  flex: 2, padding: '12px', borderRadius: '10px', border: 'none',
                  background: capturing ? '#9CA3AF' : 'linear-gradient(135deg, #4A7C59, #6B9E78)',
                  color: 'white', fontWeight: 700, fontSize: '0.85rem',
                  cursor: capturing ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  boxShadow: capturing ? 'none' : '0 4px 15px rgba(74, 124, 89, 0.3)',
                }}
              >
                {capturing ? (
                  <>
                    <div style={{
                      width: '16px', height: '16px',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: 'white', borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                    }}></div>
                    Detecting Face...
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                      <circle cx="12" cy="13" r="4"></circle>
                    </svg>
                    {hasRegisteredFace ? 'Re-Register Face' : 'Register Face'}
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Register/Re-register button (when camera is hidden) */}
        {!showCamera && modelsReady && (
          <button
            onClick={handleOpenCamera}
            style={{
              width: '100%', padding: '14px', borderRadius: '10px',
              border: hasRegisteredFace ? '1.5px solid var(--border-green)' : 'none',
              background: hasRegisteredFace
                ? 'transparent'
                : 'linear-gradient(135deg, #4A7C59, #6B9E78)',
              color: hasRegisteredFace ? 'var(--primary-dark)' : 'white',
              fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              transition: 'all 0.2s ease',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke={hasRegisteredFace ? 'var(--primary)' : 'white'}
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="23 7 16 12 23 17 23 7"></polygon>
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
            </svg>
            {hasRegisteredFace ? 'Re-Register Face' : 'Register Your Face'}
          </button>
        )}

        {/* Info note */}
        <div style={{
          marginTop: '14px', padding: '10px 14px',
          background: '#F0FDF4', borderRadius: '8px',
          border: '1px dashed #BBF7D0',
          fontSize: '0.78rem', color: '#15803D', lineHeight: 1.5,
          display: 'flex', alignItems: 'flex-start', gap: '8px',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#15803D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
          <span>
            Your face data is used only for attendance verification. Ensure good lighting and face the camera directly for best results.
          </span>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
