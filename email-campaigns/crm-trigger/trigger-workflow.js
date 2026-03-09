/**
 * trigger-workflow.js
 *
 * Purpose:
 * This script triggers the GoHighLevel (CRM) nurture workflow
 * built by Collin by sending a JSON payload to a webhook or API endpoint.
 *
 * Week 3 Goal ("Hello World" v2):
 * - Send a minimal payload (e.g. { email: "juan@test.com" })
 * - CRM workflow handles email/SMS/calls
 * - Successful trigger results in an email landing in Juan’s inbox
 *
 * Responsibilities of this script:
 * 1. Load required environment variables (URL, API key, test email)
 * 2. Validate that required env vars exist and fail cleanly if not
 * 3. Construct the JSON payload expected by the CRM workflow
 * 4. Send an HTTP POST request to the CRM trigger endpoint
 * 5. Log success or error responses clearly for debugging/demo purposes
 *
 * Notes:
 * - This script should NOT send emails directly
 * - This script should NOT contain any business logic
 * - This script should NOT store credentials in code
 * - Email/SMS logic lives entirely in the CRM / n8n workflow
 *
 * Next steps:
* - Implement the POST request using the agreed payload schema
 * - Wait for Collin to provide the webhook/API contract
 */

import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables from .env
dotenv.config();

/**
 * Triggers the CRM workflow by sending a POST request to n8n.
 * @param {string} leadId - The UUID of the lead to be processed.
 */
export async function triggerCrmWorkflow(leadId) {
    // Uses the .env variable, falling back to Miguel's production URL if missing
    const url = process.env.CRM_TRIGGER_URL || 'https://dakdan.app.n8n.cloud/webhook/68dcb2c2-04bc-4faf-ae3c-09d9c46ca1bd';

    try {
        const response = await axios.post(url, {
            lead_id: leadId
        });

        console.log(`✅ CRM Triggered Successfully!`);
        console.log(`Lead ID: ${leadId}`);
        console.log(`Status: ${response.status} - ${response.statusText}`);
        
    } catch (error) {
        // This catch block handled the 404 error in your last test
        console.error(`❌ Failed to trigger CRM for lead ${leadId}:`);
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error(error.response.data);
        } else {
            console.error(error.message);
        }
    }
}