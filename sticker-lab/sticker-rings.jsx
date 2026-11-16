/*
  STICKER RINGS — Illustrator script
  ----------------------------------
  Builds concentric offset-path rings behind the selected artwork,
  cycling through a palette. True vectors, round joins — the
  offset-sticker look, natively in Illustrator.

  INSTALL / RUN
    File → Scripts → Other Script…  → pick this file
    (or drop it in Presets/en_US/Scripts to get it in the menu permanently)

  USE
    1. Select artwork (paths, compound paths, groups, outlined text —
       for live text, outline it first: Type → Create Outlines).
    2. Run the script.
    3. Enter ring step (pt), ring count, and palette hexes.

  Each ring is a duplicate of your art with Illustrator's own
  "Offset Path" live effect applied (round joins), sent behind,
  and filled with the next palette color. Rings stay live — you can
  edit the offset amount later via the Appearance panel.
*/

(function () {
  if (app.documents.length === 0) {
    alert("Open a document first.");
    return;
  }
  var doc = app.activeDocument;
  var sel = doc.selection;
  if (!sel || sel.length === 0) {
    alert("Select some artwork first.\n(Outline live text: Type > Create Outlines)");
    return;
  }

  /* ---------- prompts ---------- */
  var step = parseFloat(prompt("Ring step (pt):", "10"));
  if (isNaN(step) || step <= 0) return;
  var count = parseInt(prompt("Ring count:", "5"), 10);
  if (isNaN(count) || count < 1) return;
  var palStr = prompt(
    "Palette (hex, comma separated — cycles per ring):",
    "05060f,2f6bff,ff5c9d",
  );
  if (!palStr) return;

  function hex2col(h) {
    h = h.replace(/[^0-9a-fA-F]/g, "");
    if (h.length === 3)
      h = h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2);
    var c = new RGBColor();
    c.red = parseInt(h.substring(0, 2), 16);
    c.green = parseInt(h.substring(2, 4), 16);
    c.blue = parseInt(h.substring(4, 6), 16);
    return c;
  }
  var pal = [];
  var parts = palStr.split(",");
  for (var i = 0; i < parts.length; i++) pal.push(hex2col(parts[i]));
  if (!pal.length) return;

  /* ---------- group the selection so rings duplicate as one unit ---------- */
  var srcGroup = doc.groupItems.add();
  srcGroup.name = "sticker source";
  for (var s = sel.length - 1; s >= 0; s--) {
    sel[s].move(srcGroup, ElementPlacement.PLACEATBEGINNING);
  }

  function recolor(item, col) {
    if (item.typename === "PathItem") {
      item.filled = true;
      item.fillColor = col;
      item.stroked = false;
    } else if (item.typename === "CompoundPathItem") {
      for (var i = 0; i < item.pathItems.length; i++) recolor(item.pathItems[i], col);
    } else if (item.typename === "GroupItem") {
      for (var i = 0; i < item.pageItems.length; i++) recolor(item.pageItems[i], col);
    } else if (item.typename === "TextFrame") {
      // live text: fill characters
      try {
        item.textRange.characterAttributes.fillColor = col;
      } catch (e) {}
    }
  }

  /* ---------- build rings, innermost first, each sent behind ---------- */
  var made = [];
  for (var k = 1; k <= count; k++) {
    var dup = srcGroup.duplicate(srcGroup, ElementPlacement.PLACEAFTER);
    dup.name = "ring " + k + " (+" + step * k + "pt)";
    recolor(dup, pal[(k - 1) % pal.length]);

    // Illustrator's own Offset Path live effect: ofst = distance,
    // jntp 2 = round join, mlim = miter limit
    var fx =
      '<LiveEffect name="Adobe Offset Path"><Dict data="R mlim 4 R ofst ' +
      step * k +
      ' I jntp 2 "/></LiveEffect>';
    try {
      dup.applyEffect(fx);
    } catch (e) {
      alert("Could not apply Offset Path effect: " + e);
      return;
    }
    // stacking: each bigger ring goes behind the previous
    dup.move(made.length ? made[made.length - 1] : srcGroup, ElementPlacement.PLACEAFTER);
    made.push(dup);
  }

  doc.selection = [srcGroup];
  app.redraw();
})();
