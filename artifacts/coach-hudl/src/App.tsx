import { type CSSProperties, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { createGame, getGames, getLivePlays, getScoutingSessions, getScoutingPlays, getSeasons, livePlayToStandard, scoutingPlayToStandard, type StandardPlay } from './lib/footballData';
import { isSupabaseConfigured } from './lib/supabase';
