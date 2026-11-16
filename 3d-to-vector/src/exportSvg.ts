/**
 * Turn the live SVGRenderer output into a clean, standalone .svg file.
 *
 * three's SVGRenderer appends an <svg> to the DOM but it can be missing the
 * xmlns / viewBox needed for the file to open correctly outside the browser
 * (Illustrator, Figma, etc). `normalizeSvgMarkup` is a pure string transform so
 * it's trivially testable; `downloadSvg` is the thin browser-only wrapper.
 */

const SVG_NS = "http://www.w3.org/2000/svg";

export interface SvgSize {
  width: number;
  height: number;
}

/**
 * Ensure the <svg> root carries xmlns + width/height + viewBox and an XML
 * prolog, so the markup is a valid standalone document. Idempotent-ish: an
 * existing viewBox is preserved, missing attributes are added.
 */
export function normalizeSvgMarkup(raw: string, size: SvgSize): string {
  const w = Math.max(1, Math.round(size.width));
  const h = Math.max(1, Math.round(size.height));

  const openMatch = raw.match(/<svg\b[^>]*>/i);
  if (!openMatch) {
    throw new Error("normalizeSvgMarkup: no <svg> element found in markup");
  }

  let openTag = openMatch[0];

  const ensureAttr = (tag: string, name: string, value: string): string => {
    const re = new RegExp(`\\s${name}\\s*=`, "i");
    if (re.test(tag)) return tag;
    return tag.replace(/<svg\b/i, `<svg ${name}="${value}"`);
  };

  openTag = ensureAttr(openTag, "xmlns", SVG_NS);
  openTag = ensureAttr(openTag, "width", String(w));
  openTag = ensureAttr(openTag, "height", String(h));
  openTag = ensureAttr(openTag, "viewBox", `0 0 ${w} ${h}`);

  const body = raw.replace(openMatch[0], openTag);
  return `<?xml version="1.0" encoding="UTF-8"?>\n${body}`;
}

/** Build a timestamp-free, filesystem-safe filename. */
export function svgFilename(shape: string): string {
  const safe = shape.replace(/[^a-z0-9_-]+/gi, "-").toLowerCase();
  return `${safe || "shape"}.svg`;
}

/** Trigger a browser download of the given SVG markup. Browser-only. */
export function downloadSvg(markup: string, filename: string): void {
  const blob = new Blob([markup], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
