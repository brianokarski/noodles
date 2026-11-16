# RoboFont Curve Tools 🩺

Scripts to help you draw better bezier curves in RoboFont.

## Scripts

### CurveDoctor.py
A full-featured curve analysis tool with visual overlays and quick-fix buttons.

**Features:**
- **Curvature comb** — Visualizes curve tension and flow
- **Inflection detection** — Red diamonds mark where curves change direction incorrectly
- **Handle alignment** — Orange warnings on smooth points with misaligned BCPs
- **Handle ratios** — Shows handle length as % of chord length

**Usage:**
1. Open in RoboFont (Script → Open Script or drag to Scripts folder)
2. Run the script — a floating panel appears
3. Click "Enable Curve Doctor" to activate overlays
4. Toggle visualization options as needed
5. Use "Quick Fixes" buttons to auto-correct issues

### CurveAnalysis.py
A lightweight script that prints a diagnostic report to the Output window.

**Usage:**
1. Select a glyph in the editor
2. Run the script
3. Check the Output window for the report

**Example output:**
```
==================================================
  CURVE ANALYSIS: /a
==================================================

📊 Summary:
   Total curve segments: 8
   Inflection points:    1
   Misaligned handles:   2
   Short handles (<10%): 0
   Long handles (>60%):  0

⚠️  Issues (3):

   🔴 [contour 0, segment 2 @ (245, 380)]
      Inflection point at t=0.45

   🟡 [contour 0 @ (180, 500)]
      Handle misalignment: 4.2°
```

## Curve Drawing Tips

### Ideal Handle Ratios
- **Quarter circles**: ~33% of chord length
- **Shallow curves**: 20-25%
- **Tight curves**: 35-45%
- Handles should rarely exceed 55%

### Avoiding Inflections
Inflection points (where curvature changes from convex to concave) usually indicate:
- A curve that should be split into two segments
- BCPs that crossed over each other
- An attempt to make one curve do too much

### Handle Alignment
At smooth points, both handles should be exactly collinear (180° apart). Even 2-3° of misalignment creates visible kinks at high resolutions.

## Installation

Copy these scripts to your RoboFont Scripts folder:
```
~/Library/Application Support/RoboFont/scripts/
```

Or run directly from the Script menu.

## Requirements
- RoboFont 4.x
- Uses: `mojo.subscriber`, `mojo.UI`, `vanilla`

