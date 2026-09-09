import { supabase, isSupabaseConfigured } from '../lib/supabase';

export type LivePlayRealtimeEvent = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  play: Record<string, unknown>;
};

export function subscribeToLiveGame(
  gameId: string,
  onChange: (event: LivePlayRealtimeEvent) => void,
) {
  if (!isSupabaseConfigured || !supabase || !gameId) return () => {};
  const channel = supabase
    .channel(`live-game:${gameId}`)
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'plays', filter: `game_id=eq.${gameId}`,
    }, (payload) => {
      onChange({ eventType: payload.eventType as LivePlayRealtimeEvent['eventType'], play: (payload.new || payload.old) as Record<string, unknown> });
    })
    .subscribe();
  return () => { void supabase.removeChannel(channel); };
}

export async function saveLivePlayCell(
  playId: string,
  field: string,
  value: string,
) {
  if (!isSupabaseConfigured || !supabase || !playId) return;
  const allowed = new Set(['odk','down','dist','hash','yard_line','off_formation','off_play','play_type','ball_carrier','result','defense']);
  if (!allowed.has(field)) throw new Error(`Unsupported live field: ${field}`);
  const { error } = await supabase.from('plays').update({ [field]: value }).eq('id', playId);
  if (error) throw error;
}
