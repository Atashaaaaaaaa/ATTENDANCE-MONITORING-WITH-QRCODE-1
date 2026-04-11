/**
 * POST /api/auth/logout
 * Logout endpoint (mainly for client-side use with auth context)
 */
export async function POST(request) {
  try {
    return new Response(
      JSON.stringify({
        message: 'Logout successful',
      }),
      { status: 200 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || 'Error during logout' }),
      { status: 500 }
    )
  }
}
