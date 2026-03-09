"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUnscoredLead = getUnscoredLead;
const supabaseClient_1 = require("./supabaseClient");
async function getUnscoredLead() {
    const { data, error } = await supabaseClient_1.supabase
        .from('leads')
        .select('*')
        .eq('lead_score', 0)
        .limit(1)
        .single(); // [web:31]
    if (error && error.code !== 'PGRST116') {
        throw error;
    }
    return data !== null && data !== void 0 ? data : null;
}
