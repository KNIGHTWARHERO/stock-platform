import express from "express";
import emailRoutes from "./routes/email";

const app = express();

app.use(express.json());

// Register the email route
app.use("/send-welcome", emailRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
