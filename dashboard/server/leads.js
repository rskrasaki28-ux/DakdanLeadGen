import express from "express";
// Import the function to fetch leads change if file changes locations
import { fetchLeads } from "./ghlClient.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const leads = await fetchLeads();
    res.json({ success: true, leads });
  } catch (err) {
    console.error("Error fetching leads:", err.message);
    res.status(500).json({ success: false, error: "Failed to fetch leads" });
  }
});

export default router;