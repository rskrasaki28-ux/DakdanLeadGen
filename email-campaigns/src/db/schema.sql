-- Email sends tracking table
-- Logs every email send attempt with status and engagement timestamps

CREATE TABLE IF NOT EXISTS email_sends (
    id SERIAL PRIMARY KEY,
    lead_id INTEGER NOT NULL,
    campaign_id INTEGER NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) NOT NULL, -- sent, failed, bounced
    opened_at TIMESTAMP,
    clicked_at TIMESTAMP,
    replied_at TIMESTAMP,
    unsubscribed_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_email_sends_lead ON email_sends(lead_id);
CREATE INDEX IF NOT EXISTS idx_email_sends_campaign ON email_sends(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_sends_status ON email_sends(status);
