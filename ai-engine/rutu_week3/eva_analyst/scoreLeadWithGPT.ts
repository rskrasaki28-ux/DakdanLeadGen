import { openai } from './openaiClient';

export async function scoreLeadWithGPT(lead: any): Promise<number> {
  const prompt = `
You are Eva, an AI data analyst.
Given this lead JSON, output a single integer lead score from 1 to 100.
Only return the number, no explanation.

Lead:
${JSON.stringify(lead, null, 2)}
`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const text = (completion.choices[0]?.message?.content || '').trim();
  const score = parseInt(text, 10);

  if (!text || Number.isNaN(score)) {
    throw new Error(`Invalid score from model: "${text}"`);
  }

  return Math.min(100, Math.max(1, score));
}
