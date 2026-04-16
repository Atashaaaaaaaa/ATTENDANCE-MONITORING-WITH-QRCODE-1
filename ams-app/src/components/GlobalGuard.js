'use client'

export default function GlobalGuard({ children }) {
  // ForcePasswordChange is handled by ProtectedRoute.js
  // GlobalGuard now only passes children through
  return <>{children}</>
}
