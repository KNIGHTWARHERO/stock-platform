import twilio from "twilio";
const sid = process.env.TWILIO_ACCOUNT_SID!;
const token = process.env.TWILIO_AUTH_TOKEN!;
const from = process.env.TWILIO_FROM!;
export const sms = twilio(sid, token);

export async function sendOtpSms(phone: string, code: string) {
  await sms.messages.create({
    to: phone,
    from,
    body: `Your StockSphere OTP is ${code}. It expires in 5 minutes.`,
  });
}
