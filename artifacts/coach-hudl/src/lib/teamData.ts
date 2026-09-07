import { supabase } from './supabase';
import { scoutingPlayToStandard, type StandardPlay } from './footballData';

type SeasonRow = { id: string; season_year: number };
type SessionRow = { id: string; opponent: string | null; season_id: string };

export async function getScoutingTeamNames(seasonYear: string): Promise<string[]> {
  if (!supabase || !seasonYear) return [];

  const { data: seasons, error: seasonError } = await supabase
    .from('seasons')
    .select('id, season_year')
    .eq('season_year', Number(seasonYear))
    .limit(1);

  if (seasonError) throw seasonError;
  const season = (seasons as SeasonRow[] | null)?.[0];
  if (!season) return [];

  const { data: sessions, error: sessionError } = await supabase
    .from('scouting_sessions')
    .select('id, opponent, season_id')
    .eq('season_id', season.id)
    .eq('archived', false)
    .order('created_at', { ascending: false });

  if (sessionError) throw sessionError;

  return Array.from(new Set(
    ((sessions as SessionRow[] | null) ?? [])
      .map(session => session.opponent?.trim() ?? '')
      .filter(Boolean)
  ));
}

export async function getScoutingPlaysForTeam(seasonYear: string, team: string): Promise<StandardPlay[]> {
  if (!supabase || !seasonYear || !team) return [];

  const { data: seasons, error: seasonError } = await supabase
    .from('seasons')
    .select('id, season_year')
    .eq('season_year', Number(seasonYear))
    .limit(1);

  if (seasonError) throw seasonError;
  const season = (seasons as SeasonRow[] | null)?.[0];
  if (!season) return [];

  const { data: sessions, error: sessionError } = await supabase
    .from('scouting_sessions')
    .select('id, opponent, season_id')
    .eq('season_id', season.id)
    .eq('archived', false)
    .ilike('opponent', team.trim());

  if (sessionError) throw sessionError;
  const sessionIds = ((sessions as SessionRow[] | null) ?? []).map(session => session.id);
  if (!sessionIds.length) return [];

  const { data: plays, error: playError } = await supabase
    .from('scouting_plays')
    .select('*')
    .in('scouting_session_id', sessionIds)
    .order('play_no', { ascending: true });

  if (playError) throw playError;
  return ((plays ?? []) as Parameters<typeof scoutingPlayToStandard>[0][]).map(scoutingPlayToStandard);
}
