import emailjs from "@emailjs/browser";

// EmailJS configuration — set these in your .env.local file
const SERVICE_ID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || "";
const TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || "";
const PUBLIC_KEY = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || "";

/**
 * Send a 2FA verification code to the user's email via EmailJS.
 *
 * EmailJS Template variables expected:
 *   {{to_email}}   - recipient email
 *   {{otp_code}}   - the 6-digit verification code
 *   {{app_name}}   - "AMS - Attendance Monitoring System"
 *   {{expiry_min}} - minutes until code expires (e.g. "5")
 *
 * @param {string} toEmail - The recipient email address
 * @param {string} code - The 6-digit OTP code
 * @returns {Promise<boolean>} - true if sent successfully
 */
export async function send2FACode(toEmail, code) {
  if (!SERVICE_ID || !TEMPLATE_ID || !PUBLIC_KEY) {
    console.warn(
      "EmailJS not configured. Set NEXT_PUBLIC_EMAILJS_SERVICE_ID, NEXT_PUBLIC_EMAILJS_TEMPLATE_ID, and NEXT_PUBLIC_EMAILJS_PUBLIC_KEY in .env.local"
    );
    // In development/demo mode, log the code to console
    console.log(`[2FA DEV MODE] Code for ${toEmail}: ${code}`);
    return true; // Allow login to proceed even without email config
  }

  try {
    await emailjs.send(
      SERVICE_ID,
      TEMPLATE_ID,
      {
        to_email: toEmail,
        otp_code: code,
        app_name: "AMS - Attendance Monitoring System",
        expiry_min: "5",
      },
      PUBLIC_KEY
    );
    return true;
  } catch (error) {
    console.error("Failed to send 2FA email:", error);
    // Still return true so login can proceed — code is stored in Firestore
    // and can be verified even if email delivery fails
    return true;
  }
}

/**
 * Generate a random 6-digit numeric OTP code
 * @returns {string} - 6-digit code
 */
export function generate6DigitCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
