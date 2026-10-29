import type { StandardPlay } from './footballData';

type ReportType = 'offense' | 'defense';
type ReportFields = Record<string, string>;
type ReportMeta = { opponent: string; reportDate: string; week: string; location: string; preparedBy: string; team: string };

declare global {
  interface Window {
    jspdf?: { jsPDF: new (options?: Record<string, unknown>) => any };
  }
}

async function ensurePdf(): Promise<any> {
  if (window.jspdf?.jsPDF) return window.jspdf.jsPDF;
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.async = true;
    script.onload = () => window.jspdf?.jsPDF ? resolve() : reject(new Error('PDF library did not initialize.'));
    script.onerror = () => reject(new Error('Could not load the PDF generator. Check your connection and try again.'));
    document.head.appendChild(script);
  });
  if (!window.jspdf?.jsPDF) throw new Error('PDF library did not initialize.');
  return window.jspdf.jsPDF;
}

const clean = (value: unknown) => String(value ?? '').trim();
const number = (value: unknown) => {
  const match = clean(value).match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : 0;
};
const isRun = (play: StandardPlay) => /run|scramble/i.test(clean(play.type));
const isPass = (play: StandardPlay) => /pass/i.test(clean(play.type)) && !/scramble/i.test(clean(play.type));
const gain = (play: StandardPlay) => number(play.gnls);
const share = (count: number, total: number) => total ? Math.round(count / total * 100) : 0;
const topCounts = (values: string[], limit = 8) => {
  const counts = new Map<string, number>();
  values.map(clean).filter(value => value && value !== '-' && value.toLowerCase() !== 'n/a').forEach(value => counts.set(value, (counts.get(value) || 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
};

export async function downloadWeeklyScoutingReport(
  plays: StandardPlay[],
  reportType: ReportType,
  meta: ReportMeta,
  fields: ReportFields,
): Promise<void> {
  const JsPDF = await ensurePdf();
  const pdf = new JsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const left = 48;
  const right = pageWidth - 48;
  const contentWidth = right - left;
  const title = reportType === 'defense' ? 'WEEKLY DEFENSIVE SCOUT REPORT' : 'WEEKLY OFFENSIVE SCOUT REPORT';
  let y = 52;

  const newPage = (heading: string) => {
    pdf.addPage();
    y = 54;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(17);
    pdf.text(heading, left, y);
    y += 18;
    pdf.setDrawColor(75, 34, 105);
    pdf.setLineWidth(2);
    pdf.line(left, y, right, y);
    y += 24;
  };
  const ensureRoom = (height: number) => {
    if (y + height > pageHeight - 48) newPage('WEEKLY SCOUT REPORT · CONTINUED');
  };
  const paragraph = (label: string, value: string) => {
    const content = clean(value);
    if (!content) return;
    const labelLines = pdf.splitTextToSize(label, contentWidth);
    const lines = pdf.splitTextToSize(content, contentWidth);
    const height = labelLines.length * 13 + lines.length * 14 + 12;
    ensureRoom(height);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.text(labelLines, left, y);
    y += labelLines.length * 13;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.text(lines, left, y);
    y += lines.length * 14 + 12;
  };
  const sectionHeading = (heading: string) => {
    ensureRoom(42);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.setTextColor(75, 34, 105);
    pdf.text(heading, left, y);
    pdf.setTextColor(0, 0, 0);
    y += 20;
  };
  const table = (heading: string, headers: string[], rows: string[][]) => {
    if (!rows.length) return;
    sectionHeading(heading);
    const widths = headers.map(() => contentWidth / headers.length);
    const rowHeight = 20;
    const drawRow = (cells: string[], bold = false) => {
      ensureRoom(rowHeight + 2);
      let x = left;
      pdf.setFont('helvetica', bold ? 'bold' : 'normal');
      pdf.setFontSize(8);
      cells.forEach((cell, index) => {
        const lines = pdf.splitTextToSize(clean(cell), widths[index] - 8);
        pdf.text(lines.slice(0, 2), x + 4, y + 12);
        x += widths[index];
      });
      pdf.setDrawColor(210, 210, 210);
      pdf.line(left, y + rowHeight, right, y + rowHeight);
      y += rowHeight;
    };
    drawRow(headers, true);
    rows.forEach(row => drawRow(row));
    y += 12;
  };

  pdf.setFillColor(51, 0, 102);
  pdf.rect(0, 0, pageWidth, 175, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(21);
  pdf.text(title, left, 66, { maxWidth: contentWidth });
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(13);
  pdf.text(clean(meta.opponent) || 'Opponent scouting report', left, 96);
  pdf.setFontSize(10);
  pdf.text([meta.team, meta.week, meta.reportDate, meta.location].filter(Boolean).join('  ·  '), left, 121, { maxWidth: contentWidth });
  if (meta.preparedBy) pdf.text('Prepared by: ' + meta.preparedBy, left, 145);
  pdf.setTextColor(0, 0, 0);
  y = 205;
  sectionHeading('GAME INFORMATION');
  paragraph('Opponent', meta.opponent);
  paragraph('Team / season', meta.team);
  paragraph('Week / game', meta.week);
  paragraph('Date and location', [meta.reportDate, meta.location].filter(Boolean).join(' · '));
  paragraph('Prepared by', meta.preparedBy);

  const fieldPages: Array<{ title: string; fields: Array<[string, string]> }> = reportType === 'defense' ? [
    { title: 'OPPONENT OVERVIEW', fields: [['Team overview', 'opponentOverview'], ['Coaching staff / scheme notes', 'staffNotes'], ['Key players to watch', 'keyPlayers']] },
    { title: 'OFFENSIVE IDENTITY & TENDENCIES', fields: [['Offensive scheme and identity', 'scheme'], ['Personnel / formations', 'personnel'], ['Run game / pass game notes', 'runPassNotes'], ['Motion / backfield tells', 'motionNotes']] },
    { title: 'FORMATION BREAKDOWN & ADJUSTMENTS', fields: [['Formation-specific adjustments', 'formationAdjustments'], ['Down and distance plan', 'downDistancePlan'], ['Field position / hash notes', 'fieldPositionNotes']] },
    { title: 'DEFENSIVE PLAN', fields: [['Fronts, coverages, and pressures', 'defensivePlan'], ['Key assignments / matchups', 'matchups'], ['Keys to success', 'keysToSuccess'], ['Weekly emphasis / team message', 'weeklyMessage']] },
  ] : [
    { title: 'OPPONENT OVERVIEW', fields: [['Team overview', 'opponentOverview'], ['Coaching staff / defensive scheme notes', 'staffNotes'], ['Key players to watch', 'keyPlayers']] },
    { title: 'DEFENSIVE IDENTITY & TENDENCIES', fields: [['Defensive fronts and structures', 'scheme'], ['Coverage / pressure tendencies', 'coveragePressure'], ['Personnel / formation notes', 'personnel'], ['Down and distance tendencies', 'downDistancePlan']] },
    { title: 'OFFENSIVE PLAN & ADJUSTMENTS', fields: [['Formation-specific offensive answers', 'formationAdjustments'], ['Run / pass plan', 'runPassNotes'], ['Protection / matchup notes', 'matchups']] },
    { title: 'WEEKLY OFFENSIVE FOCUS', fields: [['Keys to success', 'keysToSuccess'], ['Situational priorities', 'fieldPositionNotes'], ['Weekly emphasis / team message', 'weeklyMessage']] },
  ];

  for (const page of fieldPages) {
    newPage(page.title);
    for (const [label, key] of page.fields) paragraph(label, fields[key] || '');
  }

  newPage('SCOUTING DATA SNAPSHOT');
  sectionHeading('CHART SUMMARY');
  const total = plays.length;
  const runs = plays.filter(isRun).length;
  const passes = plays.filter(isPass).length;
  const explosives = plays.filter(play => isRun(play) ? gain(play) >= 15 : isPass(play) ? gain(play) >= 20 : false).length;
  const avgGain = total ? (plays.reduce((sum, play) => sum + gain(play), 0) / total).toFixed(1) : '0.0';
  paragraph('Charted snaps', String(total));
  paragraph('Run / scramble calls', runs + ' (' + share(runs, total) + '%)');
  paragraph('Pass calls', passes + ' (' + share(passes, total) + '%)');
  paragraph('Explosive plays', explosives + ' (runs 15+ yards; passes 20+ yards)');
  paragraph('Average gain / loss', avgGain + ' yards');
  table('TOP FORMATIONS', ['Formation', 'Snaps'], topCounts(plays.map(play => clean(play.form))).map(([name, count]) => [name, String(count)]));
  table('TOP PLAY CALLS / SCHEMES', ['Call / scheme', 'Snaps'], topCounts(plays.map(play => clean(play.offPlay) || clean(play.scheme))).map(([name, count]) => [name, String(count)]));
  table('PERSONNEL', ['Personnel', 'Snaps'], topCounts(plays.map(play => clean(play.personnel))).map(([name, count]) => [name, String(count)]));
  table('MOTION', ['Motion', 'Snaps'], topCounts(plays.map(play => clean(play.motion))).map(([name, count]) => [name, String(count)]));
  const downRows = [1, 2, 3, 4].map(down => {
    const rows = plays.filter(play => number(play.dn) === down);
    return [String(down), String(rows.length), share(rows.filter(isRun).length, rows.length) + '%', share(rows.filter(isPass).length, rows.length) + '%'];
  });
  table('DOWN TENDENCIES', ['Down', 'Snaps', 'Run %', 'Pass %'], downRows);

  const pageCount = pdf.getNumberOfPages();
  for (let page = 1; page <= pageCount; page++) {
    pdf.setPage(page);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);
    pdf.text('Weekly scouting handout · ' + clean(meta.opponent), left, pageHeight - 24);
    pdf.text(page + ' / ' + pageCount, right, pageHeight - 24, { align: 'right' });
  }
  const safeOpponent = (clean(meta.opponent) || 'opponent').replace(/[^a-z0-9-_]+/gi, '-').replace(/^-|-$/g, '');
  pdf.save('weekly-scout-' + safeOpponent + '-' + reportType + '.pdf');
}
