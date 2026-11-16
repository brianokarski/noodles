// IMAGE BLENDER - feathered oval collage maker
// Drop 2-3 images into the "data" folder named img1.jpg, img2.jpg, img3.jpg
// Press SPACE to randomize
// Press 's' to save
// Press 'f' to change feather softness
// Press 'g' to toggle grain
// Press 'b' to cycle border

int canvasW = 1080;
int canvasH = 1350;
int borderSize = 40;

PImage[] images;
int imageCount = 0;
PGraphics canvas;
PImage[] coverLayers;

// Each blob mask is a randomized ellipse
int MAX_BLOBS = 6;
float[] blobCX, blobCY;   // center
float[] blobRX, blobRY;   // radii (oval shape)
float[] blobAngle;         // rotation
int[] blobImage;           // which image index this blob reveals
float featherAmt = 0.12;
boolean applyGrain = true;
int borderStyle = 0;
int numBlobs = 3;

void setup() {
  size(1080, 1350);
  
  PImage img1 = loadImage("img1.jpg");
  PImage img2 = loadImage("img2.jpg");
  
  if (img1 == null || img2 == null || img1.width <= 0 || img2.width <= 0) {
    println("ERROR: Place img1.jpg and img2.jpg in the data folder!");
    exit();
    return;
  }
  
  PImage img3 = loadImage("img3.jpg");
  if (img3 != null && img3.width > 0) {
    images = new PImage[]{img1, img2, img3};
    imageCount = 3;
  } else {
    images = new PImage[]{img1, img2};
    imageCount = 2;
  }
  
  canvas = createGraphics(canvasW, canvasH);
  
  int innerW = canvasW - borderSize * 2;
  int innerH = canvasH - borderSize * 2;
  coverLayers = new PImage[imageCount];
  for (int i = 0; i < imageCount; i++) {
    coverLayers[i] = makeCover(images[i], innerW, innerH);
  }
  
  blobCX = new float[MAX_BLOBS];
  blobCY = new float[MAX_BLOBS];
  blobRX = new float[MAX_BLOBS];
  blobRY = new float[MAX_BLOBS];
  blobAngle = new float[MAX_BLOBS];
  blobImage = new int[MAX_BLOBS];
  
  randomizeAll();
}

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

void draw() {
  background(0);
  renderCollage();
  image(canvas, 0, 0);
  
  fill(255);
  textSize(11);
  textAlign(LEFT);
  text("BLOBS: " + numBlobs + "  |  FEATHER: " + nf(featherAmt, 1, 2) + 
       "  |  GRAIN: " + (applyGrain ? "ON" : "OFF"), 10, height - 10);
  text("[SPACE] randomize  [F] feather  [G] grain  [B] border  [S] save", 10, height - 25);
}

void renderCollage() {
  canvas.beginDraw();
  
  if (borderStyle == 0) canvas.background(0);
  else if (borderStyle == 1) canvas.background(255);
  else canvas.background(20);
  
  int bdr = borderSize;
  int innerW = canvasW - bdr * 2;
  int innerH = canvasH - bdr * 2;
  
  PImage result = compositeBlobs(innerW, innerH);
  
  if (applyGrain) {
    result.loadPixels();
    for (int i = 0; i < result.pixels.length; i++) {
      float grain = random(-18, 18);
      int r = constrain(int(red(result.pixels[i]) + grain), 0, 255);
      int g = constrain(int(green(result.pixels[i]) + grain), 0, 255);
      int b = constrain(int(blue(result.pixels[i]) + grain), 0, 255);
      result.pixels[i] = color(r, g, b);
    }
    result.updatePixels();
  }
  
  canvas.image(result, bdr, bdr);
  canvas.endDraw();
}

