'use client'

import { useAuth } from '@/context/AuthContext'
import ForcePasswordChange from '@/components/ForcePasswordChange'

export default function GlobalGuard({ children }) {
  const { userData } = useAuth()

  if (userData?.forcePasswordChange) {
    return (
      <>
        {children}
        <ForcePasswordChange />
      </>
    )
  }

  return <>{children}</>
}
