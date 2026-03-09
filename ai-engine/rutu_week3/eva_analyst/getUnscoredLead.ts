import { supabase } from './supabaseClient';

export async function getUnscoredLead() {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('lead_score', 0)
    .limit(1)
    .single(); // [web:31]

  if (error && error.code !== 'PGRST116') {
    throw error;
  }
  return data ?? null;
}
