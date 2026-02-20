import nodemailer from "nodemailer";

// ✅ Create a reusable transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST,
  port: Number(process.env.EMAIL_SERVER_PORT || 587),
  secure: Number(process.env.EMAIL_SERVER_PORT) === 465, // true if using port 465
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
});

/**
 * ✅ General sendEmail function
 */
export async function sendEmail({
  to,
  subject,
  text,
  html,
}: {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}) {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      text,
      html,
    });

    console.log(`📧 Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error("❌ Failed to send email:", err);
    throw new Error("Email delivery failed");
  }
}

/**
 * ✅ Specialized helper: Send welcome email
 */
export async function sendWelcome(email: string) {
  return sendEmail({
    to: email,
    subject: "Welcome to StockSphere 🎉",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111;">
        <h2 style="color:#2563eb;">Welcome to StockSphere 🚀</h2>
        <p>Hi there 👋,</p>
        <p>Thank you for registering with us. We’re excited to have you onboard!</p>
        <br/>
        <p style="font-size: 0.9em; color: gray;">
          This is an automated email, please do not reply.
        </p>
      </div>
    `,
  });
}
