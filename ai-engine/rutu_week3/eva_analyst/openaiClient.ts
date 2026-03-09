// openaiClient.ts
import OpenAI from 'openai';
import 'dotenv/config';

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  throw new Error('Missing OPENAI_API_KEY');
}

// Official 6.x usage [web:71]
export const openai = new OpenAI({
  apiKey
});
