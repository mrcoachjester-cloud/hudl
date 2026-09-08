import type { StandardPlay } from './footballData';

/**
 * Shared Hudl football breakdown export columns.
 * These mirror the fields already recognized by the app's Hudl CSV importer.
 */
export const HUDL_CSV_HEADERS = [
  'Play #',
  'ODK',
  'Dn',
  'Dist',
  'Hash',
  'Yard Ln',
  'RPO',
  'Play Type',
  'Result',
  'Gn/LS',
  'Ball Carrier',
  'Personnel',
  'Off Form',
  'Backfield',
  'Motion',
  'Scheme',
  'Off Play',
  'Play Dir',
  'Play Str Wk',
  'Pass Pro',
  'Read',
  'Def Call',
  'Def Front',
  'Def Stunt',
  'Coverage',
  'Blitz',
  'Comments',
] as const;

function clean(value: unknown): string {
  if (value === null || value === undefined) return '';
  const text = String(value).trim();
  return text === '—' ? '' : text;
}

function csvCell(value: unknown): string {
  return `"${clean(value).replaceAll('"', '""')}"`;
}

function normalizeOdk(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'offense' || normalized === 'offensive') return 'O';
  if (normalized === 'defense' || normalized === 'defensive') return 'D';
  if (normalized === 'kick' || normalized === 'kicking' || normalized === 'special teams') return 'K';
  return value.trim().toUpperCase();
}

function normalizeType(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'run') return 'Run';
  if (normalized === 'pass') return 'Pass';
  return value.trim();
}

function rowForPlay(play: StandardPlay): string[] {
  return [
    play.playNo,
    normalizeOdk(play.odk),
    play.dn,
    play.dist,
    play.hash,
    play.yardLn,
    play.rpo,
    normalizeType(play.type),
    play.result,
    play.gnls,
    play.carrier,
    play.personnel,
    play.form,
    play.backfield,
    play.motion,
    play.scheme,
    play.offPlay,
    play.dir,
    play.playStrength,
    play.protection,
    play.read,
    play.defCall,
    play.defense,
    play.stunt,
    play.coverage,
    play.blitz,
    play.comments,
  ].map(clean);
}

/** Convert normalized plays to a UTF-8 CSV suitable for Hudl football breakdown import. */
export function standardPlaysToHudlCsv(plays: StandardPlay[]): string {
  const lines = [
    HUDL_CSV_HEADERS.map(csvCell).join(','),
    ...plays.map(play => rowForPlay(play).map(csvCell).join(',')),
  ];
  return `${lines.join('\r\n')}\r\n`;
}

export function hudlCsvFilename(prefix: string, suffix: string): string {
  const safePrefix = prefix.trim().replace(/[^a-z0-9._-]+/gi, '_').replace(/^_+|_+$/g, '') || 'game';
  const safeSuffix = suffix.trim().replace(/[^a-z0-9._-]+/gi, '_').replace(/^_+|_+$/g, '') || 'Hudl';
  return `${safePrefix}_${safeSuffix}_Hudl.csv`;
}
