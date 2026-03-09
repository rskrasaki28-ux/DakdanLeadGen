"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scoreLeadWithGPT = scoreLeadWithGPT;
const openaiClient_1 = require("./openaiClient");
async function scoreLeadWithGPT(lead) {
    const prompt = `
You are Eva, an AI data analyst.
Given this lead JSON, output a single integer lead score from 1 to 100.
Only return the number, no explanation.

Lead:
${JSON.stringify(lead, null, 2)}
`;
    const response = await openaiClient_1.openai.responses.create({
        model: 'gpt-4o',
        input: prompt
    });
    const text = response.output_text.trim(); // Responses API [web:26][web:71]
    const score = parseInt(text, 10);
    if (Number.isNaN(score)) {
        throw new Error(`Invalid score from model: "${text}"`);
    }
    return Math.min(100, Math.max(1, score));
}
