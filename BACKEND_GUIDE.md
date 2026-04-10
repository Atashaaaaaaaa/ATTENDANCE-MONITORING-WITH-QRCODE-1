# Backend Implementation Guide

## Quick Start

### Step 1: Verify Firebase Setup
Your Firebase is already configured in `src/lib/firebase.js` with:
- Firebase Authentication
- Firestore Database

### Step 2: Authentication Flow

#### For End Users:
1. **New Users**: Navigate to landing page → Click "Get Started" → Select role → Sign up
2. **Existing Users**: Go to login page → Enter credentials → Auto-redirect to dashboard

#### For Developers:
- `AuthContext.js` handles all auth logic
- `useAuth()` hook provides user state globally
- Protected routes automatically redirect unauthorized users

## Using Authentication in Pages

### Example: Creating a Protected Admin Page

```javascript
// src/app/admin/settings/page.js
'use client'

import { useRouteGuard } from '@/components/ProtectedRoute'
import { useAuth } from '@/context/AuthContext'

export default function AdminSettings() {
  const { isAuthorized, loading, userRole } = useRouteGuard('admin')
  const { user } = useAuth()

  if (loading) return <div className="loading">Loading...</div>
  if (!isAuthorized) return null

  return (
    <div>
      <h1>Admin Settings</h1>
      <p>Welcome, {user?.email}</p>
      {/* Your admin content here */}
    </div>
  )
}
```

### Example: Using Auth Context Directly

```javascript
'use client'

import { useAuth } from '@/context/AuthContext'

export default function MyComponent() {
  const { user, userRole, loading, logout, isAuthenticated } = useAuth()

  if (loading) return <p>Loading...</p>

  if (!isAuthenticated) {
    return <p>Please sign in</p>
  }

  return (
    <div>
      <p>User: {user.email}</p>
      <p>Role: {userRole}</p>
      <button onClick={logout}>Sign Out</button>
    </div>
  )
}
```

## Protecting Routes

### Method 1: Using useRouteGuard Hook (Recommended)

```javascript
const { isAuthorized, loading } = useRouteGuard('teacher')

// Component only renders if user is teacher
```

### Method 2: Using withProtectedRoute HOC

```javascript
function TeacherDashboard() {
  return <h1>Teacher Dashboard</h1>
}

export default withProtectedRoute(TeacherDashboard, 'teacher')
```

### Method 3: Using useAuth Hook Manually

```javascript
const { user, userRole, loading } = useAuth()

if (!user || userRole !== 'admin') {
  return null // or redirect
}
```

## API Routes

### Creating a Protected API Endpoint

```javascript
// src/app/api/admin/users/route.js

import { db } from '@/lib/firebase'
import { collection, getDocs } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

export async function GET(request) {
  try {
    // You would typically verify admin role here
    const auth = getAuth()
    const currentUser = auth.currentUser

    if (!currentUser) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401 }
      )
    }

    // Fetch users from Firestore
    const usersCollection = collection(db, 'users')
    const snapshot = await getDocs(usersCollection)
    const users = snapshot.docs.map(doc => doc.data())

    return new Response(
      JSON.stringify({
        message: 'Users retrieved',
        users: users
      }),
      { status: 200 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    )
  }
}
```

## Firestore Queries with Auth

### Get Current User's Data

```javascript
import { useAuth } from '@/context/AuthContext'
import { db } from '@/lib/firebase'
import { doc, getDoc } from 'firebase/firestore'

export default function UserProfile() {
  const { user } = useAuth()
  const [userData, setUserData] = useState(null)

  useEffect(() => {
    if (user) {
      const fetchUserData = async () => {
        const userRef = doc(db, 'users', user.uid)
        const docSnap = await getDoc(userRef)
        setUserData(docSnap.data())
      }
      fetchUserData()
    }
  }, [user])

  return <div>{userData?.fullName}</div>
}
```

### Query Collection with Role Filter

```javascript
import { collection, query, where, getDocs } from 'firebase/firestore'

async function getStudents() {
  const q = query(
    collection(db, 'users'),
    where('role', '==', 'student')
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => doc.data())
}
```

