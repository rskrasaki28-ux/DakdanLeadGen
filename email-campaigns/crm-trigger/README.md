# CRM Trigger (Team D – Sonny)

This module contains a minimal Node.js script used to trigger
the GoHighLevel (CRM) nurture workflow.

## Purpose
- Acts as the integration point between backend services and CRM automation
- Sends a simple JSON payload to a CRM webhook or API endpoint
- All email/SMS/call logic is handled inside the CRM

## Week 3 Scope
- "Hello World" trigger only
- No automation
- No database writes
- No AI logic

## Usage
1. Copy `.env.example` → `.env`
2. Fill in required environment variables (locally only)
3. Run `node trigger-workflow.js`
4. Verify the CRM workflow fires and sends an email

## Status
Active (Week 3 execution)
