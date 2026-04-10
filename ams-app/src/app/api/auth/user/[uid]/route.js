import { db } from '@/lib/firebase'
import { doc, getDoc } from 'firebase/firestore'

/**
 * GET /api/auth/user/[uid]
 * Get user data from Firestore
 */
export async function GET(request, { params }) {
  try {
    const { uid } = params

    if (!uid) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400 }
      )
    }

    const userDocRef = doc(db, 'users', uid)
    const userDocSnap = await getDoc(userDocRef)

    if (!userDocSnap.exists()) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404 }
      )
    }

    return new Response(
      JSON.stringify({
        message: 'User data retrieved successfully',
        user: userDocSnap.data(),
      }),
      { status: 200 }
    )
  } catch (error) {
    console.error('Error fetching user:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Error fetching user' }),
      { status: 500 }
    )
  }
}
