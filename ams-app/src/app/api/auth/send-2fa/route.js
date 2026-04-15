import nodemailer from 'nodemailer';

export async function POST(request) {
  try {
    const { toEmail, code } = await request.json();

    if (!toEmail || !code) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }

    let transporter;

    // Check if real SMTP credentials exist
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      transporter = nodemailer.createTransport({
        service: 'gmail', // Standard for most users, can be changed via env
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });
    } else {
      // Fallback to ethereal email for functional testing without credentials
      console.log("No SMTP credentials found in .env.local, using Ethereal test account...");
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    }

    const info = await transporter.sendMail({
      from: '"AMS System" <noreply@ams-system.com>',
      to: toEmail,
      subject: "Your Verification Code - AMS",
      text: `Your verification code is: ${code}. It expires in 5 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaec; border-radius: 10px;">
          <h2 style="color: #4A7C59; text-align: center;">Identity Verification</h2>
          <p>Please use the following code to verify your login for the Attendance Monitoring System:</p>
          <div style="background-color: #F0FDF4; padding: 15px; text-align: center; font-size: 28px; font-weight: bold; letter-spacing: 8px; color: #1A3A28; border-radius: 8px; margin: 20px 0;">
            ${code}
          </div>
          <p style="color: #666; font-size: 14px; text-align: center; margin-top: 20px;">This code will expire in 5 minutes.</p>
        </div>
      `,
    });

    console.log("[2FA] Message sent: %s", info.messageId);
    
    // Print the URL to terminal securely 
    let previewUrl = null;
    if (!process.env.EMAIL_USER) {
      previewUrl = nodemailer.getTestMessageUrl(info);
      console.log("\n========================================================");
      console.log("[2FA DEV MODE] Preview your verification email here:");
      console.log(previewUrl);
      console.log("========================================================\n");
    }

    return new Response(JSON.stringify({ 
      success: true, 
      previewUrl: previewUrl 
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    
  } catch (error) {
    console.error("[2FA] Error sending email:", error);
    return new Response(JSON.stringify({ error: "Failed to send email" }), { status: 500 });
  }
}
