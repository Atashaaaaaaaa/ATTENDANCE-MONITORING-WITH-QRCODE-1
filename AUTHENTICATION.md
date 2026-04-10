# Authentication System Documentation

## Overview

The AMS (Attendance Monitoring System) backend now includes a comprehensive authentication system using Firebase Authentication and Firestore. This supports three user roles: **Admin**, **Teacher**, and **Student**.

## Features

- ✅ Firebase Authentication (Email/Password)
- ✅ Firestore User Database
- ✅ Role-Based Access Control (RBAC)
- ✅ Protected Routes
- ✅ Session Management
- ✅ User Registration with Role Selection
- ✅ User Sign-In with Dashboard Routing

## Architecture

### Components

#### 1. **AuthContext** (`/src/context/AuthContext.js`)
Global authentication context that manages:
- User state
- User role
- Loading state
- Sign up, sign in, and logout functions
- Firestore integration

**Usage:**
```javascript
import { useAuth } from '@/context/AuthContext'

// In your component
const { user, userRole, loading, signUp, signIn, logout } = useAuth()
```

#### 2. **Role Selection Page** (`/src/app/role-select`)
Users first select their role:
- Admin
- Teacher
- Student

Selected role is stored in session storage and passed to sign-up.

#### 3. **Sign Up Page** (`/src/app/signup`)
User registration with:
- Role pre-selection
- Email validation
- Password requirements (minimum 6 characters)
- Form validation
- Automatic Firestore user document creation

#### 4. **Sign In Page** (`/src/app/login`)
User login with:
- Email/Password authentication
- Error handling
- Auto-redirect to dashboard after login

#### 5. **Protected Routes** (`/src/components/ProtectedRoute.js`)
HOC and hook for route protection:
```javascript
// Using HOC
export default withProtectedRoute(MyComponent, 'admin')

// Using hook
const { isAuthorized, userRole } = useRouteGuard('teacher')
```

### Database Schema (Firestore)

**Users Collection:**
```
/users
  /{uid}
    - uid: string
    - email: string
    - role: 'admin' | 'teacher' | 'student'
    - fullName: string
    - createdAt: timestamp
    - [additional fields can be added]
```

## API Routes

### 1. Create User (Admin Function)
**Endpoint:** `POST /api/auth/create-user`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "role": "student",
  "fullName": "John Doe",
  "adminUid": "admin-uid"
}
```

**Response:**
```json
{
  "message": "User created successfully",
  "user": {
    "uid": "user-id",
    "email": "user@example.com",
    "role": "student"
  }
}
```

### 2. Get User Data
**Endpoint:** `GET /api/auth/user/[uid]`

**Response:**
```json
{
  "message": "User data retrieved successfully",
  "user": {
    "uid": "user-id",
    "email": "user@example.com",
    "role": "student",
    "fullName": "John Doe",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

### 3. Logout
**Endpoint:** `POST /api/auth/logout`

## Authentication Flow

### Sign Up Flow
```
1. User visits "/" (landing page)
2. Clicks "Get Started"
3. Redirected to "/role-select"
4. Selects their role
5. Redirected to "/signup"
6. Fills in registration form
7. Account created in Firebase Auth + Firestore
8. Auto-redirect to role-specific dashboard
```

### Sign In Flow
```
1. User visits "/login"
2. Enters email & password
3. Firebase authenticates user
4. User role fetched from Firestore
5. Auto-redirect to role-specific dashboard:
   - Admin → /admin/overview
   - Teacher → /teacher/dashboard
   - Student → /student/attendance
```

### Protected Route Flow
```
1. User accesses protected page
2. Route guard checks authentication
3. If not authenticated: redirect to login
4. If authenticated but unauthorized: redirect to login
5. If authorized: render component
```

## Utility Functions

### `authUtils.js` - Reusable Functions

- **`getUserRole(uid)`** - Fetch user role from Firestore
- **`getUserData(uid)`** - Fetch complete user data
- **`getDashboardPath(role)`** - Get dashboard path by role
- **`hasRole(userRole, requiredRole)`** - Check if user has required role

## Setting Up Protected Pages

### Example: Admin Dashboard

```javascript
'use client'

import { useRouteGuard } from '@/components/ProtectedRoute'

export default function AdminDashboard() {
  const { isAuthorized, loading } = useRouteGuard('admin')

  if (loading) return <div>Loading...</div>
  if (!isAuthorized) return null

  return <h1>Admin Dashboard</h1>
}
```

## Environment Variables

Make sure you have Firebase configuration in `src/lib/firebase.js`:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
}
```

## User Roles & Permissions

| Role | Dashboard Path | Permissions |
|------|---|---|
| Admin | `/admin/overview` | Manage users, system settings, view all reports |
| Teacher | `/teacher/dashboard` | Mark attendance, view reports, manage classes |
| Student | `/student/attendance` | View own attendance, check schedule |

## Error Handling

### Common Errors

1. **"Email is required"** - User didn't enter email
2. **"Password must be at least 6 characters"** - Password too short
3. **"Passwords do not match"** - Confirmation password doesn't match
4. **"Email already in use"** - Account already exists
5. **"Invalid email or password"** - Wrong credentials

## Session Management

- Session is managed by Firebase Auth SDK
- Token automatically refreshes
- Auth state persists across page refreshes
- User can sign out using `logout()` function

## Technologies Used

- **Firebase Authentication** - User authentication
- **Firestore** - User data storage
- **Next.js 16.2** - Framework
- **React 19.2** - UI library
- **React Context API** - State management

## Next Steps

1. ✅ Implement protected routes for each dashboard
2. ✅ Create role-specific components
3. ✅ Set up Firestore security rules
4. ✅ Implement password reset functionality
5. ✅ Add email verification
6. ✅ Set up user profile editing

## Firestore Security Rules (Recommended)

```yaml
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read, write: if request.auth.uid == uid;
      allow read: if request.auth.token.role == 'admin';
    }
  }
}
```

## Testing

### Test Credentials

You can test the authentication flow by:

1. Creating new accounts with the sign-up form
2. Logging in with your credentials
3. Verifying role-based redirects work correctly

### Quick Test Flow

```
1. Go to localhost:3000
2. Click "Get Started"
3. Select "Student"
4. Fill in form with test data
5. Submit
6. Should redirect to /student/attendance
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "No such document" error | Check if user was created in Firestore |
| Auth state not persisting | Clear browser cache and try again |
| Role not found | Verify user document in Firestore has `role` field |
| Can't sign up | Check Firebase quota and email format |

## Support

For issues or questions about the authentication system, refer to:
- Firebase Documentation: https://firebase.google.com/docs/auth
- Firestore Documentation: https://firebase.google.com/docs/firestore
- Next.js Documentation: https://nextjs.org/docs
