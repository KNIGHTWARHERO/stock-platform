import { z } from "zod";

export const RegisterSchema = z.object({
  name: z.string().min(2).max(64),
  email: z.string().email(),
  password: z.string().min(8).max(64),
  phone: z.string().min(8).max(16)
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export const RequestOtpSchema = z.object({
  phone: z.string().min(8).max(16),
  purpose: z.enum(["phone_signup", "phone_2fa"])
});

export const VerifyOtpSchema = z.object({
  phone: z.string().min(8).max(16),
  code: z.string().regex(/^\d{6}$/),
  purpose: z.enum(["phone_signup", "phone_2fa"])
});

export const KycDraftSchema = z.object({
  panNumber: z.string().regex(/[A-Z]{5}\d{4}[A-Z]{1}/, "Invalid PAN"),
  aadhaarLast4: z.string().regex(/^\d{4}$/, "Aadhaar last 4"),
  fullName: z.string().min(2),
  dob: z.string(), // YYYY-MM-DD
  addressLine1: z.string().min(3),
  addressLine2: z.string().optional(),
  city: z.string().min(2),
  state: z.string().min(2),
  pincode: z.string().regex(/^\d{6}$/)
});
