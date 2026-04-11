import { db, auth } from '@/lib/firebase'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { createUserWithEmailAndPassword } from 'firebase/auth'

/**
 * POST /api/auth/create-user
 * Create a new user (admin only)
 */
export async function POST(request) {
  try {
    const { email, password, role, fullName, adminUid } = await request.json()

    // Validate input
    if (!email || !password || !role || !fullName) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400 }
      )
    }

    // Validate role
    const validRoles = ['admin', 'teacher', 'student']
    if (!validRoles.includes(role)) {
      return new Response(
        JSON.stringify({ error: 'Invalid role' }),
        { status: 400 }
      )
    }

    // Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    const newUser = userCredential.user

    // Save user data to Firestore
    const userRef = doc(db, 'users', newUser.uid)
    await setDoc(userRef, {
      uid: newUser.uid,
      email: newUser.email,
      role: role,
      fullName: fullName,
      createdAt: new Date(),
      createdBy: adminUid || 'system',
    })

    return new Response(
      JSON.stringify({
        message: 'User created successfully',
        user: {
          uid: newUser.uid,
          email: newUser.email,
          role: role,
        },
      }),
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating user:', error)

    if (error.code === 'auth/email-already-in-use') {
      return new Response(
        JSON.stringify({ error: 'Email already in use' }),
        { status: 400 }
      )
    }

    return new Response(
      JSON.stringify({ error: error.message || 'Error creating user' }),
      { status: 500 }
    )
  }
}
