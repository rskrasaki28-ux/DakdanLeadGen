import { supabase } from './supabaseClient';

export async function updateLeadScore(leadId: number, score: number) {
  const { data, error } = await supabase
    .from('leads')
    .update({ lead_score: score })
    .eq('id', leadId)
    .select()
    .single(); // [web:21][web:36]

  if (error) throw error;
  return data;
}
