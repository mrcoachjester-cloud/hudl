import { supabase } from './supabase';

export type CreateGameInput = {
  seasonId: string;
  opponent: string;
  gameDate?: string;
  location?: string;
  result?: string;
};

export async function createGame(input: CreateGameInput) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('games')
    .insert({
      season_id: input.seasonId,
      opponent: input.opponent,
      game_date: input.gameDate || null,
      location: input.location || null,
      game_result: input.result && input.result !== '—' ? input.result : null,
      archived: false,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}
