/**
 * Adobe Creative Cloud Tool Integrations
 * 
 * Communicates with Adobe apps via:
 * - UXP (Unified Extensibility Platform) for PS, AI, XD (modern)
 * - ExtendScript for InDesign, legacy PS/AI (older but more capable)
 * - CEP (Common Extensibility Platform) for panel-based workflows
 * 
 * Architecture:
 * 1. Moth agent generates instructions (JSON or script)
 * 2. A local "bridge" process connects to Adobe apps
 * 3. Scripts execute inside the apps
 * 4. Results return to Moth
 * 
 * Requirements:
 * - Adobe apps installed locally
 * - Bridge server running (or use file-based communication)
 */

import { Tool, ToolAction, ToolResult, ToolCategory } from './index';
import { writeFileSync, readFileSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

// ============================================================================
// Photoshop Tool (UXP)
// ============================================================================

export class PhotoshopTool implements Tool {
  name = 'photoshop';
  description = 'Manipulate images in Adobe Photoshop';
  category: ToolCategory = 'design';
  capabilities = [
    'open-document',
    'create-document',
    'apply-adjustment',
    'apply-filter',
    'resize',
    'crop',
    'export',
    'run-action',
    'create-smart-object',
    'apply-layer-style',
  ];

  private scriptsPath: string;
  private resultPath: string;

  constructor(scriptsPath: string = './ps-scripts') {
    this.scriptsPath = scriptsPath;
    this.resultPath = join(scriptsPath, '_result.json');
  }

  async isAvailable(): Promise<boolean> {
    // Check if Photoshop is running (macOS)
    try {
      const result = execSync('osascript -e \'tell application "System Events" to (name of processes) contains "Adobe Photoshop"\'', { encoding: 'utf-8' });
      return result.trim() === 'true';
    } catch {
      return false;
    }
  }

  async execute(action: ToolAction): Promise<ToolResult> {
    const script = this.generateScript(action);
    return this.executeScript(script);
  }

  private generateScript(action: ToolAction): string {
    // Generate UXP-compatible JavaScript
    switch (action.type) {
      case 'create-document':
        return this.scriptCreateDocument(action.params);
      case 'apply-adjustment':
        return this.scriptApplyAdjustment(action.params);
      case 'export':
        return this.scriptExport(action.params);
      default:
        return `// Unknown action: ${action.type}`;
    }
  }

  private scriptCreateDocument(params: Record<string, unknown>): string {
    const width = params.width ?? 1920;
    const height = params.height ?? 1080;
    const name = params.name ?? 'Moth Document';
    const colorMode = params.colorMode ?? 'RGB';

    return `
const { app, constants } = require('photoshop');

async function createDocument() {
  const doc = await app.documents.add({
    width: ${width},
    height: ${height},
    resolution: 72,
    name: "${name}",
    mode: constants.NewDocumentMode.${colorMode.toUpperCase()},
    fill: constants.DocumentFill.WHITE,
  });
  
  return { success: true, documentId: doc.id, name: doc.name };
}

module.exports = { createDocument };
`;
  }

  private scriptApplyAdjustment(params: Record<string, unknown>): string {
    const type = params.type as string;
    const settings = params.settings ?? {};

    const adjustmentScripts: Record<string, string> = {
      'brightness-contrast': `
        await doc.activeLayers[0].adjustBrightnessContrast(
          ${(settings as any).brightness ?? 0},
          ${(settings as any).contrast ?? 0}
        );
      `,
      'hue-saturation': `
        await doc.activeLayers[0].adjustHueSaturation(
          ${(settings as any).hue ?? 0},
          ${(settings as any).saturation ?? 0},
          ${(settings as any).lightness ?? 0}
        );
      `,
      'curves': `
        // Curves adjustment requires batchPlay
        const batchPlay = require('photoshop').action.batchPlay;
        await batchPlay([{
          _obj: "curves",
          adjustment: ${JSON.stringify((settings as any).points ?? [])}
        }], {});
      `,
    };

    return `
const { app } = require('photoshop');

async function applyAdjustment() {
  const doc = app.activeDocument;
  if (!doc) return { success: false, error: 'No active document' };
  
  ${adjustmentScripts[type] ?? '// Unknown adjustment type'}
  
  return { success: true };
}

module.exports = { applyAdjustment };
`;
  }

  private scriptExport(params: Record<string, unknown>): string {
    const format = (params.format as string) ?? 'png';
    const path = params.path as string;
    const quality = (params.quality as number) ?? 100;

    return `
const { app } = require('photoshop');
const fs = require('uxp').storage.localFileSystem;

async function exportDocument() {
  const doc = app.activeDocument;
  if (!doc) return { success: false, error: 'No active document' };
  
  const file = await fs.getFileForSaving("${path}");
  
  await doc.saveAs.${format === 'png' ? 'png' : 'jpg'}(file, {
    ${format === 'jpg' ? `quality: ${quality}` : ''}
  });
  
  return { success: true, path: "${path}" };
}

module.exports = { exportDocument };
`;
  }

  private async executeScript(script: string): Promise<ToolResult> {
    // Write script to file
    const scriptPath = join(this.scriptsPath, '_moth_script.js');
    writeFileSync(scriptPath, script);

    // Execute via osascript (tells PS to run the script)
    // In practice, you'd use the UXP Developer Tools or a CEP panel
    try {
      execSync(`osascript -e 'tell application "Adobe Photoshop 2024" to do javascript (read POSIX file "${scriptPath}")'`);
      
      // Read result if available
      if (existsSync(this.resultPath)) {
        const result = JSON.parse(readFileSync(this.resultPath, 'utf-8'));
        unlinkSync(this.resultPath);
        return { success: true, data: result };
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }
}

// ============================================================================
// InDesign Tool (ExtendScript)
// ============================================================================

export class InDesignTool implements Tool {
  name = 'indesign';
  description = 'Create layouts in Adobe InDesign';
  category: ToolCategory = 'design';
  capabilities = [
    'create-document',
    'add-page',
    'place-image',
    'create-text-frame',
    'apply-paragraph-style',
    'apply-character-style',
    'create-grid',
    'export-pdf',
    'export-epub',
    'package',
  ];

  private scriptsPath: string;

  constructor(scriptsPath: string = './id-scripts') {
    this.scriptsPath = scriptsPath;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const result = execSync('osascript -e \'tell application "System Events" to (name of processes) contains "Adobe InDesign"\'', { encoding: 'utf-8' });
      return result.trim() === 'true';
    } catch {
      return false;
    }
  }

  async execute(action: ToolAction): Promise<ToolResult> {
    const script = this.generateExtendScript(action);
    return this.executeExtendScript(script);
  }

  private generateExtendScript(action: ToolAction): string {
    switch (action.type) {
      case 'create-document':
        return this.scriptCreateDocument(action.params);
      case 'create-grid':
        return this.scriptCreateGrid(action.params);
      case 'place-image':
        return this.scriptPlaceImage(action.params);
      case 'export-pdf':
        return this.scriptExportPdf(action.params);
      default:
        return `// Unknown action: ${action.type}`;
    }
  }

  private scriptCreateDocument(params: Record<string, unknown>): string {
    const width = params.width ?? '210mm';
    const height = params.height ?? '297mm';
    const pages = params.pages ?? 1;
    const columns = params.columns ?? 1;
    const marginTop = params.marginTop ?? '12.7mm';
    const marginBottom = params.marginBottom ?? '12.7mm';
    const marginInside = params.marginInside ?? '12.7mm';
    const marginOutside = params.marginOutside ?? '12.7mm';

    return `
#target indesign

var doc = app.documents.add();
doc.documentPreferences.pageWidth = "${width}";
doc.documentPreferences.pageHeight = "${height}";
doc.documentPreferences.pagesPerDocument = ${pages};

// Set margins
for (var i = 0; i < doc.pages.length; i++) {
  var page = doc.pages[i];
  page.marginPreferences.top = "${marginTop}";
  page.marginPreferences.bottom = "${marginBottom}";
  page.marginPreferences.left = "${marginInside}";
  page.marginPreferences.right = "${marginOutside}";
  page.marginPreferences.columnCount = ${columns};
}

"Document created";
`;
  }

  private scriptCreateGrid(params: Record<string, unknown>): string {
    const rows = params.rows ?? 6;
    const columns = params.columns ?? 12;
    const gutter = params.gutter ?? '4mm';

    return `
#target indesign

var doc = app.activeDocument;
var page = doc.pages[0];
var bounds = page.bounds; // [top, left, bottom, right]

var marginTop = page.marginPreferences.top;
var marginBottom = page.marginPreferences.bottom;
var marginLeft = page.marginPreferences.left;
var marginRight = page.marginPreferences.right;

var contentWidth = (bounds[3] - bounds[1]) - marginLeft - marginRight;
var contentHeight = (bounds[2] - bounds[0]) - marginTop - marginBottom;

var gutterValue = UnitValue("${gutter}").as("mm");
var colWidth = (contentWidth - (gutterValue * (${columns} - 1))) / ${columns};
var rowHeight = (contentHeight - (gutterValue * (${rows} - 1))) / ${rows};

// Create guide grid
var x = marginLeft;
for (var c = 0; c <= ${columns}; c++) {
  doc.guides.add(undefined, {orientation: HorizontalOrVertical.VERTICAL, location: x});
  x += colWidth + gutterValue;
}

var y = marginTop;
for (var r = 0; r <= ${rows}; r++) {
  doc.guides.add(undefined, {orientation: HorizontalOrVertical.HORIZONTAL, location: y});
  y += rowHeight + gutterValue;
}

"Grid created: ${columns} columns x ${rows} rows";
`;
  }

  private scriptPlaceImage(params: Record<string, unknown>): string {
    const imagePath = params.path as string;
    const x = params.x ?? 0;
    const y = params.y ?? 0;
    const width = params.width;
    const height = params.height;

    return `
#target indesign

var doc = app.activeDocument;
var page = doc.pages[0];
var frame = page.rectangles.add({
  geometricBounds: [${y}, ${x}, ${y + (height ?? 100)}, ${x + (width ?? 100)}]
});

var image = frame.place(File("${imagePath.replace(/\\/g, '/')}"));
frame.fit(FitOptions.PROPORTIONALLY);

"Image placed";
`;
  }

  private scriptExportPdf(params: Record<string, unknown>): string {
    const outputPath = params.path as string;
    const preset = (params.preset as string) ?? '[High Quality Print]';

    return `
#target indesign

var doc = app.activeDocument;
var pdfPreset = app.pdfExportPresets.item("${preset}");
var pdfFile = new File("${outputPath.replace(/\\/g, '/')}");

doc.exportFile(ExportFormat.PDF_TYPE, pdfFile, false, pdfPreset);

"PDF exported to ${outputPath}";
`;
  }

  private async executeExtendScript(script: string): Promise<ToolResult> {
    const scriptPath = join(this.scriptsPath, '_moth_script.jsx');
    writeFileSync(scriptPath, script);

    try {
      const result = execSync(`osascript -e 'tell application "Adobe InDesign 2024" to do script (POSIX file "${scriptPath}") language javascript'`, { encoding: 'utf-8' });
      return { success: true, data: result.trim() };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }
}

// ============================================================================
// Illustrator Tool
// ============================================================================

export class IllustratorTool implements Tool {
  name = 'illustrator';
  description = 'Create vector graphics in Adobe Illustrator';
  category: ToolCategory = 'design';
  capabilities = [
    'create-document',
    'create-artboard',
    'draw-shape',
    'create-path',
    'apply-gradient',
    'create-symbol',
    'export-svg',
    'export-png',
    'trace-image',
  ];

  private scriptsPath: string;

  constructor(scriptsPath: string = './ai-scripts') {
    this.scriptsPath = scriptsPath;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const result = execSync('osascript -e \'tell application "System Events" to (name of processes) contains "Adobe Illustrator"\'', { encoding: 'utf-8' });
      return result.trim() === 'true';
    } catch {
      return false;
    }
  }

  async execute(action: ToolAction): Promise<ToolResult> {
    const script = this.generateScript(action);
    return this.executeScript(script);
  }

  private generateScript(action: ToolAction): string {
    switch (action.type) {
      case 'create-document':
        return this.scriptCreateDocument(action.params);
      case 'draw-shape':
        return this.scriptDrawShape(action.params);
      case 'export-svg':
        return this.scriptExportSvg(action.params);
      default:
        return `// Unknown action: ${action.type}`;
    }
  }

  private scriptCreateDocument(params: Record<string, unknown>): string {
    const width = params.width ?? 1920;
    const height = params.height ?? 1080;
    const name = params.name ?? 'Moth Artboard';

    return `
#target illustrator

var docPreset = new DocumentPreset();
docPreset.width = ${width};
docPreset.height = ${height};
docPreset.title = "${name}";
docPreset.colorMode = DocumentColorSpace.RGB;

var doc = app.documents.addDocument("Print", docPreset);
"Document created: ${name}";
`;
  }

  private scriptDrawShape(params: Record<string, unknown>): string {
    const shape = params.shape as string;
    const x = params.x ?? 0;
    const y = params.y ?? 0;
    const width = params.width ?? 100;
    const height = params.height ?? 100;
    const fill = params.fill as string;
    const stroke = params.stroke as string;

    const shapeScripts: Record<string, string> = {
      rectangle: `doc.pathItems.rectangle(${-y}, ${x}, ${width}, ${height})`,
      ellipse: `doc.pathItems.ellipse(${-y}, ${x}, ${width}, ${height})`,
      roundedRect: `doc.pathItems.roundedRectangle(${-y}, ${x}, ${width}, ${height}, ${params.radius ?? 10}, ${params.radius ?? 10})`,
    };

    return `
#target illustrator

var doc = app.activeDocument;
var shape = ${shapeScripts[shape] ?? shapeScripts.rectangle};

${fill ? `
var color = new RGBColor();
color.red = ${parseInt(fill.slice(1, 3), 16)};
color.green = ${parseInt(fill.slice(3, 5), 16)};
color.blue = ${parseInt(fill.slice(5, 7), 16)};
shape.fillColor = color;
` : 'shape.filled = false;'}

${stroke ? `
var strokeColor = new RGBColor();
strokeColor.red = ${parseInt(stroke.slice(1, 3), 16)};
strokeColor.green = ${parseInt(stroke.slice(3, 5), 16)};
strokeColor.blue = ${parseInt(stroke.slice(5, 7), 16)};
shape.strokeColor = strokeColor;
shape.stroked = true;
` : 'shape.stroked = false;'}

"Shape created";
`;
  }

  private scriptExportSvg(params: Record<string, unknown>): string {
    const outputPath = params.path as string;

    return `
#target illustrator

var doc = app.activeDocument;
var file = new File("${outputPath.replace(/\\/g, '/')}");

var exportOptions = new ExportOptionsSVG();
exportOptions.embedRasterImages = true;
exportOptions.fontSubsetting = SVGFontSubsetting.GLYPHSUSED;

doc.exportFile(file, ExportType.SVG, exportOptions);
"SVG exported";
`;
  }

  private async executeScript(script: string): Promise<ToolResult> {
    const scriptPath = join(this.scriptsPath, '_moth_script.jsx');
    writeFileSync(scriptPath, script);

    try {
      const result = execSync(`osascript -e 'tell application "Adobe Illustrator" to do javascript (POSIX file "${scriptPath}")'`, { encoding: 'utf-8' });
      return { success: true, data: result.trim() };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }
}

// ============================================================================
// Factory
// ============================================================================

export function registerAdobeTools(
  registry: import('./index').ToolRegistry,
  scriptsBasePath: string = './adobe-scripts'
): void {
  registry.register(new PhotoshopTool(join(scriptsBasePath, 'photoshop')));
  registry.register(new InDesignTool(join(scriptsBasePath, 'indesign')));
  registry.register(new IllustratorTool(join(scriptsBasePath, 'illustrator')));
}
