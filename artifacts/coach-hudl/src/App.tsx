import { type CSSProperties, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { appendScoutingPlays, createGame, createScoutingSession, getGames, getLivePlays, getScoutingSessions, getScoutingPlays, getSeasons, livePlayToStandard, scoutingPlayToStandard, type StandardPlay } from './lib/footballData';
import { getScoutingPlaysForTeam, getScoutingTeamNames } from './lib/teamData';
import { parseHudlCsv } from './lib/hudlCsv';
import { isSupabaseConfigured } from './lib/supabase';
import { standardPlaysToHudlCsv, hudlCsvFilename } from './lib/hudlCsvExport';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Check,
  ChevronRight,
  CircleAlert,
  ClipboardList,
  Compass,
  Download,
  FileSpreadsheet,
  Film,
  Gauge,
  Layers,
  LayoutDashboard,
  Menu,
  Percent,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  Split,
  Target,
  Trash2,
  TrendingUp,
  UploadCloud,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { Link, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

// ...
