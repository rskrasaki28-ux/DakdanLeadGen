//  The Goal for this week:
// Define and validate the dummy Lead JSON structure to match PRD Section 4.1.1
// Action: Ensure dummy lead + Supabase lead structure matches PRD Section 4.1.1
// Confirm required fields and industry enum values are correct
// Validate that Eva’s output (score, reasoning) fits cleanly into DB fields
// Deliver: Final approved Lead JSON structure
// Notes on required vs optional fields


import { getUnscoredLead } from './getUnscoredLead';
import { scoreLeadWithGPT } from './scoreLeadWithGPT';
import { updateLeadScore } from './updateLeadScore';

async function runEvaScoringLoop() {
  try {
    const lead = await getUnscoredLead();
    if (!lead) {
      console.log('No leads with lead_score = 0 found.');
      return;
    }
    console.log('Fetched lead id:', lead.id);

    const score = await scoreLeadWithGPT(lead);
    console.log('Generated score:', score);

    const updated = await updateLeadScore(lead.id, score);
    console.log('Updated lead:', { id: updated.id, lead_score: updated.lead_score });
  } catch (err) {
    console.error('Eva scoring loop failed:', err);
  }
}

runEvaScoringLoop();
