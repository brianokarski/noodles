import { describe, it, expect } from "vitest";
import { normalizeSvgMarkup, svgFilename } from "./exportSvg";

describe("normalizeSvgMarkup", () => {
  it("adds xmlns, dimensions and viewBox to a bare svg", () => {
    const out = normalizeSvgMarkup("<svg><path d='M0 0'/></svg>", {
      width: 400,
      height: 300,
    });
    expect(out).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(out).toContain('width="400"');
    expect(out).toContain('height="300"');
    expect(out).toContain('viewBox="0 0 400 300"');
    expect(out.startsWith("<?xml")).toBe(true);
    expect(out).toContain("<path");
  });

  it("does not duplicate attributes that already exist", () => {
    const raw =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect/></svg>';
    const out = normalizeSvgMarkup(raw, { width: 999, height: 999 });
    expect(out.match(/xmlns=/g)?.length).toBe(1);
    expect(out.match(/viewBox=/g)?.length).toBe(1);
    // existing viewBox is preserved, not overwritten
    expect(out).toContain('viewBox="0 0 10 10"');
  });

  it("rounds fractional sizes and floors at 1", () => {
    const out = normalizeSvgMarkup("<svg></svg>", { width: 12.6, height: 0 });
    expect(out).toContain('width="13"');
    expect(out).toContain('height="1"');
  });

  it("throws when there is no svg element", () => {
    expect(() => normalizeSvgMarkup("<div></div>", { width: 1, height: 1 })).toThrow();
  });
});

describe("svgFilename", () => {
  it("makes a safe filename from a shape name", () => {
    expect(svgFilename("Shopping bag")).toBe("shopping-bag.svg");
    expect(svgFilename("box")).toBe("box.svg");
    expect(svgFilename("")).toBe("shape.svg");
  });
});
