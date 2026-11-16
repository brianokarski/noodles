// TYPE WARP - moiré line overlay on typography
// Dense parallel line layers at different angles overlaid on lined text
// creating optical moiré interference patterns
//
// Press SPACE to randomize
// Press 's' to save
// Press 't' to cycle text
// Press 'f' to cycle fonts
// Press 'p' to cycle palettes
// Press 'w' to increase warp
// Press 'n' to re-seed noise
// Press 'a' to nudge line angles (more/less moiré)
// Press 'g' to adjust line gap

int canvasW = 810;
int canvasH = 1080;

PGraphics canvas;

String[][] textPresets = {
  {"Death,", "Division", "and Denial", "as US", "Embassy", "Opens in", "Jerusalem"},
  {"The", "Future", "is not", "what it", "used", "to be"},
  {"Every", "thing", "is", "Design"},
  {"No", "More", "Rules"},
  {"We are", "all in", "the", "Gutter", "but some", "of us are", "looking", "at the", "Stars"}
};
int currentText = 0;

PFont[] fonts;
String[] fontNames;
int currentFont = 0;

// Palettes: bg, primary (text/lines), secondary (ribbon lines), accent
color[][] palettes = {
  {color(30, 50, 200),  color(230, 80, 150),  color(220, 160, 200), color(60, 30, 180)},
  {color(20, 20, 20),   color(255, 50, 20),   color(255, 180, 60),  color(100, 0, 0)},
  {color(240, 235, 220),color(25, 25, 25),    color(180, 40, 40),   color(100, 90, 80)},
  {color(60, 0, 80),    color(255, 100, 200), color(100, 200, 255), color(120, 0, 160)},
  {color(200, 50, 30),  color(255, 255, 255), color(255, 180, 140), color(150, 20, 10)},
  {color(10, 60, 40),   color(200, 255, 100), color(80, 200, 160),  color(0, 40, 25)}
};
int currentPalette = 0;

// Line pattern params
float textLineAngle = 0;       // angle of lines filling text (radians)
float textLineGap = 2.5;       // gap between text fill lines
float textLineWeight = 1.2;    // stroke weight of text lines

int numRibbons = 5;            // number of overlay ribbon strips
float[] ribbonX;               // x-center of each ribbon
float[] ribbonW;               // width of each ribbon
float[] ribbonLineAngle;       // angle of lines in each ribbon
float[] ribbonLineGap;         // line spacing in each ribbon
float[] ribbonLineWeight;
int[] ribbonColorIdx;          // 0=primary, 1=secondary, 2=accent
float[] ribbonAlpha;

// Warp (slit-scan on ribbons)
float warpAmt = 0.25;
float warpFreq = 0.008;
float warpSeed = 0;

// Extra line layers for moiré
int numOverlayLayers = 3;
float[] overlayAngle;
float[] overlayGap;
float[] overlayAlpha;
float[] overlayWeight;

void setup() {
  size(810, 1080);
  canvas = createGraphics(canvasW, canvasH);
  
  fonts = new PFont[3];
  fonts[0] = createFont("Georgia-Bold", 10);
  fonts[1] = createFont("Helvetica-Bold", 10);
  fonts[2] = createFont("Times-Bold", 10);
  fontNames = new String[]{"Georgia Bold", "Helvetica Bold", "Times Bold"};
  
  ribbonX = new float[20];
  ribbonW = new float[20];
  ribbonLineAngle = new float[20];
  ribbonLineGap = new float[20];
  ribbonLineWeight = new float[20];
  ribbonColorIdx = new int[20];
  ribbonAlpha = new float[20];
  
  overlayAngle = new float[10];
  overlayGap = new float[10];
  overlayAlpha = new float[10];
  overlayWeight = new float[10];
  
  warpSeed = random(1000);
  randomizeAll();
}

void draw() {
  background(80);
  renderPoster();
  image(canvas, 0, 0);
  
  fill(255);
  textFont(fonts[1]);
  textSize(11);
  textAlign(LEFT);
  text("RIBBONS: " + numRibbons + "  |  TEXT LINES: " + nf(textLineGap, 1, 1) + "px @ " + nf(degrees(textLineAngle), 1, 0) + "deg" +
       "  |  OVERLAYS: " + numOverlayLayers + "  |  WARP: " + nf(warpAmt, 1, 2), 10, height - 10);
  text("[SPACE] randomize  [T] text  [F] font  [P] palette  [W] warp  [N] noise  [A] angles  [G] gap  [S] save", 10, height - 25);
}

