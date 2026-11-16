// IMAGE WARP - psychedelic mirror treatment
// Drop images into the "data" folder named img1.jpg, img2.jpg (optional img3.jpg)
// Uses the same dataset as image_blender
// Press SPACE to randomize all effects
// Press 's' to save
// Press 'm' to cycle mirror mode
// Press 'p' to adjust posterize levels
// Press 'c' to randomize channel offsets
// Press 'e' to toggle edge glow
// Press 'l' to toggle scan lines
// Press 'i' to cycle input image

int canvasW = 1080;
int canvasH = 1350;
int borderSize = 30;

PImage[] images;
int imageCount = 0;
int activeImage = 0;
PGraphics canvas;

// Effect params
int mirrorMode = 0;       // 0=left-to-right, 1=right-to-left, 2=top-to-bottom, 3=quad
String[] mirrorNames = {"L>R", "R>L", "T>B", "QUAD"};
int posterizeLevels = 4;  // how many color levels (2-8)
int channelOffX = 0;      // red channel horizontal shift
int channelOffY = 0;      // red channel vertical shift
int channelOff2X = 0;     // blue channel horizontal shift
int channelOff2Y = 0;     // blue channel vertical shift
boolean edgeGlow = true;
boolean scanLines = true;
int scanLineGap = 3;
float solarizeThreshold = 0.5;
boolean doSolarize = true;
float satBoost = 2.5;
float contrastMult = 1.8;
boolean doInvert = false;
int colorShiftHue = 0;    // hue rotation (0-255)

void setup() {
  size(1080, 1350);
  
  PImage img1 = loadImage("img1.jpg");
  PImage img2 = loadImage("img2.jpg");
  
  if (img1 == null || img1.width <= 0) {
    println("ERROR: Place at least img1.jpg in the data folder!");
    exit();
    return;
  }
  
  if (img2 != null && img2.width > 0) {
    PImage img3 = loadImage("img3.jpg");
    if (img3 != null && img3.width > 0) {
      images = new PImage[]{img1, img2, img3};
      imageCount = 3;
    } else {
      images = new PImage[]{img1, img2};
      imageCount = 2;
    }
  } else {
    images = new PImage[]{img1};
    imageCount = 1;
  }
  
  canvas = createGraphics(canvasW, canvasH);
  randomizeAll();
}

void draw() {
  background(0);
  renderEffect();
  image(canvas, 0, 0);
  
  fill(255);
  textSize(11);
  textAlign(LEFT);
  text("IMG: " + (activeImage + 1) + "/" + imageCount + "  |  MIRROR: " + mirrorNames[mirrorMode] + 
       "  |  POSTERIZE: " + posterizeLevels + "  |  EDGE: " + (edgeGlow ? "ON" : "OFF") + 
       "  |  SCANLINES: " + (scanLines ? "ON" : "OFF") + "  |  SOLARIZE: " + (doSolarize ? "ON" : "OFF"), 10, height - 10);
  text("[SPACE] randomize  [I] image  [M] mirror  [P] posterize  [C] channels  [E] edge  [L] scanlines  [S] save", 10, height - 25);
}

void renderEffect() {
  canvas.beginDraw();
  canvas.background(0);
  
  int bdr = borderSize;
  int innerW = canvasW - bdr * 2;
  int innerH = canvasH - bdr * 2;
  
  // Start with a cover-fitted copy of the active image
  PImage work = makeCover(images[activeImage], innerW, innerH);
  
  // 1. Boost contrast and saturation first
  work = adjustContrastSat(work, contrastMult, satBoost);
  
  // 2. Hue shift
  if (colorShiftHue != 0) {
    work = shiftHue(work, colorShiftHue);
  }
  
  // 3. Solarize
  if (doSolarize) {
    work = solarize(work, solarizeThreshold);
  }
  
  // 4. Posterize
  work = posterize(work, posterizeLevels);
  
  // 5. Mirror
  work = applyMirror(work, mirrorMode);
  
  // 6. Channel separation (shift R and B channels)
  work = channelShift(work, channelOffX, channelOffY, channelOff2X, channelOff2Y);
  
  // 7. Edge glow overlay
  if (edgeGlow) {
    work = addEdgeGlow(work);
  }
  
  // 8. Scan lines
  if (scanLines) {
    work = addScanLines(work, scanLineGap);
  }
  
  canvas.image(work, bdr, bdr);
  canvas.endDraw();
}

// --- EFFECT FUNCTIONS ---

