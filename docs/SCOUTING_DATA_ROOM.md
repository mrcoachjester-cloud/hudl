# Scouting Data Room

Scouting imports are stored separately from Live Game data. Scout files are organized by opponent and are intended to feed the Scouting and Reports views.

## Data Room input flow

1. Select the opponent/team from the schedule.
2. Select an existing Scout File or create a new Scout File.
3. Give a new Scout File a name when creating one.
4. Upload the Hudl CSV into the selected Scout File.
5. Keep Live Game data attached to the scheduled game; scouting data must not replace or move the live-game dataset.

This separation preserves the existing Supabase scouting-session structure and keeps weekly opponent scouting independent from game-night live data.
