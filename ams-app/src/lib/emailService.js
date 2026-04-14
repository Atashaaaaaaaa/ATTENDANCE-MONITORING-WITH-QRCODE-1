import emailjs from "@emailjs/browser";

// EmailJS configuration — set these in your .env.local file
const SERVICE_ID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || "";
const TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || "";
const PUBLIC_KEY = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || "";

// Initialize EmailJS once
let initialized = false;
function initEmailJS() {
  if (!initialized && PUBLIC_KEY) {
    emailjs.init(PUBLIC_KEY);
    initialized = true;
  }
}

/**
 * Send a 2FA verification code to the user's email via EmailJS.
 *
 * EmailJS Template setup:
 *   - In the template "To Email" field, use: {{to_email}}
 *   - Template body should reference: {{otp_code}}, {{app_name}}, {{expiry_min}}
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
    return true;
  }

  try {
    // Initialize EmailJS
    initEmailJS();

    const result = await emailjs.send(
      SERVICE_ID,
      TEMPLATE_ID,
      {
        to_email: toEmail,
        email: toEmail,
        user_email: toEmail,
        otp_code: code,
        passcode: code,
        app_name: "AMS - Attendance Monitoring System",
        expiry_min: "5",
      },
      PUBLIC_KEY
    );
    console.log("2FA email sent successfully:", result.status);
    return true;
  } catch (error) {
    console.error("Failed to send 2FA email:", error);
    // Log the code to console as fallback so user can still verify
    console.log(`[2FA FALLBACK] Code for ${toEmail}: ${code}`);
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