PImage compositeBlobs(int w, int h) {
  // Start with image 0 as the base
  PImage out = coverLayers[0].copy();
  out.loadPixels();
  
  // For each blob, blend in the blob's assigned image using an elliptical feathered mask
  for (int b = 0; b < numBlobs; b++) {
    PImage layer = coverLayers[blobImage[b]];
    layer.loadPixels();
    
    float cx = blobCX[b];
    float cy = blobCY[b];
    float rx = blobRX[b];
    float ry = blobRY[b];
    float angle = blobAngle[b];
    float cosA = cos(-angle);
    float sinA = sin(-angle);
    
    // Feather zone: from (1 - featherAmt) to 1.0 of the ellipse radius
    float innerEdge = 1.0 - featherAmt;
    
    // Only iterate over bounding box of the blob for speed
    float maxR = max(rx, ry);
    int x0 = max(0, (int)(cx - maxR - 2));
    int y0 = max(0, (int)(cy - maxR - 2));
    int x1 = min(w - 1, (int)(cx + maxR + 2));
    int y1 = min(h - 1, (int)(cy + maxR + 2));
    
    for (int y = y0; y <= y1; y++) {
      for (int x = x0; x <= x1; x++) {
        // Transform point into ellipse's local rotated space
        float dx = x - cx;
        float dy = y - cy;
        float lx = dx * cosA - dy * sinA;
        float ly = dx * sinA + dy * cosA;
        
        // Normalized distance from center (1.0 = on the ellipse edge)
        float d = sqrt((lx * lx) / (rx * rx) + (ly * ly) / (ry * ry));
        
        if (d < 1.0) {
          // Inside the ellipse — compute blend factor
          float t;
          if (d < innerEdge) {
            t = 1.0; // fully this blob's image
          } else {
            // Feather zone
            t = map(d, innerEdge, 1.0, 1.0, 0.0);
            t = t * t * (3 - 2 * t); // smoothstep
          }
          
          int idx = y * w + x;
          color cBase = out.pixels[idx];
          color cBlob = layer.pixels[idx];
          
          out.pixels[idx] = color(
            lerp(red(cBase), red(cBlob), t),
            lerp(green(cBase), green(cBlob), t),
            lerp(blue(cBase), blue(cBlob), t)
          );
        }
      }
    }
  }
  
  out.updatePixels();
  return out;
}

void randomizeAll() {
  int innerW = canvasW - borderSize * 2;
  int innerH = canvasH - borderSize * 2;
  
  numBlobs = int(random(2, MAX_BLOBS + 1));
  featherAmt = random(0.08, 0.35);
  applyGrain = random(1) > 0.25;
  borderStyle = random(1) > 0.75 ? 1 : 0;
  
  for (int i = 0; i < numBlobs; i++) {
    // Center can be anywhere on the canvas (including partially off-edge)
    blobCX[i] = random(-innerW * 0.1, innerW * 1.1);
    blobCY[i] = random(-innerH * 0.1, innerH * 1.1);
    
    // Random oval size — big enough to be visible, varied aspect ratios
    float baseSize = random(0.25, 0.7) * min(innerW, innerH);
    float aspect = random(0.4, 1.6); // how oval-ish (1 = circle)
    blobRX[i] = baseSize * aspect;
    blobRY[i] = baseSize / aspect;
    
    // Random rotation
    blobAngle[i] = random(TWO_PI);
    
    // Assign to a non-base image (so blobs always reveal something different from the base)
    if (imageCount == 2) {
      blobImage[i] = 1;
    } else {
      // Mix of image 1 and 2 over the base (image 0)
      blobImage[i] = int(random(1, imageCount));
    }
  }
  
  // Occasionally let a blob use the base image too for layering variety
  if (numBlobs > 2 && random(1) > 0.5) {
    blobImage[int(random(numBlobs))] = 0;
  }
}

void keyPressed() {
  if (key == ' ') randomizeAll();
  if (key == 'f' || key == 'F') {
    featherAmt += 0.04;
    if (featherAmt > 0.5) featherAmt = 0.05;
  }
  if (key == 'g' || key == 'G') {
    applyGrain = !applyGrain;
  }
  if (key == 'b' || key == 'B') {
    borderStyle = (borderStyle + 1) % 3;
  }
  if (key == 's' || key == 'S') {
    String filename = "collage_" + year() + nf(month(), 2) + nf(day(), 2) + "_" + nf(hour(), 2) + nf(minute(), 2) + nf(second(), 2) + ".png";
    canvas.save(filename);
    println("Saved: " + filename);
  }
}
