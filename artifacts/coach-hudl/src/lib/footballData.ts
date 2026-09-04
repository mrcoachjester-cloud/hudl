import { supabase } from './supabase';

export type Season = {
  id: string;
  season_year: number;
  name: string | null;
  is_current: boolean;
  created_at: string;
};

export type Game = {
  id: string;
  season_id: string;
  opponent: string;
  game_date: string;
  location: string | null;
  my_score: number | null;
  opponent_score: number | null;
  game_result: string | null;
  status: string;
  notes: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
};

export type LivePlay = {
  id: string;
  game_id: string;
  play_number: number;
  odk: string | null;
  down: number | null;
  dist: number | null;
  hash: string | null;
  gnls: number | null;
  yard_line: number | null;
  play_type: string | null;
  result: string | null;
  off_formation: string | null;
  personnel: string | null;
  scheme: string | null;
  motion: string | null;
  off_play: string | null;
  ball_carrier: string | null;
  defense: string | null;
  play_dir: string | null;
  backfield: string | null;
  created_at: string;
};

export type ScoutingSession = {
  id: string;
  season_id: string;
  game_id: string | null;
  opponent: string;
  week: string | null;
  description: string | null;
  archived: boolean;
  uploaded_at: string | null;
  created_at: string;
};

export type ScoutingPlay = {
  id: string;
  scouting_session_id: string;
  play_no: number;
  odk: string;
  dn: number | null;
  dist: number | null;
  hash: string | null;
  gnls: number | null;
  yard_ln: number | null;
  play_type: string;
  result: string | null;
  off_form: string | null;
  personnel: string | null;
  scheme: string | null;
  motion: string | null;
  off_play: string | null;
  ball_carrier: string | null;
  defense: string | null;
  direction: string | null;
  backfield: string | null;
  created_at: string;
};

/**
 * Get all seasons.
 */
export async function getSeasons(): Promise<Season[]> {
  const { data, error } = await supabase
    .from('seasons')
    .select('*')
    .order('season_year', { ascending: false });

  if (error) throw error;

  return data ?? [];
}

/**
 * Get games for a season.
 */
export async function getGames(
  seasonId?: string,
  includeArchived = true
): Promise<Game[]> {
  let query = supabase
    .from('games')
    .select('*')
    .order('game_date', { ascending: false });

  if (seasonId) {
    query = query.eq('season_id', seasonId);
  }

  if (!includeArchived) {
    query = query.eq('archived', false);
  }

  const { data, error } = await query;

  if (error) throw error;

  return data ?? [];
}

/**
 * Create a scheduled game.
 */
export async function createGame(input: {
  seasonId: string;
  opponent: string;
  gameDate?: string;
  location?: string;
  result?: string;
}): Promise<Game> {
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

/**
 * Archive or restore a scheduled game.
 */
export async function setGameArchived(
  gameId: string,
  archived: boolean
): Promise<Game> {
  const { data, error } = await supabase
    .from('games')
    .update({ archived })
    .eq('id', gameId)
    .select('*')
    .single();

  if (error) throw error;

  return data;
}

/**
 * Get one game.
 */
export async function getGame(gameId: string): Promise<Game | null> {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('id', gameId)
    .maybeSingle();

  if (error) throw error;

  return data;
}

/**
 * Get live plays for a game.
 */
export async function getLivePlays(gameId: string): Promise<LivePlay[]> {
  const { data, error } = await supabase
    .from('plays')
    .select('*')
    .eq('game_id', gameId)
    .order('play_number', { ascending: true });

  if (error) throw error;

  return data ?? [];
}

/**
 * Get scouting sessions for a season.
 */
export async function getScoutingSessions(
  seasonId: string
): Promise<ScoutingSession[]> {
  const { data, error } = await supabase
    .from('scouting_sessions')
    .select('*')
    .eq('season_id', seasonId)
    .eq('archived', false)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data ?? [];
}

/**
 * Get scouting plays for a scouting session.
 */
export async function getScoutingPlays(
  sessionId: string
): Promise<ScoutingPlay[]> {
  const { data, error } = await supabase
    .from('scouting_plays')
    .select('*')
    .eq('scouting_session_id', sessionId)
    .order('play_no', { ascending: true });

  if (error) throw error;

  return data ?? [];
}
