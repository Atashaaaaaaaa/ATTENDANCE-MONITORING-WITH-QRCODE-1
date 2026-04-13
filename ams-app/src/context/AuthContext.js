'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { auth, db } from '@/lib/firebase'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth'
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [userData, setUserData] = useState(null)
  
  // Monitor auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
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
        setUser(null)
        setUserRole(null)
        setUserData(null)
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

  // Sign in function
  const signIn = async (email, password) => {
    try {
      setError(null)

      // Hardcoded admin bypass
      if (email.trim().toLowerCase() === 'admin' && password === 'admin') {
        const mockUser = { uid: 'hardcoded-admin-id', email: 'admin' };
        setUser(mockUser);
        setUserRole('admin');
        return mockUser;
      }

      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const currentUser = userCredential.user

      // Check archived status BEFORE setting user state
      // Check users collection first
      const userDocRef = doc(db, 'users', currentUser.uid)
      const userDocSnap = await getDoc(userDocRef)

      if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        if (data.status === 'archived') {
          await signOut(auth)
          throw new Error('This account has been archived. Please contact an administrator.')
        }
        setUserRole(data.role)
        setUserData(data)
      } else {
        // Fallback: check role-specific collections
        const teacherSnap = await getDoc(doc(db, 'teachers', currentUser.uid))
        if (teacherSnap.exists() && teacherSnap.data().status === 'archived') {
          await signOut(auth)
          throw new Error('This account has been archived. Please contact an administrator.')
        }
        const studentSnap = await getDoc(doc(db, 'students', currentUser.uid))
        if (studentSnap.exists() && studentSnap.data().status === 'archived') {
          await signOut(auth)
          throw new Error('This account has been archived. Please contact an administrator.')
        }
      }

      setUser(currentUser)
      return currentUser
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  // Sign out function
  const logout = async () => {
    try {
      setError(null)
      await signOut(auth)
      setUser(null)
      setUserRole(null)
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

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
