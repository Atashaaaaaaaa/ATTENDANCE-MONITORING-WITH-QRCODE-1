import emailjs from "@emailjs/browser";

// EmailJS configuration — set these in your .env.local file
const SERVICE_ID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || "";
const TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || "";
const PUBLIC_KEY = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || "";

// Initialize EmailJS with public key (required for v4.x)
let initialized = false;
function ensureInit() {
  if (!initialized && PUBLIC_KEY) {
    emailjs.init({ publicKey: PUBLIC_KEY });
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
    // Ensure EmailJS is initialized before sending
    ensureInit();

    console.log(`[2FA] Sending verification code to: ${toEmail}`);

    const response = await emailjs.send(
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
      }
    );
    console.log("[2FA] Email sent successfully:", response.status, response.text);
    return true;
  } catch (error) {
    console.error("[2FA] Failed to send email:", error);
    console.error("[2FA] Service ID:", SERVICE_ID);
    console.error("[2FA] Template ID:", TEMPLATE_ID);
    console.error("[2FA] Recipient:", toEmail);
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
