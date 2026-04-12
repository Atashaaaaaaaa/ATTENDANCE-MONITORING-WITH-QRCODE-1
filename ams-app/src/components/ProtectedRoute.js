'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { hasRole } from '@/lib/authUtils'
import ForcePasswordChange from '@/components/ForcePasswordChange'

/**
 * Higher-order component to protect routes
 * @param {React.Component} Component - Component to wrap
 * @param {string|Array} requiredRole - Required role(s)
 * @returns {React.Component} - Protected component
 */
export const withProtectedRoute = (Component, requiredRole) => {
  return function ProtectedRoute(props) {
    const router = useRouter()
    const { user, userRole, loading } = useAuth()

    useEffect(() => {
      // If not loading, check authentication and authorization
      if (!loading) {
        // Not authenticated
        if (!user) {
          router.push('/login')
          return
        }

        // Not authorized
        if (!hasRole(userRole, requiredRole)) {
          router.push('/login')
          return
        }
      }
    }, [user, userRole, loading, router, requiredRole])

    // Show loading state while checking auth
    if (loading) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
          <p>Loading...</p>
        </div>
      )
    }

    // Not authenticated or not authorized
    if (!user || !hasRole(userRole, requiredRole)) {
      return null
    }

    // Check if user is forced to change password
    const { userData } = useAuth()
    const isForcedToChangePassword = userData?.forcePasswordChange === true;

    // Render protected component, optionally wrapped or replaced by the forced password change
    return (
      <>
        {isForcedToChangePassword ? (
          <ForcePasswordChange />
        ) : (
          <Component {...props} />
        )}
      </>
    )
  }
}

/**
 * Simple route guard hook
 * @param {string|Array} requiredRole - Required role(s)
 * @returns {Object} - Auth state and guard status
 */
export const useRouteGuard = (requiredRole) => {
  const router = useRouter()
  const { user, userRole, loading, userData } = useAuth()

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login')
      } else if (!hasRole(userRole, requiredRole)) {
        router.push('/login')
      }
    }
  }, [user, userRole, loading, router, requiredRole])

  return {
    user,
    userRole,
    loading,
    isAuthorized: !!user && hasRole(userRole, requiredRole),
    isForcedToChangePassword: userData?.forcePasswordChange === true,
  }
}