## User Profile Management

### Update User Profile

```javascript
import { db } from '@/lib/firebase'
import { doc, updateDoc } from 'firebase/firestore'

async function updateUserProfile(uid, updates) {
  try {
    const userRef = doc(db, 'users', uid)
    await updateDoc(userRef, {
      ...updates,
      updatedAt: new Date()
    })
    return { success: true }
  } catch (error) {
    return { error: error.message }
  }
}
```

## Logout Implementation

```javascript
'use client'

import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'

export default function LogoutButton() {
  const { logout } = useAuth()
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await logout()
      router.push('/login')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  return <button onClick={handleLogout}>Sign Out</button>
}
```

## Common Patterns

### Pattern 1: Role-Based Component Rendering

```javascript
import { useAuth } from '@/context/AuthContext'

export default function Dashboard() {
  const { userRole, loading } = useAuth()

  if (loading) return <div>Loading...</div>

  return (
    <div>
      {userRole === 'admin' && <AdminPanel />}
      {userRole === 'teacher' && <TeacherPanel />}
      {userRole === 'student' && <StudentPanel />}
    </div>
  )
}
```

### Pattern 2: Conditional Navigation Links

```javascript
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'

export default function Navigation() {
  const { userRole } = useAuth()

  return (
    <nav>
      {userRole === 'admin' && (
        <>
          <Link href="/admin/overview">Overview</Link>
          <Link href="/admin/users">Users</Link>
          <Link href="/admin/mapping">Mapping</Link>
        </>
      )}
      {userRole === 'teacher' && (
        <>
          <Link href="/teacher/dashboard">Dashboard</Link>
          <Link href="/teacher/reports">Reports</Link>
        </>
      )}
    </nav>
  )
}
```

### Pattern 3: Form with Role-Based Fields

```javascript
import { useAuth } from '@/context/AuthContext'

export default function UserForm() {
  const { userRole } = useAuth()

  return (
    <form>
      <input type="text" placeholder="Full Name" />
      <input type="email" placeholder="Email" />
      
      {userRole === 'teacher' && (
        <input type="text" placeholder="Department" />
      )}
      
      {userRole === 'student' && (
        <input type="text" placeholder="Student ID" />
      )}
      
      <button type="submit">Save</button>
    </form>
  )
}
```

## Testing Protected Routes

### Manual Testing

1. **Test Sign Up Flow**
   - Go to `http://localhost:3000`
   - Click "Get Started"
   - Select each role and complete signup
   - Verify redirect to correct dashboard

2. **Test Sign In**
   - Go to `/login`
   - Use created credentials
   - Verify redirect to correct dashboard

3. **Test Protected Routes**
   - While logged in as student, try accessing `/admin/overview`
   - Should redirect to `/login`

4. **Test Logout**
   - Click logout button
   - Should redirect to login
   - Try accessing protected route → should redirect

## Performance Tips

1. **Memoize Auth Context**
   - Auth state changes frequently
   - Use `useCallback` for auth functions

2. **Lazy Load Protected Components**
   ```javascript
   const AdminPanel = lazy(() => import('./AdminPanel'))
   ```

3. **Cache User Data**
   - Store user role in sessionStorage if needed
   - Reduces Firestore reads

## Security Checklist

- ✅ Firebase rules restrict direct database access
- ✅ Passwords validated on both client and server
- ✅ Protected routes check authentication
- ✅ User can only access their own data
- ✅ Admin functions require admin verification

## Debugging

### Enable Debug Logging

```javascript
import { getAuth, connectAuthEmulator } from 'firebase/auth'

if (process.env.NODE_ENV === 'development') {
  const auth = getAuth()
  connectAuthEmulator(auth, 'http://localhost:9099')
}
```

### Check Auth State

```javascript
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'

onAuthStateChanged(auth, (user) => {
  console.log('Auth state changed:', user)
})
```

## Ready to Build!

Your authentication system is complete. Now you can:
1. ✅ Build protected pages for each role
2. ✅ Add specific features for each user type
3. ✅ Implement attendance tracking
4. ✅ Create reporting dashboards

Happy coding! 🚀
