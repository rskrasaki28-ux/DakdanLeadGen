import { triggerCrmWorkflow } from './email-campaigns/crm-trigger/trigger-workflow.js';

// Test UUID
const testLeadId = "test-uuid-12345";

console.log("🚀 Starting end-to-end test...");
triggerCrmWorkflow(testLeadId);