void renderPoster() {
  String[] lines = textPresets[currentText];
  color bgCol = palettes[currentPalette][0];
  color primaryCol = palettes[currentPalette][1];
  color secondaryCol = palettes[currentPalette][2];
  color accentCol = palettes[currentPalette][3];
  color[] ribbonColors = {primaryCol, secondaryCol, accentCol};
  
  // --- 1. Create text mask (white text on black) ---
  PGraphics textMask = createGraphics(canvasW, canvasH);
  textMask.beginDraw();
  textMask.background(0);
  textMask.fill(255);
  textMask.textFont(fonts[currentFont]);
  textMask.textAlign(LEFT, TOP);
  
  float margin = canvasW * 0.07;
  float usableH = canvasH - margin * 2 - 30;
  float lineH = usableH / lines.length;
  float fontSize = lineH * 0.88;
  textMask.textSize(fontSize);
  textMask.textLeading(lineH);
  
  for (int i = 0; i < lines.length; i++) {
    textMask.text(lines[i], margin, margin + i * lineH);
  }
  textMask.endDraw();
  
  // --- 2. Create line-filled text layer ---
  // Dense parallel lines, masked to the text shape
  PGraphics textLines = createGraphics(canvasW, canvasH);
  textLines.beginDraw();
  textLines.background(0, 0); // transparent
  drawLinePattern(textLines, textLineAngle, textLineGap, textLineWeight, primaryCol, 255);
  textLines.endDraw();
  
  // Mask: only keep lines where text exists
  PImage textLinesImg = textLines.get();
  PImage textMaskImg = textMask.get();
  textLinesImg.loadPixels();
  textMaskImg.loadPixels();
  for (int i = 0; i < textLinesImg.pixels.length; i++) {
    float maskVal = brightness(textMaskImg.pixels[i]) / 255.0;
    if (maskVal < 0.5) {
      textLinesImg.pixels[i] = color(0, 0);
    }
  }
  textLinesImg.updatePixels();
  
  // --- 3. Create ribbon strip layers with their own line patterns ---
  PGraphics[] ribbonLayers = new PGraphics[numRibbons];
  for (int r = 0; r < numRibbons; r++) {
    ribbonLayers[r] = createGraphics(canvasW, canvasH);
    ribbonLayers[r].beginDraw();
    ribbonLayers[r].background(0, 0);
    
    // Draw the line pattern for this ribbon
    color rCol = ribbonColors[ribbonColorIdx[r] % ribbonColors.length];
    drawLinePattern(ribbonLayers[r], ribbonLineAngle[r], ribbonLineGap[r], ribbonLineWeight[r], rCol, ribbonAlpha[r]);
    ribbonLayers[r].endDraw();
    
    // Mask to a vertical ribbon strip shape (with soft edges)
    PImage rImg = ribbonLayers[r].get();
    rImg.loadPixels();
    for (int y = 0; y < canvasH; y++) {
      // Apply slit-scan warp to the ribbon's Y position
      float n = noise(y * warpFreq + warpSeed + r * 7.7);
      float warpOffset = (n - 0.5) * 2.0 * warpAmt * canvasW * 0.4;
      float wave = sin(y * 0.012 + warpSeed + r * 3.3) * warpAmt * canvasW * 0.2;
      float cx = ribbonX[r] + warpOffset + wave;
      float hw = ribbonW[r] / 2.0;
      
      for (int x = 0; x < canvasW; x++) {
        int idx = y * canvasW + x;
        float dist = abs(x - cx);
        if (dist > hw) {
          rImg.pixels[idx] = color(0, 0);
        } else if (dist > hw * 0.7) {
          // Feathered edge
          float fade = map(dist, hw * 0.7, hw, 1, 0);
          fade = fade * fade;
          float a = alpha(rImg.pixels[idx]) * fade;
          rImg.pixels[idx] = color(red(rImg.pixels[idx]), green(rImg.pixels[idx]), blue(rImg.pixels[idx]), a);
        }
      }
    }
    rImg.updatePixels();
    ribbonLayers[r].beginDraw();
    ribbonLayers[r].clear();
    ribbonLayers[r].image(rImg, 0, 0);
    ribbonLayers[r].endDraw();
  }
  
  // --- 4. Create full-canvas overlay line layers for extra moiré ---
  PGraphics[] overlays = new PGraphics[numOverlayLayers];
  for (int o = 0; o < numOverlayLayers; o++) {
    overlays[o] = createGraphics(canvasW, canvasH);
    overlays[o].beginDraw();
    overlays[o].background(0, 0);
    color oCol = (o % 2 == 0) ? secondaryCol : primaryCol;
    drawLinePattern(overlays[o], overlayAngle[o], overlayGap[o], overlayWeight[o], oCol, overlayAlpha[o]);
    overlays[o].endDraw();
  }
  
  // --- 5. Composite everything ---
  canvas.beginDraw();
  canvas.background(bgCol);
  
  // Layer the text lines
  canvas.blendMode(BLEND);
  canvas.image(textLinesImg, 0, 0);
  
  // Layer each ribbon with EXCLUSION or MULTIPLY for moiré
  for (int r = 0; r < numRibbons; r++) {
    int bm = (r % 3 == 0) ? EXCLUSION : (r % 3 == 1) ? MULTIPLY : DIFFERENCE;
    canvas.blendMode(bm);
    canvas.image(ribbonLayers[r].get(), 0, 0);
  }
  
  // Layer the full-canvas overlays
  for (int o = 0; o < numOverlayLayers; o++) {
    int bm = (o % 2 == 0) ? EXCLUSION : SOFT_LIGHT;
    canvas.blendMode(bm);
    canvas.image(overlays[o].get(), 0, 0);
  }
  
  // Reset blend mode and add a final text layer on top (subtle, for legibility)
  canvas.blendMode(BLEND);
  
  // Small citation
  canvas.fill(primaryCol, 200);
  canvas.textFont(fonts[currentFont]);
  canvas.textSize(11);
  canvas.textAlign(LEFT);
  canvas.text("The Guardian, May 14, 2018", margin, canvasH - margin + 10);
  
  canvas.endDraw();
}

