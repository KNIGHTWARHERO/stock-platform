export async function sendOtpSms(phone: string, code: string) {
  // plug in Twilio or any SMS provider here
  console.log(`OTP ${code} → ${phone}`);
}