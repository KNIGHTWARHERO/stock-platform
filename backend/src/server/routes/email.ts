import express from "express";
import { sendWelcome } from "../../lib/email"; // your existing email function

const router = express.Router();

// POST /send-welcome
router.post("/", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, error: "Email is required" });
  }

  try {
    await sendWelcome(email); // call your email function
    res.json({ success: true, message: "Welcome email sent successfully" });
  } catch (err) {
    console.error("❌ Failed to send welcome email:", err);
    res.status(500).json({ success: false, error: "Failed to send email" });
  }
});

export default router;
