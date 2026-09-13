# Weatherford Kangaroos Scouting System - Reference

## Overview
This is a comprehensive Google Apps Script-based scouting system that tracks offensive formations, plays, and tendencies with drill-down analytics.

## Key Features

### 1. **Dashboard (refreshDashboard)**
- Multi-filter system: Formations, Personnel, Scheme, Yard Line, Down, Play Type, Backfield, Scheme, Motion, Play Direction, Hash Position
- Real-time metric calculations:
  - Total plays vs filtered plays
  - Run % / Pass %
  - Average gain per play
  - Success rate (converting based on down/distance)
  - Explosive play rate (12+ yards)
- Formation tendencies table (top 8)
- Play concept breakdown table (top 8)
- Color-coded highlights (green for run-heavy, blue for pass-heavy)

### 2. **Formation Detail Report (generateFormationDetailReport)**
- Select specific formation (or ALL)
- Optional field zone filter (Backed Up, Own Territory, Midfield, Red Zone, Goal Line)
- Three drill-down sections:
  1. **Formation Profile** - Overall stats for selected formation
  2. **Down & Distance Breakdown** - 8 situational breakdowns (1st & 10+, 1st & Short, 2nd & Long, etc.)
  3. **Field Position Breakdown** - How formation performs by yard line
- Metrics per section: Snaps, %Offense, Run%, Pass%, Avg Yards, Success%, Top Scheme, Top Run, Top Pass, Primary Backfield

### 3. **Multi-Formation Report (MultiFormationReport)**
- Checkboxes to select multiple formations (row 31+)
- Select All / Deselect All toggle (A30)
- Secondary filters: Backfield (B5), Motion (D5), Play Type (F5)
- **Verdict Banner** - Alerts if run-heavy (65%+), pass-heavy (65%+), or balanced
- **Backfield Tells** - Top 2 backfields with run/pass tendency and #1 call
- **Motion Tells** - Motion usage rate with comparison (with motion vs static)
- Combined profile table showing formations selected, snaps, run%, pass%, top backfields/schemes/plays
- Down & Distance breakdown for combined set

### 4. **Formation Play-by-Play (generatePlayByPlayReport)**
- Single formation selection (A5)
- Lists ALL plays for selected formation
- Columns: Play #, Down & Dist, Situation, Play Call, Type (Run/Pass), Direction, Gain, Scheme, Backfield, Motion, Hash/Field
- Color coding: Green for runs, Blue for passes, Yellow highlight for 12+ yard plays
- Alternating row colors for readability

### 5. **Reports Generation**
- **Formation Report** - Summary of all formations with tendencies
- **Lookup Lists** - Maintains clean dropdown lists from raw data
- **Checkboxes** - Automatically generates checkboxes with snap counts

### 6. **Google Slides Generation**
- Automated presentation creation with 10 slides:
  1. Cover slide with opponent, date, game plan notes
  2. Performance summary cards (6 key metrics)
  3. Top formation tendencies table
  4. Play concept breakdown table
  5. 1st Down tendencies
  6. 2nd Down tendencies
  7. 3rd Down tendencies
  8. Backfield & Motion usage
  9. Automated verdict banner
  10. Key explosive plays (12+)

## Data Structure (ALL INFO SHEET)

### Required Columns
- Column A: Opponent
- Column B: (spacing)
- Column C: Personnel (1RB, 2RB, etc.)
- Column D: Down
- Column E: Distance
- Column F: Yard Line
- Column G: Play Type (RUN/PASS)
- Column H: (calculated)
- Column I: Result/Effectiveness
- Column J: Gain/Loss (yards)
- Column K: Hash (L/M/R)
- Column L: Off Formation (Spread, Pistol, I-Form, etc.)
- Column M: Backfield (I-Set, Twins, etc.)
- Column N: Motion (Pre-snap motion type)
- Column O: (spacing)
- Column P: (spacing)
- Column Q: Scheme (Outside Zone, Under, etc.)
- Column R: Off Play / Play Call (name of specific play)
- Column S: Play Direction (STR = Strong, WK = Weak)

### Key Metrics Calculated
1. **Run Success Rate**: 1st Down (gain ≥ 4), 2nd Down (gain ≥ dist/2), 3rd Down (gain ≥ dist)
2. **Explosive Rate**: Plays with 12+ yard gains
3. **Field Position Zones**:
   - Backed Up (Own 1-10)
   - Own Territory (Own 11-39)
   - Midfield (Own 40 - Opp 40)
   - Red Zone (Opp 11-39)
   - Goal Line (Opp 1-10)

## Technical Approach
- Uses Google Sheets Data Validation for dropdowns
- onEdit() triggers for real-time recalculation
- Color-coding for visual pattern recognition
- Consolidated LOOKUPS tab for clean data lists
- Filter-first architecture (can toggle between filtered and all-plays baseline)

## Filtering Pattern
```
isAll() check → if contains "ALL", "-", empty, "SELECT" → treat as no filter
Apply all filters sequentially
Show baseline metrics alongside filtered metrics for comparison
```

## Color Scheme
- Royal Blue (#4169E1): Primary accent
- Navy (#1F4E78): Darker accents
- Green (#276A3C): Run-heavy indicators
- Light Gray (#F8F9FA): Alternating rows
- Yellow (#FFF2CC): Filter cells and highlights

## Key Insights
1. **Comparative Analytics**: Always shows both "ALL PLAYS" and "FILTERED PLAYS" metrics side-by-side
2. **Drill-Down Architecture**: Dashboard → Detail → Play-by-Play
3. **Visual Alerts**: Color-coded high-efficiency plays (70%+ run/pass bias)
4. **Automated Verdict**: System generates defensive recommendations based on tendency analysis
5. **Flexible Filtering**: 13+ independent filter dimensions across different tabs

