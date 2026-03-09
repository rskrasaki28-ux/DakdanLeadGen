# Week 4 – Eva Lead Scoring Test Plan (Rutuja)

## 100-Point Scoring Framework (Conceptual)

Score bands:
- High value: 70–100
- Medium value: 40–69
- Low value: 0–39

Factors and typical ranges:
- Industry fit: 0–30 points
  - Ideal (sports, trucking): +25–30
  - Neutral (smallbusiness, government, zoo): +5–20

- Job title / seniority: 0–25 points
  - C-level / VP / Director: +20–25
  - Manager / Lead: +10–15
  - Individual contributor / generic: +0–5

- Source / intent: 0–25 points
  - Demo request / inbound form / referral: +20–25
  - Webinar / RFP / content download: +10–20
  - Scraped / cold / unknown: +0–10

- Company size / ICP fit: 0–20 points
  - Enterprise / upper mid-market: +15–20
  - Small / micro: +5–10
  - Unknown: +0–5

  ## Validation Criteria

For each test lead:
- Eva's numeric score should fall within [expectedMin, expectedMax] when possible.
- At minimum, the score must fall within the expected band thresholds:
  - High: 70–100
  - Medium: 40–69
  - Low: 0–39

Initial success criteria:
- ≥ 80–90% of test leads fall into the correct High/Medium/Low band.
- Edge cases behave as specified in notes (e.g., high-fit but low-intent leads do not max at 100).
