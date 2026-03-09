import express from "express";
import cors from "cors";
import leadsRouter from "./leads.js"; // Import leads router

// Initialize Express app and middleware
const app = express();
app.use(cors());
app.use(express.json());

// Mount routes
app.use("/api/leads", leadsRouter);

const PORT = process.env.PORT || 4000; // Use environment variable or default to 4000
app.listen(PORT, () => {
  console.log(`Backend Bridge running on port ${PORT}`);
});