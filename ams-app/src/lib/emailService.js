import emailjs from "@emailjs/browser";

// EmailJS configuration — set these in your .env.local file
const SERVICE_ID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || "";
const TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || "";
const PUBLIC_KEY = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || "";

// Initialize EmailJS with public key
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
    console.error(
      "❌ EMAILJS IS NOT CONFIGURED! ❌\n" +
      "To send actual emails (without needing Firebase's paid Blaze plan), create a free account at https://www.emailjs.com/ and configure:\n" +
      "- NEXT_PUBLIC_EMAILJS_SERVICE_ID\n" +
      "- NEXT_PUBLIC_EMAILJS_TEMPLATE_ID\n" +
      "- NEXT_PUBLIC_EMAILJS_PUBLIC_KEY\n" +
      "inside your .env.local file."
    );
    // Optionally display an alert so the developer realizes dev-mode is active
    if (typeof window !== "undefined") {
      console.log(`%c[2FA DEV MODE] Use this code to login: ${code}`, "color: #4A7C59; font-size: 16px; font-weight: bold;");
    }
    return true; // Return true so log-in proceeds and the code can be found in console
  }

  try {
    ensureInit();
    console.log(`[2FA] Sending verification code to: ${toEmail}`);

    const response = await emailjs.send(
      SERVICE_ID,
      TEMPLATE_ID,
      {
        to_email: toEmail,
        otp_code: code,
        passcode: code,
        app_name: "AMS - Attendance Monitoring System",
        expiry_min: "5",
      }
    );
    console.log("[2FA] Email sent successfully via EmailJS:", response.status, response.text);
    return true;
  } catch (error) {
    console.error("[2FA] Failed to send email via EmailJS:", error);
    return false;
  }
}

/**
 * Generate a random 6-digit numeric OTP code
 * @returns {string} - 6-digit code
 */
export function generate6DigitCode() {
  if (typeof window !== "undefined" && window.crypto) {
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    return (100000 + (array[0] % 900000)).toString();
  }
  return Math.floor(100000 + Math.random() * 900000).toString();
}
