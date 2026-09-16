import { type CSSProperties, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { appendScoutingPlays, createGame, createScoutingSession, getGames, getLivePlays, getScoutingSessions, getScoutingPlays, getSeasons, livePlayToStandard, scoutingPlayToStandard, type StandardPlay } from './lib/footballData';
import { getScoutingPlaysForTeam, getScoutingTeamNames } from './lib/teamData';
import { parseHudlCsv } from './lib/hudlCsv';
import { isSupabaseConfigured } from './lib/supabase';
import { standardPlaysToHudlCsv, hudlCsvFilename } from './lib/hudlCsvExport';
