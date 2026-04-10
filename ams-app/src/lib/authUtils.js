import { auth, db } from '@/lib/firebase'
import { doc, getDoc } from 'firebase/firestore'

/**
 * Get user role from Firestore
 * @param {string} uid - User ID from Firebase Auth
 * @returns {Promise<string|null>} - User role or null if not found
 */
export const getUserRole = async (uid) => {
  try {
    const userDocRef = doc(db, 'users', uid)
    const userDocSnap = await getDoc(userDocRef)

    if (userDocSnap.exists()) {
      return userDocSnap.data().role
    }
    return null
  } catch (error) {
    console.error('Error fetching user role:', error)
    throw error
  }
}

/**
 * Get full user data from Firestore
 * @param {string} uid - User ID from Firebase Auth
 * @returns {Promise<Object|null>} - User data or null if not found
 */
export const getUserData = async (uid) => {
  try {
    const userDocRef = doc(db, 'users', uid)
    const userDocSnap = await getDoc(userDocRef)

    if (userDocSnap.exists()) {
      return userDocSnap.data()
    }
    return null
  } catch (error) {
    console.error('Error fetching user data:', error)
    throw error
  }
}

/**
 * Get dashboard path based on user role
 * @param {string} role - User role
 * @returns {string} - Dashboard path
 */
export const getDashboardPath = (role) => {
  const paths = {
    admin: '/admin/overview',
    teacher: '/teacher/dashboard',
    student: '/student/attendance',
  }
  return paths[role] || '/login'
}

/**
 * Check if user has a specific role
 * @param {string} userRole - Current user role
 * @param {string|Array} requiredRole - Required role(s)
 * @returns {boolean} - True if user has the required role
 */
export const hasRole = (userRole, requiredRole) => {
  if (Array.isArray(requiredRole)) {
    return requiredRole.includes(userRole)
  }
  return userRole === requiredRole
}
