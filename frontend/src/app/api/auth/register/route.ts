import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { Resend } from "resend";

// --------------------
// 1. Validation Schema
// --------------------
const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters long"),
  phone: z
    .string()
    .regex(/^[0-9]{10}$/, "Phone number must be exactly 10 digits"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
});

type RegisterRequest = z.infer<typeof registerSchema>;

// --------------------
// 2. Resend Setup
// --------------------
const resend = new Resend(process.env.RESEND_API_KEY);

// --------------------
// 3. Temporary Database (Replace with real DB)
// --------------------
const users: Array<RegisterRequest & { id: string; hashedPassword: string }> = [];

// --------------------
// 4. Email Templates
// --------------------
const getWelcomeEmailHtml = (username: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Our Platform</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f4f4f4;
      margin: 0;
      padding: 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      padding: 30px;
      border-radius: 10px;
      box-shadow: 0 0 20px rgba(0,0,0,0.1);
    }
    .header { text-align: center; padding-bottom: 20px; border-bottom: 3px solid #4F46E5; }
    .header h1 { color: #4F46E5; margin: 0; font-size: 28px; }
    .welcome-text { font-size: 18px; color: #555; }
    .highlight {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 15px;
      border-radius: 5px;
      margin: 20px 0;
    }
    .footer { text-align: center; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #888; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Welcome to Our Platform!</h1>
    </div>
    <p class="welcome-text">Hi <strong>${username}</strong>,</p>
    <p>Thank you for joining our platform! Your account has been successfully created.</p>
    <div class="highlight">
      <p style="margin:0;font-weight:bold;">🚀 You're all set to get started!</p>
      <p style="margin:5px 0 0 0;">You can now log in and explore all our features.</p>
    </div>
    <p>If you have any questions, reach out to our support team.</p>
    <p style="margin-top:30px;">Best regards,<br><strong>The Team</strong></p>
    <div class="footer">
      <p>This email was sent because you created an account with us. If you didn't, please contact support.</p>
    </div>
  </div>
</body>
</html>
`;

const getWelcomeEmailText = (username: string) => `
Welcome to Our Platform!

Hi ${username},

Thank you for joining our platform! Your account has been successfully created.

🚀 You're all set to get started — log in and explore all our features.

Best regards,
The Team
`;

// --------------------
// 5. POST Handler
// --------------------
export async function POST(request: NextRequest) {
  try {
    const body: RegisterRequest = await request.json();

    // Validate request body
    const validation = registerSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { message: "Validation failed", errors: validation.error.format() },
        { status: 400 }
      );
    }

    const { username, phone, email, password } = validation.data;

    // Check if user already exists
    const existingUser = users.find(
      (user) =>
        user.username.toLowerCase() === username.toLowerCase() ||
        user.email.toLowerCase() === email.toLowerCase() ||
        user.phone === phone
    );

    if (existingUser) {
      let conflictField = "account";
      if (existingUser.username.toLowerCase() === username.toLowerCase())
        conflictField = "username";
      else if (existingUser.email.toLowerCase() === email.toLowerCase())
        conflictField = "email";
      else if (existingUser.phone === phone) conflictField = "phone number";

      return NextResponse.json(
        { message: `An account with this ${conflictField} already exists` },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user (mock)
    const newUser = {
      id: Date.now().toString(),
      username,
      phone,
      email: email.toLowerCase(),
      hashedPassword,
    };

    users.push(newUser);

    // --------------------
    // Send Welcome Email
    // --------------------
    try {
      const sender =
        process.env.FROM_EMAIL && process.env.FROM_EMAIL.trim() !== ""
          ? process.env.FROM_EMAIL
          : "onboarding@resend.dev"; // fallback to sandbox

      const emailResponse = await resend.emails.send({
        from: sender,
        to: email,
        subject: "🎉 Welcome to Our Platform!",
        html: getWelcomeEmailHtml(username),
        text: getWelcomeEmailText(username),
      });

      console.log("📧 Resend response:", emailResponse);

      if (emailResponse.error) {
        console.error("❌ Failed to send welcome email:", emailResponse.error);
      } else {
        console.log(`✅ Welcome email successfully sent to ${email}`);
      }
    } catch (emailError) {
      console.error("🔥 Unexpected error sending email:", emailError);
    }

    return NextResponse.json(
      {
        message: "Account created successfully",
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          phone: newUser.phone,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { message: "Invalid JSON format" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "Internal server error. Please try again later." },
      { status: 500 }
    );
  }
}

// --------------------
// 6. Optional: Method Guards
// --------------------
export async function GET() {
  return NextResponse.json({ message: "Method not allowed" }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ message: "Method not allowed" }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ message: "Method not allowed" }, { status: 405 });
}
