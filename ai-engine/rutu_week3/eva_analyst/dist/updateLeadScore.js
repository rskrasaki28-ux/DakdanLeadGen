"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateLeadScore = updateLeadScore;
const supabaseClient_1 = require("./supabaseClient");
async function updateLeadScore(leadId, score) {
    const { data, error } = await supabaseClient_1.supabase
        .from('leads')
        .update({ lead_score: score })
        .eq('id', leadId)
        .select()
        .single(); // [web:21][web:36]
    if (error)
        throw error;
    return data;
}
