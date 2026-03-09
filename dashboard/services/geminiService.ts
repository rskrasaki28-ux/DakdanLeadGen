
import { GoogleGenAI, Chat, FunctionDeclaration, Type } from "@google/genai";
import { Agent, AgentRole, Campaign, TaskLog } from "../types";
import { db } from "./dbService";
import { leadService } from "./leadService";
import { AGENTS } from "../constants";
import { Lead } from '../models/ui/Lead';

// Lazy-initialize Gemini Client so the app doesn't crash when API key is missing (e.g. on Vercel without env vars)
let _ai: InstanceType<typeof GoogleGenAI> | null = null;
function getAI(): InstanceType<typeof GoogleGenAI> | null {
  if (!process.env.API_KEY) return null;
  if (!_ai) _ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  return _ai;
}

export interface GeminiResponse {
    text: string;
    groundingMetadata?: any;
    executedTasks?: TaskLog[];
}

// --- TOOL DEFINITIONS ---

const addLeadTool: FunctionDeclaration = {
    name: "add_lead",
    description: "Add a new potential sales lead to the database. Use this when you find a new prospect.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            companyName: { type: Type.STRING, description: "Name of the company" },
            industry: { type: Type.STRING, description: "Industry (Zoo/Aquarium, Sports, Logistics)" },
            contactPerson: { type: Type.STRING, description: "Name of the contact person" },
            email: { type: Type.STRING, description: "Email address (if found)" },
            score: { type: Type.NUMBER, description: "Suitability score (0-100)" }
        },
        required: ["companyName", "industry", "contactPerson"]
    }
};

const createCampaignTool: FunctionDeclaration = {
    name: "create_campaign",
    description: "Create a new email campaign draft.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            name: { type: Type.STRING, description: "Internal name of the campaign" },
            targetAudience: { type: Type.STRING, description: "Who this campaign targets" },
            content: { type: Type.STRING, description: "The email body text" }
        },
        required: ["name", "content"]
    }
};

const getMetricsTool: FunctionDeclaration = {
    name: "get_metrics",
    description: "Retrieve current dashboard statistics and metrics.",
    parameters: { type: Type.OBJECT, properties: {} }
};

const askAgentTool: FunctionDeclaration = {
    name: "ask_agent",
    description: "Delegate a question or task to another specialist agent. Use this to communicate with other agents.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            agentName: { type: Type.STRING, description: "The name of the agent to ask (Stan, Eva, Sonny, HQ)" },
            question: { type: Type.STRING, description: "The specific question or instruction for them" }
        },
        required: ["agentName", "question"]
    }
};

// --- EXECUTION LOGIC ---

// Helper to execute local DB functions
async function executeTool(name: string, args: any, depth: number, onStatusUpdate?: (status: string) => void): Promise<any> {
    console.log(`[System] Executing tool: ${name}`, args);
    
    try {
        if (name === 'add_lead') {
            onStatusUpdate?.("Adding new lead to database...");
            const newLead: Lead = {
                id: Date.now().toString(),
                companyName: args.companyName,
                industry: args.industry || 'Other',
                contactPerson: args.contactPerson,
                email: args.email || 'N/A',
                status: 'New',
                score: args.score || 50,
                source: 'AI Agent',
                // createdAt: new Date().toISOString()
            };
            await leadService.createLead(newLead);
            return { result: "Lead added successfully.", leadId: newLead.id };
        }
        
        if (name === 'create_campaign') {
            onStatusUpdate?.("Drafting new campaign...");
            const newCamp: Campaign = {
                id: 'camp_' + Date.now(),
                name: args.name,
                status: 'Draft',
                targetAudience: args.targetAudience || 'General',
                content: args.content,
                createdAt: new Date().toISOString()
            };
            await db.saveCampaign(newCamp);
            return { result: "Campaign draft created successfully.", campaignId: newCamp.id };
        }

        if (name === 'get_metrics') {
            onStatusUpdate?.("Analyzing dashboard metrics...");
            const metrics = await db.getDashboardMetrics();
            return { metrics: metrics };
        }

        if (name === 'ask_agent') {
            const targetAgent = AGENTS.find(a => a.name.toLowerCase() === args.agentName.toLowerCase());
            if (!targetAgent) return { error: "Agent not found" };
            
            onStatusUpdate?.(`Consulting ${targetAgent.name}...`);
            
            // Create a sub-updater to prefix the status with the agent's name
            const subUpdater = onStatusUpdate ? (s: string) => onStatusUpdate(`${targetAgent.name}: ${s}`) : undefined;

            // Call the other agent with increased depth
            const response = await getGeminiChatResponse(targetAgent, args.question, [], undefined, depth + 1, subUpdater); 
            return { 
                agent: targetAgent.name, 
                response: response.text 
            };
        }

        return { error: "Unknown tool" };
    } catch (e) {
        console.error("Tool Execution Error", e);
        return { error: "Failed to execute task" };
    }
}


