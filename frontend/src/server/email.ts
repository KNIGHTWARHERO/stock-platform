import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendSigninNotice(email: string) {
  await resend.emails.send({
    from: "no-reply@yourdomain.com",
    to: email,
    subject: "New sign-in detected",
    text: "A new sign-in to your account was detected.",
  });
}