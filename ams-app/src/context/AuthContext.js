'use client'

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'
import { auth, db } from '@/lib/firebase'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth'
import { doc, getDoc, setDoc, onSnapshot, collection, query, where, getDocs, deleteDoc, updateDoc, serverTimestamp, addDoc, orderBy, limit } from 'firebase/firestore'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [userData, setUserData] = useState(null)

  // Admin verification state
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
        // If we're in the middle of a sign-in verification flow, don't interfere
        if (pendingVerificationRef.current) {
          setLoading(false)
          return
        }

        // Fetch user data from Firestore
        try {
          const userDocRef = doc(db, 'users', currentUser.uid)
          const userDocSnap = await getDoc(userDocRef)

          if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            // Block archived accounts
            if (data.status === 'archived') {
              await signOut(auth)
              setUser(null)
              setUserRole(null)
              setUserData(null)
              setLoading(false)
              return
            }
            // Block accounts that haven't been admin-verified yet
            if (data.adminVerified === false) {
              await signOut(auth)
              setUser(null)
              setUserRole(null)
              setUserData(null)
              setLoading(false)
              return
            }
            setUser(currentUser)
            setUserRole(data.role)

            // Merge data from role-specific collection to get section/department/faceDescriptor
            let mergedData = { ...data }
            try {
              const roleCol = data.role === 'teacher' ? 'teachers' : 'students'
              const roleSnap = await getDoc(doc(db, roleCol, currentUser.uid))
              if (roleSnap.exists()) {
                const roleData = roleSnap.data()
                // Merge missing fields from role collection
                if (!mergedData.section && roleData.section) mergedData.section = roleData.section
                if (!mergedData.department && roleData.department) mergedData.department = roleData.department
                if (!mergedData.faceDescriptor && roleData.faceDescriptor) mergedData.faceDescriptor = roleData.faceDescriptor
              }
            } catch (e) {
              // silent — role doc might not exist
            }
            setUserData(mergedData)
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
        if (!pendingVerificationRef.current) {
          setUser(null)
          setUserRole(null)
          setUserData(null)
        }
      }
      setLoading(false)
    })

    return unsubscribe
  }, [])

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
        // Admin approved — mark account as verified in Firestore permanently
        setPendingVerificationStatus('approved')

        try {
          // Set adminVerified = true on the user document so future logins skip verification
          const userDocRef = doc(db, 'users', currentUser.uid)
          await updateDoc(userDocRef, { adminVerified: true })

          // Fetch updated user data and complete login
          const userDocSnap = await getDoc(userDocRef)
          if (userDocSnap.exists()) {
            const updatedData = userDocSnap.data()
            setUserRole(updatedData.role)
            setUserData(updatedData)
          }
        } catch (err) {
          console.error('Error updating user after approval:', err)
        }

        // Log first-time verified login
        try {
          await addDoc(collection(db, 'loginLogs'), {
            userId: currentUser.uid,
            email: currentUser.email || 'unknown',
            name: data.name || data.email || 'Unknown',
            role: data.role || 'unknown',
            action: 'Login (Verified)',
            status: 'Success',
            timestamp: serverTimestamp(),
          });
        } catch (e) { /* silent */ }

        setUser(currentUser)

        // Clean up verification state after brief delay so user sees "Approved" message
        setTimeout(() => {
          setPendingVerificationSync(false)
          setPendingVerificationUser(null)
          setPendingVerificationStatus(null)
          setVerificationError(null)
        }, 1500)

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
        for (const docSnap of snapshot.docs) {
          await deleteDoc(doc(db, 'pendingVerifications', docSnap.id))
        }
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

  // Sign in function — with one-time admin verification
  const signIn = async (email, password) => {
    try {
      setError(null)
      setVerificationError(null)

      // Hardcoded admin bypass — skips verification
      if (email.trim().toLowerCase() === 'admin' && password === 'admin') {
        const mockUser = { uid: 'hardcoded-admin-id', email: 'admin' };
        setUser(mockUser);
        setUserRole('admin');
        // Log admin login
        try {
          await addDoc(collection(db, 'loginLogs'), {
            userId: 'hardcoded-admin-id',
            email: 'admin',
            name: 'System Admin',
            role: 'admin',
            action: 'Login',
            status: 'Success',
            timestamp: serverTimestamp(),
          });
        } catch (e) { /* silent */ }
        return mockUser;
      }

      // Set pending verification BEFORE Firebase auth to prevent onAuthStateChanged from interfering
      setPendingVerificationSync(true)

      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const currentUser = userCredential.user

      // Check user doc
      const userDocRef = doc(db, 'users', currentUser.uid)
      const userDocSnap = await getDoc(userDocRef)

      if (userDocSnap.exists()) {
        const data = userDocSnap.data();

        // Check archived status
        if (data.status === 'archived') {
          await signOut(auth)
          setPendingVerificationSync(false)
          throw new Error('This account has been archived. Please contact an administrator.')
        }

        // Check forcePasswordChange BEFORE verification
        if (data.forcePasswordChange === true) {
          // Let the user through so ForcePasswordChange modal can show
          setPendingVerificationSync(false)
          setUser(currentUser)
          setUserRole(data.role)
          setUserData(data)
          // Log login (first-time password change)
          try {
            await addDoc(collection(db, 'loginLogs'), {
              userId: currentUser.uid,
              email: data.email || email,
              name: data.fullName || data.name || email,
              role: data.role || 'unknown',
              action: 'First Login (Password Change)',
              status: 'Success',
              timestamp: serverTimestamp(),
            });
          } catch (e) { /* silent */ }
          return { requiresPasswordChange: true }
        }

        // Check if account has already been admin-verified (one-time, stored in Firestore)
        if (data.adminVerified === true) {
          // Already verified — complete login immediately
          setPendingVerificationSync(false)
          setUser(currentUser)
          setUserRole(data.role)
          setUserData(data)
          // Log successful login
          try {
            await addDoc(collection(db, 'loginLogs'), {
              userId: currentUser.uid,
              email: data.email || email,
              name: data.fullName || data.name || email,
              role: data.role || 'unknown',
              action: 'Login',
              status: 'Success',
              timestamp: serverTimestamp(),
            });
          } catch (e) { /* silent */ }
          return currentUser
        }

        // Account NOT yet verified — create a pending verification request
        setPendingVerificationUser(currentUser)
        setPendingVerificationStatus('pending')

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
          email: data.email || email,
          name: data.name || data.fullName || email,
          role: data.role || 'unknown',
          status: 'pending',
          requestedAt: serverTimestamp(),
        })

        // Start listening for admin response
        startVerificationListener(currentUser.uid, currentUser)
        return { requiresVerification: true }

      } else {
        // Fallback: check role-specific collections for archived status
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

        // No user doc found — let them through (edge case)
        setPendingVerificationSync(false)
        setUser(currentUser)
        return currentUser
      }
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
