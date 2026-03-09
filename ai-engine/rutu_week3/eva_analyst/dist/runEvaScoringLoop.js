"use strict";
//  The Goal for this week:
// Define and validate the dummy Lead JSON structure to match PRD Section 4.1.1
// Action: Ensure dummy lead + Supabase lead structure matches PRD Section 4.1.1
// Confirm required fields and industry enum values are correct
// Validate that Eva’s output (score, reasoning) fits cleanly into DB fields
// Deliver: Final approved Lead JSON structure
// Notes on required vs optional fields
Object.defineProperty(exports, "__esModule", { value: true });
const getUnscoredLead_1 = require("./getUnscoredLead");
const scoreLeadWithGPT_1 = require("./scoreLeadWithGPT");
const updateLeadScore_1 = require("./updateLeadScore");
async function runEvaScoringLoop() {
    try {
        const lead = await (0, getUnscoredLead_1.getUnscoredLead)();
        if (!lead) {
            console.log('No leads with lead_score = 0 found.');
            return;
        }
        console.log('Fetched lead id:', lead.id);
        const score = await (0, scoreLeadWithGPT_1.scoreLeadWithGPT)(lead);
        console.log('Generated score:', score);
        const updated = await (0, updateLeadScore_1.updateLeadScore)(lead.id, score);
        console.log('Updated lead:', { id: updated.id, lead_score: updated.lead_score });
    }
    catch (err) {
        console.error('Eva scoring loop failed:', err);
    }
}
runEvaScoringLoop();
