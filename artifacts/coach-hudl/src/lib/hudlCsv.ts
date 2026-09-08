import type { StandardPlay } from './footballData';

type CsvRow = string[];

function parseRows(text: string): CsvRow[] {
  const rows: CsvRow[] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i += 1; }
      else quoted = !quoted;
    } else if (ch === ',' && !quoted) {
      row.push(cell.trim()); cell = '';
    } else if ((ch === '\n' || ch === '\r') && !quoted) {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      row.push(cell.trim()); cell = '';
      if (row.some(value => value !== '')) rows.push(row);
      row = [];
    } else cell += ch;
  }
  if (cell !== '' || row.length) {
    row.push(cell.trim());
    if (row.some(value => value !== '')) rows.push(row);
  }
  return rows;
}

function header(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function numberText(value: string, fallback = '') {
  const match = value.trim().match(/-?\d+(?:\.\d+)?/);
  return match ? match[0] : fallback;
}

function text(values: string[], indexes: Record<string, number>, key: string) {
  const index = indexes[key];
  return index >= 0 ? (values[index] ?? '').trim() : '';
}

function findColumn(headers: string[], aliases: string[]) {
  const normalized = aliases.map(header);
  return headers.findIndex(value => normalized.includes(value));
}

/** Converts the Hudl PlaylistData export format into the app's normalized play format. */
export function parseHudlCsv(csv: string): StandardPlay[] {
  const rows = parseRows(csv);
  if (rows.length < 2) return [];

  const headers = rows[0].map(header);
  const aliases: Record<string, string[]> = {
    playNo: ['play #', 'play no', 'play number'],
    odk: ['odk'],
    dn: ['dn', 'down'],
    dist: ['dist', 'distance'],
    hash: ['hash'],
    yardLn: ['yard ln', 'yard line', 'yardline'],
    rpo: ['rpo'],
    type: ['play type', 'type'],
    result: ['result'],
    gnls: ['gn ls', 'gn/ls', 'gain loss'],
    personnel: ['personnel'],
    form: ['off form', 'formation'],
    backfield: ['backfield'],
    motion: ['motion'],
    scheme: ['scheme'],
    offPlay: ['off play'],
    dir: ['play dir', 'direction'],
    playStrength: ['play str wk', 'play str wk'],
    passPro: ['pass pro'],
    read: ['read'],
    defCall: ['def call'],
    defense: ['def front', 'defense'],
    stunt: ['def stunt', 'stunt'],
    coverage: ['coverage'],
    blitz: ['blitz'],
    comments: ['comments'],
  };
  const indexes: Record<string, number> = {};
  for (const [key, names] of Object.entries(aliases)) indexes[key] = findColumn(headers, names);

  return rows.slice(1).map((values, index) => {
    const playNo = numberText(text(values, indexes, 'playNo'), String(index + 1));
    const gain = text(values, indexes, 'gnls');
    const yardLn = numberText(text(values, indexes, 'yardLn'));
    const type = text(values, indexes, 'type') || 'Run';
    const result = text(values, indexes, 'result');
    const offPlay = text(values, indexes, 'offPlay');
    const form = text(values, indexes, 'form');
    const personnel = text(values, indexes, 'personnel');
    const scheme = text(values, indexes, 'scheme');
    const defense = text(values, indexes, 'defense');
    const motion = text(values, indexes, 'motion');
    const direction = text(values, indexes, 'dir');
    const backfield = text(values, indexes, 'backfield');
    const odk = text(values, indexes, 'odk').toUpperCase();

    return {
      playNo: String(Number(playNo) || index + 1).padStart(2, '0'),
      odk: odk || 'O',
      dn: numberText(text(values, indexes, 'dn'), '1'),
      dist: numberText(text(values, indexes, 'dist'), '10'),
      hash: text(values, indexes, 'hash') || 'M',
      gnls: gain || '0',
      carrier: '',
      yardLn: yardLn || '—',
      type,
      result: result || '—',
      form: form || '—',
      personnel,
      scheme,
      defense,
      motion: motion || 'None',
      offPlay: offPlay || '—',
      dir: direction || '—',
      backfield: backfield || '—',
      rpo: text(values, indexes, 'rpo'),
      stunt: text(values, indexes, 'stunt'),
      coverage: text(values, indexes, 'coverage'),
      blitz: text(values, indexes, 'blitz'),
      protection: text(values, indexes, 'passPro'),
      read: text(values, indexes, 'read'),
      comments: text(values, indexes, 'comments'),
      playStrength: text(values, indexes, 'playStrength'),
      defCall: text(values, indexes, 'defCall'),
    } as StandardPlay;
  });
}
