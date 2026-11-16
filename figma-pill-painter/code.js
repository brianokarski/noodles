// Pill Painter — main thread.
// Builds real Figma nodes from sampled groups: bars (rectangles),
// paths (vector strokes), or texts (real text nodes).

figma.showUI(__html__, { width: 1040, height: 760, title: "Pill Painter" });

const solid = (c, a) => ({
  type: "SOLID",
  color: { r: c.r, g: c.g, b: c.b },
  opacity: a === undefined ? 1 : a,
});

function styleForWeight(w) {
  if (w >= 800) return ["Black", "Heavy", "Bold"];
  if (w >= 700) return ["Bold"];
  if (w >= 600) return ["Semi Bold", "SemiBold", "Semibold", "Bold"];
  if (w >= 500) return ["Medium", "Regular"];
  if (w >= 300 && w < 400) return ["Light", "Regular"];
  if (w < 300) return ["Thin", "Ultralight", "Light", "Regular"];
  return ["Regular"];
}

async function loadTypeFont(fam, weight, italic) {
  let styles = styleForWeight(weight).concat(["Regular"]);
  if (italic) {
    const it = styles.map((s) =>
      s === "Regular" ? "Italic" : s + " Italic",
    );
    styles = it.concat(["Italic"]).concat(styles); // prefer italics, fall back to roman
  }
  const fams = [fam, "Helvetica Neue", "Inter", "Roboto"];
  for (const f of fams) {
    for (const s of styles) {
      try {
        await figma.loadFontAsync({ family: f, style: s });
        return { family: f, style: s };
      } catch (e) {
        /* keep trying */
      }
    }
  }
  await figma.loadFontAsync({ family: "Inter", style: "Regular" });
  return { family: "Inter", style: "Regular" };
}

async function build(msg) {
  const board = msg.board;
  const frame = figma.createFrame();
  frame.name = msg.name || "Pill Painter";
  frame.resize(board.w, board.h);
  frame.fills = [solid(msg.bg)];
  frame.clipsContent = true;

  let total = 0;
  let font = null;
  if (msg.font)
    font = await loadTypeFont(msg.font.fam, msg.font.weight, msg.font.italic);

  for (let gi = 0; gi < msg.groups.length; gi++) {
    const g = msg.groups[gi];
    const nodes = [];

    if (g.bars) {
      for (const b of g.bars) {
        const r = figma.createRectangle();
        r.name = b.n || "pill";
        r.resize(Math.max(0.01, b.w), Math.max(0.01, b.h));
        r.x = b.x - b.w / 2;
        r.y = b.y - b.h / 2;
        r.cornerRadius = Math.min(b.r, b.w / 2, b.h / 2);
        r.fills = [solid(b.c, b.a)];
        frame.appendChild(r);
        nodes.push(r);
      }
    }

    if (g.paths) {
      for (const p of g.paths) {
        const v = figma.createVector();
        v.name = "line";
        v.vectorPaths = [{ windingRule: "NONE", data: p.d }];
        v.strokes = [solid(g.stroke)];
        v.strokeWeight = Math.max(0.1, g.width);
        v.strokeCap = "ROUND";
        v.strokeJoin = "ROUND";
        v.fills = [];
        frame.appendChild(v);
        v.x = 0;
        v.y = 0;
        nodes.push(v);
      }
    }

    if (g.texts && font) {
      for (const t of g.texts) {
        const n = figma.createText();
        n.fontName = font;
        n.characters = t.str;
        n.fontSize = t.size || msg.font.size;
        n.letterSpacing = { value: msg.font.track, unit: "PIXELS" };
        n.textAutoResize = "WIDTH_AND_HEIGHT";
        n.fills = [solid(t.c)];
        frame.appendChild(n);
        n.x = t.x;
        n.y = t.y;
        nodes.push(n);
      }
    }

    total += nodes.length;
    if (nodes.length > 1) {
      const grp = figma.group(nodes, frame);
      grp.name = g.name || "group " + (gi + 1);
    }
  }

  return { frame, total };
}

figma.ui.onmessage = async (msg) => {
  if (msg.type === "close") {
    figma.closePlugin();
    return;
  }
  if (msg.type !== "insert") return;
  if (!msg.groups || !msg.groups.length) {
    figma.notify("Nothing to insert yet.");
    return;
  }

  const { frame, total } = await build(msg);

  const sel = figma.currentPage.selection[0];
  const canNest =
    sel &&
    "appendChild" in sel &&
    sel.type !== "INSTANCE" &&
    sel.type !== "COMPONENT_SET";

  if (canNest) {
    sel.appendChild(frame);
    frame.x = 0;
    frame.y = 0;
  } else {
    const c = figma.viewport.center;
    frame.x = Math.round(c.x - msg.board.w / 2);
    frame.y = Math.round(c.y - msg.board.h / 2);
    figma.currentPage.appendChild(frame);
  }

  figma.currentPage.selection = [frame];
  figma.viewport.scrollAndZoomIntoView([frame]);
  figma.notify("Inserted " + total + " nodes (" + msg.name + ")");
};
