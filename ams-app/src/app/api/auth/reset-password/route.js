import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";
/**
 * POST /api/auth/reset-password
 * Reset a user's password using Firebase Admin SDK.
 * Generates a new random password and updates it in Firebase Auth.
 */
export async function POST(request) {
  try {
    const { uid, newPassword } = await request.json();

    if (!uid || !newPassword) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: uid and newPassword" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate password length
    if (newPassword.length < 6) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 6 characters" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Update the user's password using Firebase Admin SDK
    await adminAuth.updateUser(uid, {
      password: newPassword,
    });

    // Enforce password change upon next login
    await adminDb.collection("users").doc(uid).update({
      forcePasswordChange: true,
    });

    return new Response(
      JSON.stringify({ message: "Password updated successfully" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error resetting password:", error);

    if (error.code === "auth/user-not-found") {
      return new Response(
        JSON.stringify({ error: "User not found in Firebase Auth" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: error.message || "Failed to reset password" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