// Draw dense parallel lines across the full canvas at a given angle
void drawLinePattern(PGraphics pg, float angle, float gap, float weight, color col, float alpha) {
  pg.stroke(red(col), green(col), blue(col), alpha);
  pg.strokeWeight(weight);
  
  float cosA = cos(angle);
  float sinA = sin(angle);
  
  // We need enough lines to cover the canvas at any angle
  float diagonal = sqrt(canvasW * canvasW + canvasH * canvasH);
  int numLines = ceil(diagonal / gap) + 2;
  
  float cx = canvasW / 2.0;
  float cy = canvasH / 2.0;
  
  for (int i = -numLines / 2; i <= numLines / 2; i++) {
    float offset = i * gap;
    
    // Line perpendicular direction for offset
    float px = -sinA * offset;
    float py = cosA * offset;
    
    // Line endpoints along the line direction
    float x1 = cx + px + cosA * diagonal;
    float y1 = cy + py + sinA * diagonal;
    float x2 = cx + px - cosA * diagonal;
    float y2 = cy + py - sinA * diagonal;
    
    pg.line(x1, y1, x2, y2);
  }
}

void randomizeAll() {
  currentPalette = int(random(palettes.length));
  currentFont = int(random(fonts.length));
  
  // Text line params
  textLineAngle = random(-0.15, 0.15); // nearly horizontal
  textLineGap = random(1.8, 3.5);
  textLineWeight = random(0.8, 1.8);
  
  // Ribbon params
  numRibbons = int(random(3, 9));
  for (int r = 0; r < numRibbons; r++) {
    ribbonX[r] = random(canvasW * -0.05, canvasW * 1.05);
    ribbonW[r] = random(canvasW * 0.08, canvasW * 0.35);
    ribbonLineAngle[r] = random(-0.3, 0.3); // slight angle variation
    ribbonLineGap[r] = random(1.5, 4.0);
    ribbonLineWeight[r] = random(0.6, 1.8);
    ribbonColorIdx[r] = int(random(3));
    ribbonAlpha[r] = random(120, 230);
  }
  
  // Warp
  warpAmt = random(0.2, 0.5);
  warpFreq = random(0.005, 0.02);
  warpSeed = random(1000);
  
  // Extra overlay layers
  numOverlayLayers = int(random(2, 5));
  for (int o = 0; o < numOverlayLayers; o++) {
    overlayAngle[o] = random(-0.25, 0.25);
    overlayGap[o] = random(2.0, 5.0);
    overlayAlpha[o] = random(30, 90);
    overlayWeight[o] = random(0.5, 1.5);
  }
}

void keyPressed() {
  if (key == ' ') randomizeAll();
  if (key == 't' || key == 'T') {
    currentText = (currentText + 1) % textPresets.length;
  }
  if (key == 'f' || key == 'F') {
    currentFont = (currentFont + 1) % fonts.length;
  }
  if (key == 'p' || key == 'P') {
    currentPalette = (currentPalette + 1) % palettes.length;
  }
  if (key == 'w' || key == 'W') {
    warpAmt += 0.05;
    if (warpAmt > 0.7) warpAmt = 0.1;
  }
  if (key == 'n' || key == 'N') {
    warpSeed = random(1000);
  }
  if (key == 'a' || key == 'A') {
    // Nudge all angles slightly — changes moiré pattern
    for (int r = 0; r < numRibbons; r++) {
      ribbonLineAngle[r] += 0.02;
    }
    for (int o = 0; o < numOverlayLayers; o++) {
      overlayAngle[o] += 0.02;
    }
  }
  if (key == 'g' || key == 'G') {
    textLineGap += 0.3;
    if (textLineGap > 5) textLineGap = 1.5;
  }
  if (key == 's' || key == 'S') {
    String filename = "typewarp_" + year() + nf(month(), 2) + nf(day(), 2) + "_" + nf(hour(), 2) + nf(minute(), 2) + nf(second(), 2) + ".png";
    canvas.save(filename);
    println("Saved: " + filename);
  }
}
