
# Email Compliance Checklist – Team D

Owner: Hodan Omar (Compliance & QA) #sportsmedia

---

## Legal Scope
All emails must comply with:
- CAN-SPAM Act (US)
- Email provider policies (SendGrid / Mailchimp)
- Internal safety standards

---

## Mandatory Requirements

### Identity & Transparency
- [ ] Sender name clearly identifies individual or company
- [ ] Physical mailing address included
- [ ] Reply-to monitored

### Unsubscribe & Suppression
- [ ] Unsubscribe link present in every email
- [ ] Suppression list checked before every send
- [ ] Unsubscribe works in sandbox mode

### Subject Line & Content Integrity
- [ ] Subject line reflects email content
- [ ] No deceptive phrasing
- [ ] AI-generated content passes tone/safety guidelines

### Data & Privacy
- [ ] No API keys or secrets in repo
- [ ] Personal data used only for personalization fields
- [ ] Logs do not store full email bodies unless required

### Development Safety
- [ ] Provider in sandbox/mock mode
- [ ] No real emails sent to real users

---

## PR Compliance Gate
All PRs touching `/email-campaigns` must confirm:
- [ ] Tested in sandbox
- [ ] Templates include footer + unsubscribe
- [ ] Suppression logic validated
- [ ] QA scenarios run
