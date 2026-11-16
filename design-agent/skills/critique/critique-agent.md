# Design Critique Agent

> A second-pass review agent that screenshots every frame in a Figma file, compares against reference images and design principles, flags visual issues, and applies fixes via the Figma Plugin API.

---

## Trigger

User says **"critique"**, **"cleanup"**, **"second pass"**, **"review"**, or **"QA"** and provides a Figma file URL.

Extract the `fileKey` and `nodeId` from the URL before proceeding.

---

## Step 0: Load Principles (MANDATORY FIRST STEP)

Read all five principles files. Do not skip any. These are the source of truth.

1. Read `./typography/principles.md`
2. Read `./layout/principles.md`
3. Read `./color/principles.md`
4. Read `./component-patterns/principles.md`
5. Read `./deck-design/principles.md`

Internalize these before looking at any frames.

---

## Step 1: Load Reference Images

Copy the reference images from the swiss layout directory to `/tmp/` so they can be read easily:

```bash
cp "./layout/swiss layout/"* /tmp/swiss-ref/
```

Read each image in `/tmp/swiss-ref/` using the Read tool. These are the visual north star. Every design decision should feel like it belongs in this family.

---

## Step 2: Screenshot Every Frame (BEFORE State)

Use `get_metadata` on the root node (`0:1`) with the `fileKey` to get the full page/frame structure.

Then use `get_screenshot` on **every top-level frame** (each slide). Save or note each screenshot — these are the BEFORE state.

Also look for a frame named **"Brian"** or **"Reference"** in the file. If one exists, screenshot it separately and treat it as the authoritative spec. Brian's reference frame defines the exact values to match.

### Known specs from Brian's reference frame (use when available):
| Element | Spec |
|---------|------|
| Display type size | 587px |
| TOC / Table of Contents | 16px |
| Section title size | 156px |
| Footer text | 24px Courier New |
| Side margins | 21.5px |
| Font weight (all text) | Regular (400) — NOT Bold, NOT Black |
| Letter-spacing on display | Negative (tight) |

---

## Step 3: Critique Each Frame

Go through every frame and run the full checklist below. Be **brutally honest**. Flag everything that looks off, even if it's subtle. Subtle inconsistencies compound into an amateur-looking result.

---

### A. Typography Checks

#### A1. Letter-spacing / Tracking
- [ ] **Display type (>100px):** Must have negative tracking. If tracking is 0 or positive, flag it. The larger the type, the tighter the tracking. Rule of thumb: roughly -1px per 20px of font size.
- [ ] **Section labels / small caps (<16px, uppercase):** Must have wide tracking (4-8px letter-spacing). If tracking is default or tight, flag it.
- [ ] **Body text (16-24px):** Should be at or near default tracking (0). If tracking is noticeably loose or tight, flag it.

#### A2. Line-height / Leading
- [ ] Display type: Line-height should be tight (0.85-1.0x). If it's at 1.2x+ on a massive headline, flag it — the leading will look like a canyon.
- [ ] Body text: Line-height should be comfortable (1.5-1.7x). If it's below 1.3x or above 2.0x, flag it.
- [ ] Check that line-height creates consistent "grey value" across text blocks. Squint test: does any block look lighter or darker than it should?

#### A3. Font Weight
- [ ] Compare against the reference frame. If the reference uses **Regular (400)**, every text element must also be Regular. Flag any Bold, Black, Medium, or Light weights that don't match.
- [ ] Exception: Ghost numbers may use Bold at very low opacity. Verify against component-patterns principles.

#### A4. Font Size Consistency
- [ ] Catalog every text element and its font size across all frames.
- [ ] Each hierarchy level (display, section title, body, footer, TOC, labels) must use the **exact same size** on every slide. If slide 3's headline is 587px and slide 7's is 580px, flag it.
- [ ] Check for **rogue sizes** — any size that doesn't fit into the established scale. There should be 4-6 sizes max.

#### A5. Size Distinction
- [ ] Are any two hierarchy levels too close in size? The difference between levels must be **obvious at a glance**. If the section title is 156px and the subtitle is 140px, that's too close — flag it.
- [ ] Follow the principle: "Make distinctions obvious or don't make them."

---

### B. Layout Checks

#### B1. Rules / Lines
- [ ] Are horizontal rules truly **full-width** (edge to edge of content area, or edge to edge of frame)? Measure them. If a rule stops short by even 10px, flag it.
- [ ] Rules should be 1px, at 15-20% white/grey. If they're thicker or the wrong value, flag it.

#### B2. Grid Alignment
- [ ] Are all elements aligned to a consistent left margin across all slides? Measure the x-position of left-aligned text on each slide. They must match exactly.
- [ ] Are right margins consistent where applicable?
- [ ] Do content blocks snap to the same vertical positions across slides?

#### B3. Fixed Component Positions
This is critical. These elements must be in the **exact same pixel position** on every slide:
- [ ] **Footer:** Same y-position, same x-position, same font, same size, same color on every slide.
- [ ] **TOC / Table of Contents:** If present, identical position on every slide where it appears.
- [ ] **Section labels:** Consistent position in the header zone.
- [ ] **Page numbers:** Same corner, same offset on every page.
- [ ] **Rules/dividers:** If a rule separates the footer, it must be at the same y on every slide.

Use `use_figma` to read the exact x, y, width, height of these elements across frames. If any differ by more than 1px, flag it.

#### B4. Text Overflow
- [ ] Is any text clipping its frame? Check if text node height exceeds or tightly matches its container.
- [ ] Is any text being cut off or truncated?
- [ ] Are any text frames set to "Fixed" height when they should be "Auto" (or vice versa)?

