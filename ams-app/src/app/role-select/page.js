'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './role-select.module.css'

export default function RoleSelection() {
  const [selectedRole, setSelectedRole] = useState(null)
  const router = useRouter()

  const roles = [
    {
      id: 'admin',
      name: 'Admin',
      description: 'Manage system, users, and attendance records',
      icon: '👨‍💼',
    },
    {
      id: 'teacher',
      name: 'Teacher',
      description: 'Mark attendance and view reports',
      icon: '👨‍🏫',
    },
    {
      id: 'student',
      name: 'Student',
      description: 'View your attendance and schedule',
      icon: '👨‍🎓',
    },
  ]

  const handleRoleSelect = (roleId) => {
    setSelectedRole(roleId)
    // Store role in session storage for use during signup
    sessionStorage.setItem('selectedRole', roleId)
    router.push('/signup')
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1>Select Your Role</h1>
        <p className={styles.subtitle}>Choose the role that best describes your position</p>

        <div className={styles.rolesGrid}>
          {roles.map((role) => (
            <button
              key={role.id}
              className={`${styles.roleCard} ${
                selectedRole === role.id ? styles.selected : ''
              }`}
              onClick={() => handleRoleSelect(role.id)}
            >
              <div className={styles.icon}>{role.icon}</div>
              <h2>{role.name}</h2>
              <p>{role.description}</p>
              <div className={styles.selectButton}>
                {selectedRole === role.id ? (
                  <span className={styles.checkmark}>✓ Selected</span>
                ) : (
                  <span>Select</span>
                )}
              </div>
            </button>
          ))}
        </div>

        <p className={styles.loginLink}>
          Already have an account?{' '}
          <a href="/login">Sign in here</a>
        </p>
      </div>
    </div>
  )
}
