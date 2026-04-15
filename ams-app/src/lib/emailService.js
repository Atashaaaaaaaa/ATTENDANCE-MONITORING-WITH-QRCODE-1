/**
 * Send a 2FA verification code to the user's email via the internal API.
 *
 * @param {string} toEmail - The recipient email address
 * @param {string} code - The 6-digit OTP code
 * @returns {Promise<boolean>} - true if sent successfully
 */
export async function send2FACode(toEmail, code) {
  try {
    console.log(`[2FA] Requesting verification code send to: ${toEmail}`);

    const response = await fetch('/api/auth/send-2fa', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ toEmail, code }),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      console.log("[2FA] Email sent successfully.");
      if (data.previewUrl) {
        console.log("=========================================");
        console.log("[2FA DEV MODE] Preview email at:");
        console.log(data.previewUrl);
        console.log("=========================================");
      }
      return true;
    } else {
      console.error("[2FA] API returned error:", data.error);
      return false;
    }
  } catch (error) {
    console.error("[2FA] Network error calling send-2fa API:", error);
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
  // Fallback for non-browser environments or older browsers
  return Math.floor(100000 + Math.random() * 900000).toString();
}
