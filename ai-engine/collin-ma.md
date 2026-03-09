# AI/ML Core Logic – Lead Scoring

**Owner:** Collin Ma

## Responsibilities
* Design and implement the lead scoring logic on a 0–100 scale.
* Implement live lead scoring using the OpenAI API.
* Ensure a strict JSON output format containing score and reasoning.
* Own and maintain the core AI scoring behavior.
* Collaborate with reviewers to refine and improve scoring logic.

## Inputs
* Cleaned and structured lead JSON from the data team.
* Requirements and feedback from team lead and stakeholders.
* Test lead examples and edge cases.

## Outputs
* Lead scores (0–100) with reasoning in strict JSON format.
* Updated and versioned `score_lead.py` implementation.
* Documentation on scoring behavior and JSON schema.

## Daily Tasks
* Iterate on `score_lead.py` and scoring prompts.
* Run tests on new and existing leads to validate scoring.
* Review feedback from refinement/quality reviewers and adjust logic.

## Week 3 Goals
* Implement Supabase database integration for reading unscored leads.
* Add functionality to query leads table `WHERE lead_score = 0`.
* Implement database write operation to update `lead_score` after scoring.
* Create complete end-to-end loop: Read → Score → Update.

    