#### B5. Margins
- [ ] Left/right margins should match the reference (21.5px from Brian's frame, or 80px per deck-design principles — use whichever the current file follows).
- [ ] Margins must be **identical** on every slide. Measure the leftmost element on each slide and compare.

---

### C. Spacing Checks

#### C1. White Space Between Zones
- [ ] Is there enough breathing room between the header zone, content zone, and footer zone?
- [ ] Does the spacing match the three-zone structure from the principles? Header (y: 0-120), Content (y: 120-1000), Footer (y: 1040-1080) — or whatever the file's grid system is.

#### C2. Zone Proportions
- [ ] Is the display/headline zone taking up the right amount of space relative to the content and section title zones?
- [ ] Compare proportions against the reference images. The display zone should dominate.

#### C3. Spacing Consistency
- [ ] Is the gap between the headline and the first content element consistent across slides?
- [ ] Is the gap between content elements (e.g., between stat blocks, between cards) consistent?
- [ ] Are spacing values on the mathematical scale (4, 8, 16, 24, 32, 48, 64, 96, 128)?

---

### D. Color Checks

#### D1. Text Color
- [ ] Is all primary text the same near-black or off-white value? Check the exact hex/rgb of every text element. If some text is #1A1A1A and other text is #333333, flag it — pick one.
- [ ] Are there any random greys that don't fit the established grey scale? Every grey must have a purpose (metadata, secondary text, etc.) and match the scale from color principles.

#### D2. Rule / Line Color
- [ ] Are rules/dividers at the correct grey value (15-20% white on dark, or 15-20% grey on light)?
- [ ] Are all rules the same color? If one rule is #333 and another is #444, flag it.

#### D3. Background
- [ ] Is the background consistently near-black (rgb 5,5,5) or near-white across all slides? No pure #000000 or #FFFFFF.
- [ ] If the deck is dark mode, verify all backgrounds match exactly.

#### D4. Accent Color
- [ ] If an accent color is used, is it the **same hue** everywhere?
- [ ] Does accent color occupy <15% of surface area per slide?

---

### E. System Consistency Checks

#### E1. Fixed vs. Variable Elements
- [ ] Fixed components (footer, TOC, section label, rules) must be **pixel-identical** across all slides. Use `use_figma` to compare properties programmatically.
- [ ] Variable elements (headlines, body content) should actually vary in content and potentially in vertical placement — but never in style (same font, same weight, same tracking).

#### E2. Type Scale Integrity
- [ ] List every unique font size used in the file. There should be 4-6 max.
- [ ] If there are more, identify the rogues and determine which established size they should snap to.
- [ ] The scale should have **clear jumps** between levels, not a smooth gradient of sizes.

#### E3. Component Patterns
- [ ] Do stat blocks match the component-patterns spec? (Divider above, value left, label offset right.)
- [ ] Do cards match? (Dark fill, 1px stroke, sharp corners, 32px internal padding.)
- [ ] Does the footer match? (Thin rule, brand + section ID, 11px, wide tracking, 30% grey.)

---

## Step 4: Generate Fix List

After completing the full critique, produce a structured fix list:

```
## Fix List

### Critical (breaks the system)
1. [Frame name] — [Issue] — [Current value] -> [Target value]

### Major (noticeable inconsistency)
1. [Frame name] — [Issue] — [Current value] -> [Target value]

### Minor (polish)
1. [Frame name] — [Issue] — [Current value] -> [Target value]
```

For each fix, write the specific `use_figma` Plugin API code to apply it. Example:

```javascript
// Fix: "Slide 3" headline tracking is 0, should be -29px
const frame = figma.currentPage.findOne(n => n.name === "Slide 3");
const headline = frame.findOne(n => n.type === "TEXT" && n.fontSize >= 500);
await figma.loadFontAsync(headline.fontName);
headline.letterSpacing = { value: -29, unit: "PIXELS" };
```

---

## Step 5: Apply Fixes

Apply all fixes using `use_figma`. Group related fixes into batches where possible (e.g., fix all footer positions in one call, fix all headline tracking in another).

**Order of operations:**
1. Fix font weights first (requires font loading)
2. Fix font sizes
3. Fix tracking / letter-spacing
4. Fix line-height
5. Fix positions (x, y)
6. Fix dimensions (width, height)
7. Fix colors
8. Fix rule widths

---

## Step 6: Re-Screenshot (AFTER State)

Screenshot every frame again after fixes are applied. Present BEFORE and AFTER comparisons to the user for each frame that was modified.

---

## Step 7: Summary Report

Present a final summary:

```
## Critique Summary

**Frames reviewed:** [count]
**Issues found:** [count] ([critical] critical, [major] major, [minor] minor)
**Issues fixed:** [count]
**Issues remaining:** [count] (with explanation of why — e.g., "needs creative decision")

### Key patterns found:
- [Pattern 1, e.g., "Tracking was inconsistent on 6/10 headlines"]
- [Pattern 2]

### Frames that need manual review:
- [Frame name] — [reason]
```

---

## Notes

- **Be brutal.** The point of this agent is to catch what the eye misses. Flag everything.
- **Measure, don't eyeball.** Use `use_figma` to read exact property values. "Looks about right" is not acceptable.
- **The reference frame is king.** When Brian's reference frame exists, its values override the general principles. Match it exactly.
- **Don't make creative decisions.** If something looks intentionally different (e.g., one slide has a deliberately different layout for variety), flag it but don't auto-fix it. Note it as "needs manual review."
- **Font loading is required** before modifying any text properties. Always call `figma.loadFontAsync()` before changing text.
- **Run the full checklist every time.** Don't skip sections because "it looks fine." The whole point is to catch what looks fine but isn't.
