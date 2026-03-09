import os
import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from openai import OpenAI
from supabase import create_client, Client

load_dotenv()

# ── Environment Variables ─────────────────────────────────────────────
SUPABASE_URL   = os.getenv("SUPABASE_URL")
SUPABASE_KEY   = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

if not all([SUPABASE_URL, SUPABASE_KEY, OPENAI_API_KEY]):
    raise RuntimeError(
        "Missing required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY"
    )

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
openai_client    = OpenAI(api_key=OPENAI_API_KEY)

# ── App ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="Dakdan AI Lead Scoring API",
    description="Scores leads from Supabase using GPT-4o. Used by the n8n/CRM webhook pipeline.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Core Scoring Logic (Collin Ma week3) ──────────────────────────────
def score_lead_with_openai(lead_data: dict) -> dict:
    """
    Sends a lead dict to GPT-4o and returns {score: int, reason: str}.
    Rubric mirrors score_lead_with_data_base(Collin Ma_week3).
    """
    prompt = f"""
You are a lead scoring system. Analyze the provided Lead JSON and assign a score
(0-100) using the rubric as guidance.

Scoring Rubric (Guide Only):
- Firmographic: Industry match, location, company size.
- Behavioral: Engagement metrics (if available).
- Engagement: Website or contact validity.

Lead JSON:
{json.dumps(lead_data)}

Output STRICT JSON only: {{"score": <int 0-100>, "reason": "<short string>"}}
"""
    completion = openai_client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "You output only valid JSON."},
            {"role": "user",   "content": prompt},
        ],
        temperature=0,
        response_format={"type": "json_object"},
    )
    return json.loads(completion.choices[0].message.content)


# ── Routes ────────────────────────────────────────────────────────────

@app.get("/health")
def health_check():
    """Health check endpoint for deployment monitoring."""
    return {"status": "ok", "service": "dakdan-ai-scoring"}


@app.post("/api/leads/{lead_id}/score")
def score_single_lead(lead_id: str):
    """
    Score a single lead by its Supabase UUID.

    - Fetches lead from Supabase
    - Sends to GPT-4o for scoring
    - Writes lead_score back to Supabase
    - Returns score + reason

    This is the endpoint Hamzah's n8n webhook should POST to.
    Payload required by n8n: POST /api/leads/{lead_id}/score
    Response: { lead_id, lead_score, reason, company }
    """
    # 1. Fetch lead from Supabase
    res = supabase.table("leads").select("*").eq("id", lead_id).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail=f"Lead '{lead_id}' not found in Supabase.")

    lead_data = res.data

    # 2. Score via OpenAI
    try:
        result      = score_lead_with_openai(lead_data)
        final_score = int(result.get("score", 0))
        reason      = result.get("reason", "No reason provided")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OpenAI scoring error: {e}")

    # 3. Write score back to Supabase
    supabase.table("leads").update({"lead_score": final_score}).eq("id", lead_id).execute()

    return {
        "lead_id":    lead_id,
        "lead_score": final_score,
        "reason":     reason,
        "company":    lead_data.get("company_name", "Unknown"),
    }


@app.post("/api/leads/score-batch")
def score_batch(limit: int = 10):
    """
    Score up to `limit` unscored leads (lead_score = 0) from Supabase.
    Useful for bulk runs or scheduled jobs.
    """
    res = supabase.table("leads").select("*").eq("lead_score", 0).limit(limit).execute()
    if not res.data:
        return {"scored": 0, "results": []}

    results = []
    for lead_data in res.data:
        lead_id = lead_data.get("id")
        try:
            result      = score_lead_with_openai(lead_data)
            final_score = int(result.get("score", 0))
            reason      = result.get("reason", "No reason provided")
            supabase.table("leads").update({"lead_score": final_score}).eq("id", lead_id).execute()
            results.append({
                "lead_id":    lead_id,
                "lead_score": final_score,
                "reason":     reason,
                "company":    lead_data.get("company_name", "Unknown"),
                "status":     "ok",
            })
        except Exception as e:
            results.append({"lead_id": lead_id, "status": "error", "detail": str(e)})

    return {"scored": len(results), "results": results}
