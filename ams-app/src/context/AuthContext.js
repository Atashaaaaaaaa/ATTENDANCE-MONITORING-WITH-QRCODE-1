'use client'

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'
import { auth, db } from '@/lib/firebase'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth'
import { doc, getDoc, setDoc, onSnapshot, collection, query, where, getDocs, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [userData, setUserData] = useState(null)

  // Admin verification state (replaces old email 2FA)
  const [pendingVerification, setPendingVerification] = useState(false)
  const [pendingVerificationUser, setPendingVerificationUser] = useState(null)
  const [pendingVerificationStatus, setPendingVerificationStatus] = useState(null) // 'pending' | 'approved' | 'rejected'
  const [verificationError, setVerificationError] = useState(null)
  const verificationListenerRef = useRef(null)

  // Ref to track pendingVerification synchronously — prevents stale closure in onAuthStateChanged
  const pendingVerificationRef = useRef(false)

  // Helper to update both state and ref together
  const setPendingVerificationSync = useCallback((value) => {
    pendingVerificationRef.current = value
    setPendingVerification(value)
  }, [])
  
  // Monitor auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Read from ref (always current) instead of state (stale closure)
        if (pendingVerificationRef.current) {
          setLoading(false)
          return
        }

        // Check if this browser is verified
        const isVerifiedBrowser = typeof window !== 'undefined' && localStorage.getItem(`verified_browser_${currentUser.uid}`) === 'true'

        if (!isVerifiedBrowser) {
          // User has a Firebase session but hasn't been verified by admin in this browser
          // Sign them out to force re-authentication
          try {
            await signOut(auth)
          } catch (e) {
            // ignore sign-out errors
          }
          setUser(null)
          setUserRole(null)
          setUserData(null)
          setLoading(false)
          return
        }

        // Fetch user role from Firestore BEFORE setting user state
        try {
          const userDocRef = doc(db, 'users', currentUser.uid)
          const userDocSnap = await getDoc(userDocRef)

          if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            // Block archived accounts from staying logged in
            if (data.status === 'archived') {
              await signOut(auth)
              setUser(null)
              setUserRole(null)
              setUserData(null)
              setLoading(false)
              return
            }
            setUser(currentUser)
            setUserRole(data.role)
            setUserData(data)
          } else {
            // Also check role-specific collections as fallback
            let isArchived = false
            const teacherSnap = await getDoc(doc(db, 'teachers', currentUser.uid))
            if (teacherSnap.exists() && teacherSnap.data().status === 'archived') {
              isArchived = true
            }
            if (!isArchived) {
              const studentSnap = await getDoc(doc(db, 'students', currentUser.uid))
              if (studentSnap.exists() && studentSnap.data().status === 'archived') {
                isArchived = true
              }
            }
            if (isArchived) {
              await signOut(auth)
              setUser(null)
              setUserRole(null)
              setUserData(null)
              setLoading(false)
              return
            }
            setUser(currentUser)
          }
        } catch (err) {
          console.error('Error fetching user role:', err)
          setError(err.message)
          setUser(currentUser)
        }
      } else {
        // Read from ref (always current) instead of state (stale closure)
        if (!pendingVerificationRef.current) {
          setUser(null)
          setUserRole(null)
          setUserData(null)
        }
      }
      setLoading(false)
    })

    return unsubscribe
  }, []) // No dependency on pendingVerification — ref is always current

  // Real-time listener: auto sign-out if account gets archived while logged in
  useEffect(() => {
    if (!user || !user.uid || user.uid === 'hardcoded-admin-id') return

    const userDocRef = doc(db, 'users', user.uid)
    const unsubscribeSnapshot = onSnapshot(userDocRef, async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data()
        if (data.status === 'archived') {
          try {
            await signOut(auth)
          } catch (e) {
            // ignore sign-out errors
          }
          setUser(null)
          setUserRole(null)
          setUserData(null)
        }
      }
    }, (err) => {
      console.error('Snapshot listener error:', err)
    })

    return () => unsubscribeSnapshot()
  }, [user?.uid])

  // Sign up function
  const signUp = async (email, password, role, userData) => {
    try {
      setError(null)
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const currentUser = userCredential.user

      // Save user data to Firestore
      const userRef = doc(db, 'users', currentUser.uid)
      await setDoc(userRef, {
        uid: currentUser.uid,
        email: currentUser.email,
        role: role,
        createdAt: new Date(),
        ...userData, // Additional user data (name, etc.)
      })

      setUser(currentUser)
      setUserRole(role)
      return currentUser
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  // Start listening for admin approval on a pending verification document
  const startVerificationListener = (verificationDocId, currentUser) => {
    // Clean up any existing listener
    if (verificationListenerRef.current) {
      verificationListenerRef.current()
    }

    const verificationDocRef = doc(db, 'pendingVerifications', verificationDocId)
    const unsubscribe = onSnapshot(verificationDocRef, async (snapshot) => {
      if (!snapshot.exists()) return

      const data = snapshot.data()

      if (data.status === 'approved') {
        // Admin approved — complete login
        setPendingVerificationStatus('approved')

        // Mark this browser as verified
        if (typeof window !== 'undefined') {
          localStorage.setItem(`verified_browser_${currentUser.uid}`, 'true')
        }

        // Fetch user data and complete login
        try {
          const userDocRef = doc(db, 'users', currentUser.uid)
          const userDocSnap = await getDoc(userDocRef)

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data()
            setUserRole(userData.role)
            setUserData(userData)
          }
        } catch (err) {
          console.error('Error fetching user data after approval:', err)
        }

        setUser(currentUser)

        // Clean up verification state
        setTimeout(() => {
          setPendingVerificationSync(false)
          setPendingVerificationUser(null)
          setPendingVerificationStatus(null)
          setVerificationError(null)
        }, 1500) // Brief delay so user sees "Approved" message

        // Clean up the listener
        if (verificationListenerRef.current) {
          verificationListenerRef.current()
          verificationListenerRef.current = null
        }

        // Delete the verification doc (cleanup)
        try {
          await deleteDoc(verificationDocRef)
        } catch (e) {
          // ignore cleanup errors
        }
      } else if (data.status === 'rejected') {
        // Admin rejected
        setPendingVerificationStatus('rejected')
        setVerificationError('Your verification request was rejected by the administrator.')

        // Sign out
        try {
          await signOut(auth)
        } catch (e) {
          // ignore
        }

        // Clean up after a moment
        setTimeout(() => {
          setPendingVerificationSync(false)
          setPendingVerificationUser(null)
          setPendingVerificationStatus(null)
          setUser(null)
          setUserRole(null)
          setUserData(null)
        }, 3000)

        // Clean up the listener
        if (verificationListenerRef.current) {
          verificationListenerRef.current()
          verificationListenerRef.current = null
        }

        // Delete the verification doc (cleanup)
        try {
          await deleteDoc(verificationDocRef)
        } catch (e) {
          // ignore cleanup errors
        }
      }
    }, (error) => {
      console.error('Verification listener error:', error)
    })

    verificationListenerRef.current = unsubscribe
  }

  // Cancel verification and sign out
  const cancelVerification = async () => {
    // Clean up listener
    if (verificationListenerRef.current) {
      verificationListenerRef.current()
      verificationListenerRef.current = null
    }

    // Delete the pending verification doc if it exists
    if (pendingVerificationUser) {
      try {
        const verificationsRef = collection(db, 'pendingVerifications')
        const q = query(verificationsRef, where('uid', '==', pendingVerificationUser.uid), where('status', '==', 'pending'))
        const snapshot = await getDocs(q)
        snapshot.forEach(async (docSnap) => {
          await deleteDoc(doc(db, 'pendingVerifications', docSnap.id))
        })
      } catch (e) {
        // ignore cleanup errors
      }
    }

    try {
      await signOut(auth)
    } catch (e) {
      // ignore
    }
    setPendingVerificationSync(false)
    setPendingVerificationUser(null)
    setPendingVerificationStatus(null)
    setVerificationError(null)
    setUser(null)
    setUserRole(null)
    setUserData(null)
  }

  // Sign in function — with admin verification
  const signIn = async (email, password) => {
    try {
      setError(null)
      setVerificationError(null)

      // Hardcoded admin bypass — skips verification
      if (email.trim().toLowerCase() === 'admin' && password === 'admin') {
        const mockUser = { uid: 'hardcoded-admin-id', email: 'admin' };
        // Mark admin session as verified
        if (typeof window !== 'undefined') {
          localStorage.setItem(`verified_browser_${mockUser.uid}`, 'true')
        }
        setUser(mockUser);
        setUserRole('admin');
        return mockUser;
      }

      // Set pending verification BEFORE Firebase auth to prevent onAuthStateChanged from completing login
      setPendingVerificationSync(true)

      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const currentUser = userCredential.user

      // Check archived status BEFORE proceeding
      const userDocRef = doc(db, 'users', currentUser.uid)
      const userDocSnap = await getDoc(userDocRef)

      if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        if (data.status === 'archived') {
          await signOut(auth)
          setPendingVerificationSync(false)
          throw new Error('This account has been archived. Please contact an administrator.')
        }

        // Check forcePasswordChange BEFORE verification
        if (data.forcePasswordChange === true) {
          // Let the user through so ForcePasswordChange modal can show
          // Mark browser as temporarily verified so onAuthStateChanged doesn't sign them out
          if (typeof window !== 'undefined') {
            localStorage.setItem(`verified_browser_${currentUser.uid}`, 'true')
          }
          setPendingVerificationSync(false)
          setUser(currentUser)
          setUserRole(data.role)
          setUserData(data)
          return { requiresPasswordChange: true }
        }
      } else {
        // Fallback: check role-specific collections
        const teacherSnap = await getDoc(doc(db, 'teachers', currentUser.uid))
        if (teacherSnap.exists() && teacherSnap.data().status === 'archived') {
          await signOut(auth)
          setPendingVerificationSync(false)
          throw new Error('This account has been archived. Please contact an administrator.')
        }
        const studentSnap = await getDoc(doc(db, 'students', currentUser.uid))
        if (studentSnap.exists() && studentSnap.data().status === 'archived') {
          await signOut(auth)
          setPendingVerificationSync(false)
          throw new Error('This account has been archived. Please contact an administrator.')
        }
      }

      // Check if this browser is already verified
      const isVerifiedBrowser = typeof window !== 'undefined' && localStorage.getItem(`verified_browser_${currentUser.uid}`) === 'true'

      if (isVerifiedBrowser) {
        // Browser already verified — complete login immediately
        setPendingVerificationSync(false)
        if (userDocSnap.exists()) {
          const data = userDocSnap.data()
          setUserRole(data.role)
          setUserData(data)
        }
        setUser(currentUser)
        return currentUser
      }

      // Browser not verified — create a pending verification request
      setPendingVerificationUser(currentUser)
      setPendingVerificationStatus('pending')

      // Get user info for the verification request
      const userData = userDocSnap.exists() ? userDocSnap.data() : {}
      const verificationDocRef = doc(db, 'pendingVerifications', currentUser.uid)

      // Check if there's already a pending request
      const existingVerification = await getDoc(verificationDocRef)
      if (existingVerification.exists() && existingVerification.data().status === 'pending') {
        // Reuse existing pending request
        startVerificationListener(currentUser.uid, currentUser)
        return { requiresVerification: true }
      }

      // Create new pending verification request
      await setDoc(verificationDocRef, {
        uid: currentUser.uid,
        email: userData.email || email,
        name: userData.name || userData.fullName || email,
        role: userData.role || 'unknown',
        status: 'pending',
        requestedAt: serverTimestamp(),
      })

      // Start listening for admin response
      startVerificationListener(currentUser.uid, currentUser)

      return { requiresVerification: true }
    } catch (err) {
      setPendingVerificationSync(false)
      setPendingVerificationUser(null)
      setPendingVerificationStatus(null)
      setError(err.message)
      throw err
    }
  }

  // Sign out function
  const logout = async () => {
    try {
      setError(null)

      // Clean up verification listener
      if (verificationListenerRef.current) {
        verificationListenerRef.current()
        verificationListenerRef.current = null
      }

      await signOut(auth)
      setUser(null)
      setUserRole(null)
      setUserData(null)
      setPendingVerificationSync(false)
      setPendingVerificationUser(null)
      setPendingVerificationStatus(null)
      setVerificationError(null)
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  // Clean up listener on unmount
  useEffect(() => {
    return () => {
      if (verificationListenerRef.current) {
        verificationListenerRef.current()
      }
    }
  }, [])

  const value = {
    user,
    userRole,
    userData,
    setUserData,
    loading,
    error,
    signUp,
    signIn,
    logout,
    isAuthenticated: !!user,
    // Admin verification
    pendingVerification,
    pendingVerificationStatus,
    verificationError,
    cancelVerification,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
