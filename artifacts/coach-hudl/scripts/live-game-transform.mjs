const resultOptions = ['Complete', 'Complete, TD', 'Fumble', 'Good', 'Incomplete', 'Interception', 'No Good', 'Penalty', 'Return', 'Rush', 'Rush, TD', 'Sack', 'Scramble', '2 Pt', 'Extra Pt', 'Punt', 'FG', 'Onside Kick', 'Pass'];
const resultOptionsSource = `[${resultOptions.map(option => `'${option}'`).join(', ')}]`;

export function liveGameTransform() {
  return {
    name: 'coach-connect-live-game-transform',
    enforce: 'pre',
    transform(source, id) {
      if (!id.endsWith('/src/App.tsx')) return null;
      let code = source;

      // New snaps inherit only the field-position controls. Everything else starts blank.
      code = code.replace(
        /const \[form, setForm\] = useState<Play>\(\{ \.\.\.demoScouting\[0\], playNo: String\(data\.live\.length \+ 1\)\.padStart\(2, '0'\), yardLn: data\.live\.at\(-1\)\?\.yardLn \?\? '-22', result: '' \}\);/,
        "const [form, setForm] = useState<Play>({ ...demoScouting[0], playNo: String(data.live.length + 1).padStart(2, '0'), yardLn: data.live.at(-1)?.yardLn ?? '-22', form: '', offPlay: '', type: '', carrier: '', defense: '', result: '' });"
      );

      // Keep the five field-position controls as dropdowns/inputs, but make the
      // scouting-driven fields plain editable inputs with datalist suggestions.
      const oldField = `const field = (key: keyof Play, label: string, options?: string[]) => <div className="field"><label htmlFor={\`live-\${key}\`}>{label}</label>{options ? <select id={\`live-\${key}\`} value={form[key]} onChange={event => update(key, event.target.value)} data-testid={\`select-live-\${key}\`}>{options.map(option => <option key={option}>{option}</option>)}</select> : <input id={\`live-\${key}\`} className="input" value={form[key]} onChange={event => update(key, event.target.value)} data-testid={\`input-live-\${key}\`} />}</div>;`;
      const newField = `const suggestionValues = (key: keyof Play) => Array.from(new Set([...data.scouting.map(play => play[key]), ...data.live.map(play => play[key])].map(value => String(value ?? '').trim()).filter(Boolean))); const editableField = (key: keyof Play, label: string) => { const suggestions = suggestionValues(key); const listId = \`live-suggestions-\${key}\`; return <div className="field"><label htmlFor={\`live-\${key}\`}>{label}</label><input id={\`live-\${key}\`} className="input" list={suggestions.length ? listId : undefined} value={form[key]} onChange={event => update(key, event.target.value)} data-testid={\`input-live-\${key}\`} />{suggestions.length ? <datalist id={listId}>{suggestions.map(option => <option key={option} value={option} />)}</datalist> : null}</div>; }; const field = (key: keyof Play, label: string, options?: string[]) => <div className="field"><label htmlFor={\`live-\${key}\`}>{label}</label>{options ? <select id={\`live-\${key}\`} value={form[key]} onChange={event => update(key, event.target.value)} data-testid={\`select-live-\${key}\`}>{options.map(option => <option key={option}>{option}</option>)}</select> : <input id={\`live-\${key}\`} className="input" value={form[key]} onChange={event => update(key, event.target.value)} data-testid={\`input-live-\${key}\`} />}</div>;`;
      if (code.includes(oldField)) code = code.replace(oldField, newField);

      // Requested Live Game order: ODK, Down, Dist, Hash, Yard Line,
      // Formation, Play Call, Play Type, Ball Carrier, Result, Defense, GN/LS.
      const oldGrid = /<div className="form-grid">\{field\('odk',[\s\S]*?<\/div>\}\{field\('defense',[\s\S]*?<\/div>\}<\/div>/;
      const newGrid = `<div className="form-grid">{field('odk', 'ODK', ['O', 'D', 'K'])}{field('dn', 'Down', ['1', '2', '3', '4'])}{field('dist', 'Distance')}{field('hash', 'Hash', ['L', 'M', 'R'])}{yardLineField}{editableField('form', 'Formation')}{editableField('offPlay', 'Play Call')}{field('type', 'Play Type', ['Run', 'Pass'])}{editableField('carrier', 'Ball Carrier')}{field('result', 'Result', ${resultOptionsSource})}{editableField('defense', 'Defense')}<div className="field"><label htmlFor="live-gnls">GN/LS · calculated</label><output id="live-gnls" className={\`computed-value \${calculatedGnls !== null && calculatedGnls >= 0 ? 'positive' : calculatedGnls !== null ? 'negative' : ''}\`} data-testid="output-live-gnls">{formatGnls(calculatedGnls)}</output><span className="field-hint">From {previousYardLine}</span></div></div>`;
      if (oldGrid.test(code)) code = code.replace(oldGrid, newGrid);

      // Ensure the spreadsheet follows the same order.
      code = code.replace(
        /<th>Play<\/th><th>ODK<\/th><th>Down<\/th><th>Distance<\/th><th>Type<\/th><th>Call<\/th><th>Formation<\/th><th>Ball carrier<\/th><th>Yard line<\/th><th>GN\/LS<\/th><th>Result<\/th>/,
        '<th>Play</th><th>ODK</th><th>Down</th><th>Distance</th><th>Yard line</th><th>Formation</th><th>Play Call</th><th>Play Type</th><th>Ball carrier</th><th>Result</th><th>Defense</th><th>GN/LS</th>'
      );
      code = code.replace(
        /<td>\{editCell\(i, 'odk',[\s\S]*?<\/td><td><button/,
        (match) => {
          const button = '<td><button';
          const cellPrefix = `<td>{editCell(i, 'odk', play.odk, ['O', 'D', 'K'])}</td><td>{editCell(i, 'dn', play.dn, ['1', '2', '3', '4'])}</td><td>{editCell(i, 'dist', play.dist)}</td><td>{editCell(i, 'yardLn', play.yardLn)}</td><td>{editCell(i, 'form', play.form)}</td><td>{editCell(i, 'offPlay', play.offPlay)}</td><td>{editCell(i, 'type', play.type, ['Run', 'Pass'])}</td><td>{editCell(i, 'carrier', play.carrier)}</td><td>{editCell(i, 'result', play.result, ${resultOptionsSource})}</td><td>{editCell(i, 'defense', play.defense)}</td><td className={num(play.gnls) >= 0 ? 'gain-positive' : 'gain-negative'}>{formatGnls(num(play.gnls))}</td>`;
          return cellPrefix + button;
        }
      );

      return code === source ? null : { code, map: null };
    },
  };
}
