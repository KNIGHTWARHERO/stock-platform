import crypto from "crypto";

const key = Buffer.from(process.env.ENCRYPTION_KEY_BASE64 || "", "base64");
if (key.length !== 32) {
  throw new Error("ENCRYPTION_KEY_BASE64 must be 32 bytes base64");
}

export function encrypt(text: string) {
  const iv = crypto.randomBytes(12); // AES-GCM 96-bit IV
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64"); // [IV|TAG|CIPHERTEXT]
}

export function decrypt(payload: string) {
  const buf = Buffer.from(payload, "base64");
  const iv = buf.slice(0, 12);
  const tag = buf.slice(12, 28);
  const data = buf.slice(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(data), decipher.final()]);
  return dec.toString("utf8");
}
