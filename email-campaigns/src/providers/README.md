Purpose:
Abstract email delivery providers (SendGrid, Mailchimp, etc.).

This layer isolates external email APIs from the rest of the system.

Responsibilities:
- Send emails (test-only for now)
- Handle provider-specific formatting
- Support future A/B testing hooks

Initial implementation may use a mock provider
until API keys are available.

