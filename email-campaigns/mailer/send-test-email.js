// send-test-email.js
// Week 3 Goal: Send a Hello World email using SendGrid
// This file should:
// - Load env vars
// - Initialize SendGrid
// - Send a single test email
// - Log success or error
import 'dotenv/config'; // Modern way to load .env
import axios from 'axios'; // Modern way to load libraries

// The rest of your code stays the same!
async function triggerCrm(leadId) {
    const url = process.env.CRM_WEBHOOK_URL; 

    try {
        console.log(`📡 Sending CRM trigger for: ${leadId}`);
        const res = await axios.post(url, { lead_id: leadId });
        console.log("✅ Success:", res.data);
    } catch (err) {
        console.error("❌ Status: Waiting for production Webhook URL.");
    }
}

triggerCrm("test-alex-123");