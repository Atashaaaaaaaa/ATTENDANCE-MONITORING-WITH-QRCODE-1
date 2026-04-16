'use client'

import { useAuth } from '@/context/AuthContext'
import ForcePasswordChange from '@/components/ForcePasswordChange'
import FaceRegistrationGate from '@/components/FaceRegistrationGate'

/**
 * GlobalGuard wraps ALL pages at the root layout level.
 * It enforces two sequential gates:
 *   1. Force password change (all roles) — if forcePasswordChange === true
 *   2. Face registration (students only) — if faceDescriptor is missing/empty
 */
export default function GlobalGuard({ children }) {
  const { user, userRole, userData } = useAuth()

  // Only enforce for authenticated users with loaded userData
  if (!user || !userData) {
    return <>{children}</>
  }

  // Skip enforcement for hardcoded admin
  if (user.uid === 'hardcoded-admin-id') {
    return <>{children}</>
  }

  // Gate 1: Force password change (all roles)
  if (userData.forcePasswordChange === true) {
    return <ForcePasswordChange />
  }

  // Gate 2: Face registration required (students only)
  if (userRole === 'student') {
    const hasFace = userData.faceDescriptor && userData.faceDescriptor.length > 0
    if (!hasFace) {
      return <FaceRegistrationGate />
    }
  }

  return <>{children}</>
}
