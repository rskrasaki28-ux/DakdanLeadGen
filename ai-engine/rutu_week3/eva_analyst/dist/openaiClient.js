"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.openai = void 0;
// openaiClient.ts
const openai_1 = __importDefault(require("openai"));
require("dotenv/config");
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY');
}
// Official 6.x usage [web:71]
exports.openai = new openai_1.default({
    apiKey
});