PImage makeCover(PImage src, int targetW, int targetH) {
  float scaleX = (float) targetW / src.width;
  float scaleY = (float) targetH / src.height;
  float sc = max(scaleX, scaleY);
  int scaledW = ceil(src.width * sc);
  int scaledH = ceil(src.height * sc);
  PImage resized = src.copy();
  resized.resize(scaledW, scaledH);
  int cropX = (scaledW - targetW) / 2;
  int cropY = (scaledH - targetH) / 2;
  return resized.get(cropX, cropY, targetW, targetH);
}

PImage adjustContrastSat(PImage src, float contrast, float saturation) {
  PImage out = src.copy();
  out.loadPixels();
  colorMode(HSB, 255);
  for (int i = 0; i < out.pixels.length; i++) {
    float h = hue(out.pixels[i]);
    float s = saturation(out.pixels[i]);
    float b = brightness(out.pixels[i]);
    
    // Contrast: push brightness away from middle
    b = ((b / 255.0 - 0.5) * contrast + 0.5) * 255;
    b = constrain(b, 0, 255);
    
    // Saturation boost
    s = constrain(s * saturation, 0, 255);
    
    out.pixels[i] = color(h, s, b);
  }
  out.updatePixels();
  colorMode(RGB, 255);
  return out;
}

PImage shiftHue(PImage src, int shift) {
  PImage out = src.copy();
  out.loadPixels();
  colorMode(HSB, 255);
  for (int i = 0; i < out.pixels.length; i++) {
    float h = (hue(out.pixels[i]) + shift) % 256;
    float s = saturation(out.pixels[i]);
    float b = brightness(out.pixels[i]);
    out.pixels[i] = color(h, s, b);
  }
  out.updatePixels();
  colorMode(RGB, 255);
  return out;
}

PImage solarize(PImage src, float threshold) {
  PImage out = src.copy();
  out.loadPixels();
  for (int i = 0; i < out.pixels.length; i++) {
    float r = red(out.pixels[i]);
    float g = green(out.pixels[i]);
    float b = blue(out.pixels[i]);
    
    // Invert pixels above threshold
    if (r / 255.0 > threshold) r = 255 - r;
    if (g / 255.0 > threshold) g = 255 - g;
    if (b / 255.0 > threshold) b = 255 - b;
    
    out.pixels[i] = color(r, g, b);
  }
  out.updatePixels();
  return out;
}

PImage posterize(PImage src, int levels) {
  PImage out = src.copy();
  out.loadPixels();
  float step = 255.0 / (levels - 1);
  for (int i = 0; i < out.pixels.length; i++) {
    int r = int(round(red(out.pixels[i]) / step) * step);
    int g = int(round(green(out.pixels[i]) / step) * step);
    int b = int(round(blue(out.pixels[i]) / step) * step);
    out.pixels[i] = color(constrain(r, 0, 255), constrain(g, 0, 255), constrain(b, 0, 255));
  }
  out.updatePixels();
  return out;
}

PImage applyMirror(PImage src, int mode) {
  PImage out = src.copy();
  out.loadPixels();
  int w = out.width;
  int h = out.height;
  
  if (mode == 0) {
    // Left half mirrored to right
    for (int y = 0; y < h; y++) {
      for (int x = w / 2; x < w; x++) {
        out.pixels[y * w + x] = out.pixels[y * w + (w - 1 - x)];
      }
    }
  } else if (mode == 1) {
    // Right half mirrored to left
    for (int y = 0; y < h; y++) {
      for (int x = 0; x < w / 2; x++) {
        out.pixels[y * w + x] = out.pixels[y * w + (w - 1 - x)];
      }
    }
  } else if (mode == 2) {
    // Top half mirrored to bottom
    for (int y = h / 2; y < h; y++) {
      for (int x = 0; x < w; x++) {
        out.pixels[y * w + x] = out.pixels[(h - 1 - y) * w + x];
      }
    }
  } else if (mode == 3) {
    // Quad: top-left mirrored to all quadrants
    for (int y = 0; y < h; y++) {
      for (int x = 0; x < w; x++) {
        int srcX = (x < w / 2) ? x : (w - 1 - x);
        int srcY = (y < h / 2) ? y : (h - 1 - y);
        out.pixels[y * w + x] = out.pixels[srcY * w + srcX];
      }
    }
  }
  
  out.updatePixels();
  return out;
}

