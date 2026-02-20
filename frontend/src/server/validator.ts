import { z } from "zod";

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const KycDraftSchema = z.object({
  fullName: z.string(),
  dateOfBirth: z.string(),
  address: z.string(),
});

export const RequestOtpSchema = z.object({
  phone: z.string(),
});

export const VerifyOtpSchema = z.object({
  phone: z.string(),
  code: z.string(),
});