'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { auth, db } from '@/lib/firebase'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth'
import { doc, getDoc, setDoc, onSnapshot, addDoc, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore'
import { send2FACode, generate6DigitCode } from '@/lib/emailService'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [userData, setUserData] = useState(null)

  // 2FA state
  const [pending2FA, setPending2FA] = useState(false)
  const [pending2FAUser, setPending2FAUser] = useState(null)
  const [pending2FAEmail, setPending2FAEmail] = useState('')
  const [twoFAError, setTwoFAError] = useState(null)
  
  // Monitor auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // If we're in 2FA pending state, don't set user yet
        if (pending2FA) {
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
        if (!pending2FA) {
          setUser(null)
          setUserRole(null)
          setUserData(null)
        }
      }
      setLoading(false)
    })

    return unsubscribe
  }, [pending2FA])

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

  // Generate and store 2FA code in Firestore, then send via email
  const generate2FACode = async (email) => {
    try {
      setTwoFAError(null)
      const code = generate6DigitCode()
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes from now

      // Clean up any existing codes for this email
      const existingCodes = await getDocs(
        query(collection(db, '2fa_codes'), where('email', '==', email))
      )
      for (const docSnap of existingCodes.docs) {
        await deleteDoc(doc(db, '2fa_codes', docSnap.id))
      }

      // Store new code
      await addDoc(collection(db, '2fa_codes'), {
        email: email,
        code: code,
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
        used: false,
      })

      // Send via EmailJS
      await send2FACode(email, code)

      return true
    } catch (err) {
      console.error('Error generating 2FA code:', err)
      setTwoFAError('Failed to generate verification code. Please try again.')
      return false
    }
  }

  // Verify 2FA code against Firestore
  const verify2FACode = async (inputCode) => {
    try {
      setTwoFAError(null)

      if (!pending2FAEmail) {
        setTwoFAError('No pending verification. Please login again.')
        return false
      }

      // Query Firestore for the code
      const codesSnap = await getDocs(
        query(
          collection(db, '2fa_codes'),
          where('email', '==', pending2FAEmail),
          where('code', '==', inputCode.trim()),
          where('used', '==', false)
        )
      )

      if (codesSnap.empty) {
        setTwoFAError('Invalid verification code. Please check and try again.')
        return false
      }

      // Check expiration
      const codeDoc = codesSnap.docs[0]
      const codeData = codeDoc.data()
      const expiresAt = new Date(codeData.expiresAt)

      if (new Date() > expiresAt) {
        // Mark as used and reject
        await deleteDoc(doc(db, '2fa_codes', codeDoc.id))
        setTwoFAError('Verification code has expired. Please request a new one.')
        return false
      }

      // Code is valid — mark as used
      await deleteDoc(doc(db, '2fa_codes', codeDoc.id))

      // Complete login — set user from pending state
      if (pending2FAUser) {
        const userDocRef = doc(db, 'users', pending2FAUser.uid)
        const userDocSnap = await getDoc(userDocRef)

        if (userDocSnap.exists()) {
          const data = userDocSnap.data()
          setUserRole(data.role)
          setUserData(data)
        }

        setUser(pending2FAUser)
      }

      // Clear 2FA state
      setPending2FA(false)
      setPending2FAUser(null)
      setPending2FAEmail('')
      setTwoFAError(null)

      return true
    } catch (err) {
      console.error('Error verifying 2FA code:', err)
      setTwoFAError('Verification failed. Please try again.')
      return false
    }
  }

  // Cancel 2FA and sign out the pending user
  const cancel2FA = async () => {
    try {
      await signOut(auth)
    } catch (e) {
      // ignore
    }
    setPending2FA(false)
    setPending2FAUser(null)
    setPending2FAEmail('')
    setTwoFAError(null)
    setUser(null)
    setUserRole(null)
    setUserData(null)
  }

  // Sign in function — now with 2FA
  const signIn = async (email, password) => {
    try {
      setError(null)
      setTwoFAError(null)

      // Hardcoded admin bypass — skips 2FA
      if (email.trim().toLowerCase() === 'admin' && password === 'admin') {
        const mockUser = { uid: 'hardcoded-admin-id', email: 'admin' };
        setUser(mockUser);
        setUserRole('admin');
        return mockUser;
      }

      // Set pending 2FA BEFORE Firebase auth to prevent onAuthStateChanged from completing login
      setPending2FA(true)

      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const currentUser = userCredential.user

      // Check archived status BEFORE proceeding
      const userDocRef = doc(db, 'users', currentUser.uid)
      const userDocSnap = await getDoc(userDocRef)

      if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        if (data.status === 'archived') {
          await signOut(auth)
          setPending2FA(false)
          throw new Error('This account has been archived. Please contact an administrator.')
        }
      } else {
        // Fallback: check role-specific collections
        const teacherSnap = await getDoc(doc(db, 'teachers', currentUser.uid))
        if (teacherSnap.exists() && teacherSnap.data().status === 'archived') {
          await signOut(auth)
          setPending2FA(false)
          throw new Error('This account has been archived. Please contact an administrator.')
        }
        const studentSnap = await getDoc(doc(db, 'students', currentUser.uid))
        if (studentSnap.exists() && studentSnap.data().status === 'archived') {
          await signOut(auth)
          setPending2FA(false)
          throw new Error('This account has been archived. Please contact an administrator.')
        }
      }

      // Store pending user and generate 2FA code
      setPending2FAUser(currentUser)
      setPending2FAEmail(email)

      // Generate and send 2FA code
      await generate2FACode(email)

      // Return a signal that 2FA is needed (don't complete login yet)
      return { requires2FA: true, email: email }
    } catch (err) {
      setPending2FA(false)
      setPending2FAUser(null)
      setPending2FAEmail('')
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
      setUserData(null)
      setPending2FA(false)
      setPending2FAUser(null)
      setPending2FAEmail('')
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
    // 2FA
    pending2FA,
    pending2FAEmail,
    twoFAError,
    verify2FACode,
    generate2FACode,
    cancel2FA,
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
