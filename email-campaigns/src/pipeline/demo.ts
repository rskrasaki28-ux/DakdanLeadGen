// DEMO ONLY
// This file demonstrates the Team D email flow:
// render template -> send email -> log campaign
// No real providers, DBs, or external services are used.
interface EmailContent {
  subject: string;
  bodyHtml: string;
}

interface EmailCampaignRecord {
  prospectId: string;
  campaignName: string;
  emailSentAt: Date;
  opened: boolean;
  replied: boolean;
  clickedLink: boolean;
}

// Mock template render
function renderTemplate(template: string, data: Record<string, string>): string {
  let output = template;
  for (const key in data) {
    output = output.replaceAll(`{{${key}}}`, data[key]);
  }
  return output;
}

// Mock provider send
async function sendEmail(to: string, subject: string, html: string) {
  console.log("Sending email to:", to);
  return { success: true };
}

// Mock DB log
async function logEmailCampaign(record: EmailCampaignRecord) {
  console.log("Logging campaign:", record);
}

// Demo flow
async function runDemo() {
  const template = "<p>Hello {{FirstName}}</p><p>{{Body}}</p>";

  const html = renderTemplate(template, {
    FirstName: "Test User",
    Body: "This is a demo email."
  });

  await sendEmail("test@example.com", "Welcome!", html);

  await logEmailCampaign({
    prospectId: "123",
    campaignName: "welcome",
    emailSentAt: new Date(),
    opened: false,
    replied: false,
    clickedLink: false
  });
}

runDemo();