export const getGeminiChatResponse = async (
  agent: Agent,
  message: string,
  history: { role: 'user' | 'model'; parts: { text?: string; inlineData?: any }[] }[],
  attachment?: { base64: string; mimeType: string },
  depth: number = 0,
  onStatusUpdate?: (status: string) => void
): Promise<GeminiResponse> => {
  const ai = getAI();
  if (!ai) {
    return { text: "Error: API Key is missing. Please check your configuration." };
  }

  // Prevent infinite recursion loops in delegation
  if (depth > 2) return { text: "I cannot delegate further (recursion limit)." };

  // Track executed tasks for this turn
  const executedTasks: TaskLog[] = [];

  try {
    let modelId = 'gemini-3-flash-preview';
    let availableTools: any[] = [];
    let temperature = 0.7;

    // --- AGENT CONFIGURATION ---
    if (agent.role === AgentRole.LEAD_GEN) {
        // Stan
        modelId = 'gemini-3-flash-preview';
        
        // FIX: The API does not support mixing `googleSearch` with `functionDeclarations`.
        // We use a keyword heuristic to determine if the user wants to Search (web) or Act (database/delegate).
        const searchKeywords = ['find', 'search', 'who', 'what', 'where', 'list', 'identify', 'scout', 'look for', 'get me'];
        const isSearchIntent = searchKeywords.some(k => message.toLowerCase().includes(k));

        if (isSearchIntent) {
             availableTools = [{ googleSearch: {} }];
        } else {
             availableTools = [{ functionDeclarations: [addLeadTool, askAgentTool] }];
        }
    } else if (agent.role === AgentRole.DATA_ANALYST) {
        // Eva
        modelId = 'gemini-3-flash-preview';
        temperature = 0.2;
        availableTools = [
            { functionDeclarations: [getMetricsTool, askAgentTool] }
        ];
    } else if (agent.role === AgentRole.OUTREACH) {
        // Sonny
        modelId = 'gemini-3-flash-preview';
        temperature = 0.9;
        availableTools = [
            { functionDeclarations: [createCampaignTool, askAgentTool] }
        ];
    } else if (agent.role === AgentRole.HQ) {
        // HQ (Manager)
        modelId = 'gemini-3-pro-preview';
        availableTools = [
            { functionDeclarations: [getMetricsTool, askAgentTool, addLeadTool] }
        ];
    } else {
        // Receptionist
        availableTools = [{ functionDeclarations: [askAgentTool] }];
    }

    if (attachment) {
        modelId = 'gemini-3-pro-preview';
    }

    // Initialize Chat
    const chat = ai.chats.create({
        model: modelId,
        config: {
            systemInstruction: agent.systemPrompt,
            temperature: temperature,
            tools: availableTools.length > 0 ? availableTools : undefined,
        },
        history: history,
    });

    // Construct Message
    const msgParts: any[] = [{ text: message }];
    if (attachment) {
        msgParts.push({
            inlineData: {
                data: attachment.base64,
                mimeType: attachment.mimeType
            }
        });
    }

    // --- FIRST TURN ---
    let result = await chat.sendMessage({
        message: msgParts.length === 1 && typeof msgParts[0].text === 'string' ? msgParts[0].text : msgParts
    });

    // --- TOOL EXECUTION LOOP ---
    const calls = result.candidates?.[0]?.content?.parts?.filter((p:any) => p.functionCall);

    if (calls && calls.length > 0) {
        const functionResponses = [];
        
        for (const part of calls) {
            if (part.functionCall) {
                const { name, args, id } = part.functionCall;
                // Execute
                const toolResult = await executeTool(name, args, depth, onStatusUpdate);
                
                // Create a log entry for the executed task
                let taskSummary = `Executed ${name}`;
                let taskDetails = JSON.stringify(toolResult);

                if (name === 'ask_agent') {
                    taskSummary = `Consulted Agent: ${args.agentName}`;
                    // If delegation, the 'details' is the response text from the other agent
                    taskDetails = toolResult.response || "No response received.";
                } else if (name === 'add_lead') {
                    taskSummary = `Added Lead: ${args.companyName}`;
                    taskDetails = "Lead saved to database successfully.";
                } else if (name === 'get_metrics') {
                    taskSummary = "Analyzed Dashboard Metrics";
                    taskDetails = "Retrieved latest KPI data.";
                }

                executedTasks.push({
                    id: id || Date.now().toString(),
                    tool: name,
                    summary: taskSummary,
                    details: taskDetails,
                    timestamp: new Date(),
                    status: toolResult.error ? 'failure' : 'success'
                });
                
                // Prepare response
                functionResponses.push({
                    name: name,
                    response: { result: toolResult },
                    id: id
                });
            }
        }

        // Send tool results back to model
        if (functionResponses.length > 0) {
             result = await chat.sendMessage({
                message: functionResponses.map(fr => ({
                    functionResponse: fr
                }))
             });
        }
    }

    const responseText = result.text || "Task executed.";
    const groundingMetadata = result.candidates?.[0]?.groundingMetadata;

    return {
        text: responseText,
        groundingMetadata,
        executedTasks // Return the log of what happened
    };

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    const errText = error?.message || String(error);
    return { text: `I encountered a system error: ${errText.substring(0, 100)}... Please try again.` };
  }
};

export const analyzeLeadWithGemini = async (leadData: string): Promise<string> => {
    return "Analysis unavailable.";
}
