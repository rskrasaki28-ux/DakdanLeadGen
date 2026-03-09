# QA & Validation Scenarios – Email Pipeline

Owner: Kevin (QA / Validation)  
Compliance Partner: Hodan (Compliance / QA)

---

## Scope
Validates the “connected skeleton”:  
Template Render → Provider Send → Campaign Log → Compliance Enforcement

---

## Test Scenarios

### 1. Missing Placeholder Values
- **Steps:** Trigger send with missing {{FirstName}}
- **Expected:** Template uses fallback, no runtime error
- **Failure:** Log `MISSING_TEMPLATE_FIELD`, block send

### 2. Provider Send Success (Mock)
- **Steps:** Trigger mock email send
- **Expected:** Status `MOCK_SENT`, campaign log created
- **Failure:** Log `PROVIDER_RESPONSE_MISSING`

### 3. Provider Failure
- **Steps:** Force provider to return error
- **Expected:** Status `FAILED`, error reason stored
- **Failure:** Retry flag set

### 4. Duplicate Send Prevention
- **Steps:** Trigger same campaign twice
- **Expected:** Second send blocked, log `DUPLICATE_SEND_PREVENTED`

### 5. Unsubscribe Enforcement
- **Steps:** Send to unsubscribed email
- **Expected:** Send blocked, log `UNSUBSCRIBED_SUPPRESSION`

### 6. Invalid Email Format
- **Steps:** Submit email without proper format
- **Expected:** Send blocked, log `INVALID_EMAIL_FORMAT`

### 7. Missing AI Content
- **Steps:** Trigger send with empty AI content
- **Expected:** Send blocked or fallback used, log `AI_CONTENT_MISSING`

---

## Reporting
- Failed scenarios must be commented on PR  
- Recurring issues logged in `/email-campaigns/docs/QA_ISSUES.md`

---

## Exit Criteria
- All scenarios pass  
- No open compliance issues
