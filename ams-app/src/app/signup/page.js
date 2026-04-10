'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import styles from './signup.module.css'

export default function SignUp() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [selectedRole, setSelectedRole] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const router = useRouter()
  const { signUp } = useAuth()

  useEffect(() => {
    // Get selected role from session storage
    const role = sessionStorage.getItem('selectedRole')
    if (!role) {
      router.push('/role-select')
    } else {
      setSelectedRole(role)
    }
  }, [router])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Validation
      if (!formData.fullName.trim()) {
        throw new Error('Full name is required')
      }
      if (!formData.email.trim()) {
        throw new Error('Email is required')
      }
      if (!formData.password) {
        throw new Error('Password is required')
      }
      if (formData.password.length < 6) {
        throw new Error('Password must be at least 6 characters')
      }
      if (formData.password !== formData.confirmPassword) {
        throw new Error('Passwords do not match')
      }

      // Call sign up
      await signUp(formData.email, formData.password, selectedRole, {
        fullName: formData.fullName,
      })

      // Clear session storage
      sessionStorage.removeItem('selectedRole')

      // Redirect to appropriate dashboard
      const dashboardPath = {
        admin: '/admin/overview',
        teacher: '/teacher/dashboard',
        student: '/student/attendance',
      }

      router.push(dashboardPath[selectedRole] || '/login')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!selectedRole) {
    return <div className={styles.loading}>Loading...</div>
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1>Create Account</h1>
          <p className={styles.roleInfo}>Role: <span>{selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}</span></p>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="fullName">Full Name *</label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Enter your full name"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="email">Email *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password">Password *</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password (min 6 characters)"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="confirmPassword">Confirm Password *</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm your password"
              required
            />
          </div>

          <button
            type="submit"
            className={styles.submitButton}
            disabled={loading}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <p className={styles.loginLink}>
          Already have an account?{' '}
          <a href="/login">Sign in here</a>
        </p>
      </div>
    </div>
  )
}
