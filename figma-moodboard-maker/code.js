figma.showUI(__html__, { width: 320, height: 440, title: 'Moodboard Arranger' });

// ─── Scan selection for image nodes ──────────────────────────────────────────

function getImageNodes(nodes) {
  const result = [];

  function scan(node) {
    if ('fills' in node && Array.isArray(node.fills)) {
      const fill = node.fills.find(f => f.type === 'IMAGE' && f.imageHash);
      if (fill) {
        result.push({
          id: node.id,
          name: node.name,
          width: node.width,
          height: node.height,
          imageHash: fill.imageHash,
        });
        return; // don't recurse into children of an image node
      }
    }
    if ('children' in node) {
      for (const child of node.children) scan(child);
    }
  }

  for (const node of nodes) scan(node);
  return result;
}

function scanAndSend() {
  const nodes = getImageNodes(figma.currentPage.selection);
  figma.ui.postMessage({ type: 'images-found', images: nodes });
}

// Send initial scan
scanAndSend();

// ─── Layout algorithm ─────────────────────────────────────────────────────────
// Masonry that fits the board: colW fills the full width, vGap is auto-solved
// via binary search so the tallest column lands exactly at the bottom margin.

function computeLayout(images, margin, hGap, vGap, numCols) {
  const availW = 1920 - 2 * margin;
  const availH = 1080 - 2 * margin;

  if (images.length === 0) return [];

  const cols = Math.max(1, Math.min(numCols || 3, images.length));
  const colW = (availW - (cols - 1) * hGap) / cols;

  // Run masonry with a given gap, return assignments + tallest column height
  function tryGap(gap) {
    var colY = [];
    for (var i = 0; i < cols; i++) colY.push(0);
    var asgn = [];
    for (var j = 0; j < images.length; j++) {
      var img = images[j];
      var minCol = 0;
      for (var c = 1; c < cols; c++) {
        if (colY[c] < colY[minCol]) minCol = c;
      }
      var h = colW * (img.height / img.width);
      asgn.push({ col: minCol, relY: colY[minCol], h: h });
      colY[minCol] += h + gap;
    }
    var maxH = 0;
    for (var i = 0; i < cols; i++) {
      var ch = colY[i] > 0 ? colY[i] - gap : 0;
      if (ch > maxH) maxH = ch;
    }
    return { asgn: asgn, maxH: maxH };
  }

  var result, actualGap;

  var baseline = tryGap(0);
  if (baseline.maxH >= availH) {
    // Images alone already overflow — scale heights down, no gap
    actualGap = 0;
    var scale = availH / baseline.maxH;
    result = baseline.asgn;
    for (var i = 0; i < result.length; i++) {
      result[i].h *= scale;
      result[i].relY *= scale;
    }
  } else {
    // Binary search for the gap that fills the height exactly
    var lo = 0, hi = availH;
    for (var iter = 0; iter < 60; iter++) {
      var mid = (lo + hi) / 2;
      if (tryGap(mid).maxH < availH) lo = mid; else hi = mid;
    }
    actualGap = (lo + hi) / 2;
    result = tryGap(actualGap).asgn;
  }

  // Build final positions
  var positions = [];
  for (var j = 0; j < result.length; j++) {
    var a = result[j];
    positions.push({
      x: margin + a.col * (colW + hGap),
      y: margin + a.relY,
      width: colW,
      height: a.h,
      index: images[j].index
    });
  }
  return positions;
}

// ─── Message handler ──────────────────────────────────────────────────────────

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'refresh') {
    scanAndSend();
    return;
  }

  if (msg.type === 'arrange') {
    const { margin, hGap, vGap, bgColor, numCols } = msg;

    // Re-scan at arrange time
    const raw = getImageNodes(figma.currentPage.selection);
    if (raw.length === 0) {
      figma.ui.postMessage({ type: 'error', message: 'Select image nodes first.' });
      return;
    }

    // Tag each with its array index for layout
    const images = raw.map((img, i) => Object.assign({}, img, { index: i }));

    figma.ui.postMessage({ type: 'status', message: `Arranging ${images.length} images…` });

    // Create 1920×1080 frame
    const frame = figma.createFrame();
    frame.name = 'Moodboard';
    frame.resize(1920, 1080);
    frame.clipsContent = true;
    frame.fills = [{ type: 'SOLID', color: hexToRgb(bgColor || '#ffffff') }];

    const positions = computeLayout(images, margin, hGap, vGap, numCols);

    for (const pos of positions) {
      const img = images[pos.index];
      const rect = figma.createRectangle();
      rect.name = img.name;
      rect.x = Math.round(pos.x);
      rect.y = Math.round(pos.y);
      rect.resize(Math.round(pos.width), Math.round(pos.height));
      rect.fills = [{
        type: 'IMAGE',
        scaleMode: 'FIT', // no cropping — image fits within its rect
        imageHash: img.imageHash,
      }];
      frame.appendChild(rect);
    }

    figma.viewport.scrollAndZoomIntoView([frame]);
    figma.ui.postMessage({ type: 'done', count: positions.length });
  }

  if (msg.type === 'close') {
    figma.closePlugin();
  }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hexToRgb(hex) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r
    ? { r: parseInt(r[1], 16) / 255, g: parseInt(r[2], 16) / 255, b: parseInt(r[3], 16) / 255 }
    : { r: 1, g: 1, b: 1 };
}
