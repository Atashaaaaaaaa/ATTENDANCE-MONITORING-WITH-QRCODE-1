import { adminAuth, adminDb } from '@/lib/firebaseAdmin'

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/create-user
 * Create a new user (admin only)
 */
export async function POST(request) {
  try {
    const { email, password, role, fullName, section, department, adminUid } = await request.json()

    // Validate input
    if (!email || !password || !role || !fullName) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400 }
      )
    }

    // Validate role
    const validRoles = ['admin', 'teacher', 'student']
    if (!validRoles.includes(role.toLowerCase())) {
      return new Response(
        JSON.stringify({ error: 'Invalid role' }),
        { status: 400 }
      )
    }

    // Create user in Firebase Auth using Admin SDK
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: fullName,
    })
    
    // Set custom claims for role-based access if needed later
    // await adminAuth.setCustomUserClaims(userRecord.uid, { role: role.toLowerCase() });

    // Save user data to Firestore using Admin SDK
    await adminDb.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: userRecord.email,
      role: role,
      fullName: fullName,
      section: section || '',
      department: department || '',
      status: 'active',
      forcePasswordChange: true, // Force user to change password on first login
      createdAt: new Date(),
      createdBy: adminUid || 'system',
    })

    return new Response(
      JSON.stringify({
        message: 'User created successfully',
        user: {
          uid: userRecord.uid,
          email: userRecord.email,
          role: role,
          fullName: fullName,
          section: section || '',
          department: department || '',
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