PImage channelShift(PImage src, int rOffX, int rOffY, int bOffX, int bOffY) {
  PImage out = createImage(src.width, src.height, RGB);
  src.loadPixels();
  out.loadPixels();
  int w = src.width;
  int h = src.height;
  
  for (int y = 0; y < h; y++) {
    for (int x = 0; x < w; x++) {
      // Red channel from offset position
      int rx = constrain(x + rOffX, 0, w - 1);
      int ry = constrain(y + rOffY, 0, h - 1);
      float r = red(src.pixels[ry * w + rx]);
      
      // Green from original position
      float g = green(src.pixels[y * w + x]);
      
      // Blue channel from offset position
      int bx = constrain(x + bOffX, 0, w - 1);
      int by = constrain(y + bOffY, 0, h - 1);
      float b = blue(src.pixels[by * w + bx]);
      
      out.pixels[y * w + x] = color(r, g, b);
    }
  }
  out.updatePixels();
  return out;
}

PImage addEdgeGlow(PImage src) {
  PImage out = src.copy();
  // Simple edge detection via brightness difference with neighbors
  src.loadPixels();
  out.loadPixels();
  int w = src.width;
  int h = src.height;
  
  for (int y = 1; y < h - 1; y++) {
    for (int x = 1; x < w - 1; x++) {
      float center = brightness(src.pixels[y * w + x]);
      float left = brightness(src.pixels[y * w + (x - 1)]);
      float right = brightness(src.pixels[y * w + (x + 1)]);
      float up = brightness(src.pixels[(y - 1) * w + x]);
      float down = brightness(src.pixels[(y + 1) * w + x]);
      
      float edge = abs(center - left) + abs(center - right) + abs(center - up) + abs(center - down);
      edge = constrain(edge * 0.8, 0, 255);
      
      if (edge > 30) {
        // Add colored glow on edges
        float r = red(out.pixels[y * w + x]);
        float g = green(out.pixels[y * w + x]);
        float b = blue(out.pixels[y * w + x]);
        
        // Tint edges toward neon
        r = constrain(r + edge * 0.4, 0, 255);
        b = constrain(b + edge * 0.6, 0, 255);
        
        out.pixels[y * w + x] = color(r, g, b);
      }
    }
  }
  out.updatePixels();
  return out;
}

PImage addScanLines(PImage src, int gap) {
  PImage out = src.copy();
  out.loadPixels();
  int w = out.width;
  int h = out.height;
  
  for (int y = 0; y < h; y++) {
    if (y % (gap + 1) == 0) {
      for (int x = 0; x < w; x++) {
        int idx = y * w + x;
        float r = red(out.pixels[idx]) * 0.3;
        float g = green(out.pixels[idx]) * 0.3;
        float b = blue(out.pixels[idx]) * 0.3;
        out.pixels[idx] = color(r, g, b);
      }
    }
  }
  out.updatePixels();
  return out;
}

// --- RANDOMIZE ---

void randomizeAll() {
  activeImage = int(random(imageCount));
  mirrorMode = int(random(4));
  posterizeLevels = int(random(2, 7));
  
  // Channel separation offsets
  channelOffX = int(random(-30, 30));
  channelOffY = int(random(-15, 15));
  channelOff2X = int(random(-30, 30));
  channelOff2Y = int(random(-15, 15));
  
  edgeGlow = random(1) > 0.3;
  scanLines = random(1) > 0.3;
  scanLineGap = int(random(2, 6));
  
  doSolarize = random(1) > 0.3;
  solarizeThreshold = random(0.3, 0.7);
  
  satBoost = random(1.5, 4.0);
  contrastMult = random(1.3, 2.5);
  
  colorShiftHue = int(random(256));
  doInvert = random(1) > 0.7;
}

void keyPressed() {
  if (key == ' ') randomizeAll();
  if (key == 'i' || key == 'I') {
    activeImage = (activeImage + 1) % imageCount;
  }
  if (key == 'm' || key == 'M') {
    mirrorMode = (mirrorMode + 1) % 4;
  }
  if (key == 'p' || key == 'P') {
    posterizeLevels++;
    if (posterizeLevels > 8) posterizeLevels = 2;
  }
  if (key == 'c' || key == 'C') {
    channelOffX = int(random(-30, 30));
    channelOffY = int(random(-15, 15));
    channelOff2X = int(random(-30, 30));
    channelOff2Y = int(random(-15, 15));
  }
  if (key == 'e' || key == 'E') {
    edgeGlow = !edgeGlow;
  }
  if (key == 'l' || key == 'L') {
    scanLines = !scanLines;
  }
  if (key == 'g' || key == 'G') {
    // Toggle solarize
    doSolarize = !doSolarize;
  }
  if (key == 's' || key == 'S') {
    String filename = "warp_" + year() + nf(month(), 2) + nf(day(), 2) + "_" + nf(hour(), 2) + nf(minute(), 2) + nf(second(), 2) + ".png";
    canvas.save(filename);
    println("Saved: " + filename);
  }
}
