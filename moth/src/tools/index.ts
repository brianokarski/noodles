/**
 * Moth Tool System
 * 
 * Unified interface for design tool integrations.
 * Each tool is a capability the agent can invoke to produce or analyze design work.
 * 
 * Currently supported:
 * - Figma (via REST API + Plugin)
 * - Image Generation (Midjourney, DALL-E, Stable Diffusion)
 * - Image Processing (Sharp, ImageMagick)
 * - File System (organize, sort, move)
 * 
 * Planned:
 * - Adobe Photoshop (via UXP scripting)
 * - Adobe Illustrator (via ExtendScript/UXP)
 * - Adobe InDesign (via ExtendScript)
 * - Sketch (via Sketch Plugin API)
 */

import { join } from 'path';

// ============================================================================
// Types
// ============================================================================

export interface Tool {
  name: string;
  description: string;
  category: ToolCategory;
  capabilities: string[];
  
  // Check if the tool is available
  isAvailable(): Promise<boolean>;
  
  // Execute an action with the tool
  execute(action: ToolAction): Promise<ToolResult>;
}

export type ToolCategory = 
  | 'design'       // Figma, Sketch, Adobe apps
  | 'generation'   // Midjourney, DALL-E, SD
  | 'processing'   // Image manipulation
  | 'filesystem'   // File organization
  | 'export';      // Export to various formats

export interface ToolAction {
  type: string;
  params: Record<string, unknown>;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  artifacts?: Artifact[];
}

export interface Artifact {
  type: 'file' | 'url' | 'figma-node' | 'data';
  path?: string;
  url?: string;
  nodeId?: string;
  data?: unknown;
}

// ============================================================================
// Figma Tool
// ============================================================================

export class FigmaTool implements Tool {
  name = 'figma';
  description = 'Design in Figma: create frames, components, apply styles';
  category: ToolCategory = 'design';
  capabilities = [
    'create-frame',
    'create-component',
    'apply-style',
    'insert-image',
    'export-png',
    'export-svg',
    'get-frame',
    'critique-frame',
    'update-variables',
  ];

  private accessToken: string;
  private fileKey: string;

  constructor(accessToken: string, fileKey: string) {
    this.accessToken = accessToken;
    this.fileKey = fileKey;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`https://api.figma.com/v1/files/${this.fileKey}`, {
        headers: { 'X-Figma-Token': this.accessToken },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async execute(action: ToolAction): Promise<ToolResult> {
    switch (action.type) {
      case 'create-frame':
        return this.createFrame(action.params);
      case 'get-frame':
        return this.getFrame(action.params);
      case 'export-png':
        return this.exportPng(action.params);
      default:
        return { success: false, error: `Unknown action: ${action.type}` };
    }
  }

  private async createFrame(params: Record<string, unknown>): Promise<ToolResult> {
    // Figma REST API doesn't support direct node creation
    // This would go through the Plugin API instead
    return {
      success: false,
      error: 'Frame creation requires the Figma Plugin. Use moth:plugin instead.',
    };
  }

  private async getFrame(params: Record<string, unknown>): Promise<ToolResult> {
    const nodeId = params.nodeId as string;
    const response = await fetch(
      `https://api.figma.com/v1/files/${this.fileKey}/nodes?ids=${encodeURIComponent(nodeId)}`,
      { headers: { 'X-Figma-Token': this.accessToken } }
    );

    if (!response.ok) {
      return { success: false, error: 'Failed to fetch frame' };
    }

    const data = await response.json();
    return {
      success: true,
      data: data.nodes[nodeId],
      artifacts: [{ type: 'figma-node', nodeId }],
    };
  }

  private async exportPng(params: Record<string, unknown>): Promise<ToolResult> {
    const nodeId = params.nodeId as string;
    const scale = (params.scale as number) ?? 2;

    const response = await fetch(
      `https://api.figma.com/v1/images/${this.fileKey}?ids=${encodeURIComponent(nodeId)}&scale=${scale}&format=png`,
      { headers: { 'X-Figma-Token': this.accessToken } }
    );

    if (!response.ok) {
      return { success: false, error: 'Failed to export' };
    }

    const data = await response.json();
    return {
      success: true,
      data: data.images,
      artifacts: [{ type: 'url', url: data.images[nodeId] }],
    };
  }
}

// ============================================================================
// Image Sorter Tool (for your massive image library)
// ============================================================================

export class ImageSorterTool implements Tool {
  name = 'image-sorter';
  description = 'Classify and organize images based on learned styles';
  category: ToolCategory = 'filesystem';
  capabilities = [
    'classify',
    'sort',
    'dedupe',
    'create-moodboard',
    'find-similar',
    'tag',
  ];

  private anthropicKey?: string;
  private openaiKey?: string;

  constructor(keys: { anthropicKey?: string; openaiKey?: string }) {
    this.anthropicKey = keys.anthropicKey;
    this.openaiKey = keys.openaiKey;
  }

  async isAvailable(): Promise<boolean> {
    return !!(this.anthropicKey || this.openaiKey);
  }

  async execute(action: ToolAction): Promise<ToolResult> {
    switch (action.type) {
      case 'classify':
        return this.classifyImage(action.params);
      case 'sort':
        return this.sortImages(action.params);
      case 'create-moodboard':
        return this.createMoodboard(action.params);
      case 'find-similar':
        return this.findSimilar(action.params);
      default:
        return { success: false, error: `Unknown action: ${action.type}` };
    }
  }

  /**
   * Classify a single image against known styles/categories
   */
  private async classifyImage(params: Record<string, unknown>): Promise<ToolResult> {
    const imagePath = params.path as string;
    const categories = params.categories as string[];

    // Use vision model to classify
    const Anthropic = require('@anthropic-ai/sdk').default;
    const client = new Anthropic({ apiKey: this.anthropicKey });
    const fs = require('fs');
    const path = require('path');

    const imageBuffer = fs.readFileSync(imagePath);
    const base64 = imageBuffer.toString('base64');
    const ext = path.extname(imagePath).toLowerCase();
    const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mimeType, data: base64 },
          },
          {
            type: 'text',
            text: `Classify this image into ONE of these categories: ${categories.join(', ')}

Also provide:
- confidence (0-1)
- 3-5 descriptive tags
- primary mood/feeling

Respond in JSON:
{
  "category": "chosen-category",
  "confidence": 0.85,
  "tags": ["tag1", "tag2"],
  "mood": "elegant"
}`,
          },
        ],
      }],
    });

    const content = response.content[0].type === 'text' ? response.content[0].text : '{}';
    let classification;
    try {
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || [null, content];
      classification = JSON.parse(jsonMatch[1] || content);
    } catch {
      classification = { category: 'unknown', confidence: 0, tags: [], mood: 'neutral' };
    }

    return {
      success: true,
      data: classification,
    };
  }

  /**
   * Sort a folder of images into category subfolders
   */
  private async sortImages(params: Record<string, unknown>): Promise<ToolResult> {
    const sourceDir = params.source as string;
    const categories = params.categories as string[];
    const dryRun = params.dryRun as boolean ?? true;

    const fs = require('fs');
    const path = require('path');

    const files = fs.readdirSync(sourceDir)
      .filter((f: string) => /\.(jpg|jpeg|png|gif|webp)$/i.test(f));

    const results: Array<{ file: string; category: string; confidence: number }> = [];

    for (const file of files) {
      const filePath = path.join(sourceDir, file);
      const classification = await this.classifyImage({
        path: filePath,
        categories,
      });

      if (classification.success && classification.data) {
        const cat = (classification.data as any).category;
        const conf = (classification.data as any).confidence;
        
        results.push({ file, category: cat, confidence: conf });

        if (!dryRun && cat !== 'unknown') {
          const destDir = path.join(sourceDir, cat);
          fs.mkdirSync(destDir, { recursive: true });
          fs.renameSync(filePath, path.join(destDir, file));
        }
      }
    }

    return {
      success: true,
      data: {
        total: files.length,
        sorted: results,
        dryRun,
      },
    };
  }

  /**
   * Create a moodboard from selected images
   */
  private async createMoodboard(params: Record<string, unknown>): Promise<ToolResult> {
    const images = params.images as string[];
    const title = params.title as string;
    const outputPath = params.output as string;
    const columns = (params.columns as number) ?? 3;
    const padding = (params.padding as number) ?? 20;
    const maxWidth = (params.maxWidth as number) ?? 1920;

    const sharp = require('sharp');
    const path = require('path');

    // Calculate grid dimensions
    const rows = Math.ceil(images.length / columns);
    const cellWidth = Math.floor((maxWidth - padding * (columns + 1)) / columns);
    const cellHeight = cellWidth; // Square cells

    // Create blank canvas
    const canvasWidth = maxWidth;
    const canvasHeight = rows * cellHeight + (rows + 1) * padding + 80; // +80 for title

    const composites: Array<{
      input: Buffer;
      top: number;
      left: number;
    }> = [];

    // Process each image
    for (let i = 0; i < images.length; i++) {
      const row = Math.floor(i / columns);
      const col = i % columns;
      
      const x = padding + col * (cellWidth + padding);
      const y = 80 + padding + row * (cellHeight + padding);

      const resized = await sharp(images[i])
        .resize(cellWidth, cellHeight, { fit: 'cover' })
        .toBuffer();

      composites.push({
        input: resized,
        top: y,
        left: x,
      });
    }

    // Create the moodboard
    await sharp({
      create: {
        width: canvasWidth,
        height: canvasHeight,
        channels: 3,
        background: { r: 250, g: 250, b: 250 },
      },
    })
      .composite(composites)
      .png()
      .toFile(outputPath);

    return {
      success: true,
      data: { path: outputPath, images: images.length, grid: `${columns}x${rows}` },
      artifacts: [{ type: 'file', path: outputPath }],
    };
  }

  /**
   * Find images similar to a reference
   */
  private async findSimilar(params: Record<string, unknown>): Promise<ToolResult> {
    const reference = params.reference as string;
    const searchDir = params.searchDir as string;
    const limit = (params.limit as number) ?? 10;

    // First, analyze the reference image
    const refAnalysis = await this.classifyImage({
      path: reference,
      categories: ['reference'],
    });

    const refTags = (refAnalysis.data as any)?.tags ?? [];
    const refMood = (refAnalysis.data as any)?.mood ?? '';

    const fs = require('fs');
    const path = require('path');

    const files = fs.readdirSync(searchDir)
      .filter((f: string) => /\.(jpg|jpeg|png|gif|webp)$/i.test(f));

    const similarities: Array<{
      file: string;
      score: number;
      matchingTags: string[];
    }> = [];

    for (const file of files.slice(0, 50)) { // Limit for performance
      const filePath = path.join(searchDir, file);
      const analysis = await this.classifyImage({
        path: filePath,
        categories: ['similar'],
      });

      const tags = (analysis.data as any)?.tags ?? [];
      const mood = (analysis.data as any)?.mood ?? '';

      // Simple similarity scoring
      const matchingTags = tags.filter((t: string) => refTags.includes(t));
      const moodMatch = mood === refMood ? 0.3 : 0;
      const score = matchingTags.length / Math.max(refTags.length, 1) * 0.7 + moodMatch;

      similarities.push({ file, score, matchingTags });
    }

    // Sort by score and return top matches
    similarities.sort((a, b) => b.score - a.score);

    return {
      success: true,
      data: {
        reference,
        referenceTags: refTags,
        similar: similarities.slice(0, limit),
      },
    };
  }
}

// ============================================================================
// Image Generation Tool
// ============================================================================

export class ImageGeneratorTool implements Tool {
  name = 'image-generator';
  description = 'Generate images using AI (DALL-E, Midjourney prompts, Stable Diffusion)';
  category: ToolCategory = 'generation';
  capabilities = [
    'generate-dalle',
    'generate-prompt',  // Creates prompts for Midjourney/SD
    'variations',
    'inpaint',
    'upscale',
  ];

  private openaiKey?: string;

  constructor(keys: { openaiKey?: string }) {
    this.openaiKey = keys.openaiKey;
  }

  async isAvailable(): Promise<boolean> {
    return !!this.openaiKey;
  }

  async execute(action: ToolAction): Promise<ToolResult> {
    switch (action.type) {
      case 'generate-dalle':
        return this.generateDalle(action.params);
      case 'generate-prompt':
        return this.generatePrompt(action.params);
      default:
        return { success: false, error: `Unknown action: ${action.type}` };
    }
  }

  private async generateDalle(params: Record<string, unknown>): Promise<ToolResult> {
    const prompt = params.prompt as string;
    const size = (params.size as string) ?? '1024x1024';
    const style = (params.style as string) ?? 'natural';

    const OpenAI = require('openai').default;
    const client = new OpenAI({ apiKey: this.openaiKey });

    const response = await client.images.generate({
      model: 'dall-e-3',
      prompt,
      size,
      style,
      n: 1,
    });

    return {
      success: true,
      data: response.data[0],
      artifacts: [{ type: 'url', url: response.data[0].url }],
    };
  }

  private async generatePrompt(params: Record<string, unknown>): Promise<ToolResult> {
    const concept = params.concept as string;
    const style = params.style as string;
    const platform = (params.platform as string) ?? 'midjourney';

    const OpenAI = require('openai').default;
    const client = new OpenAI({ apiKey: this.openaiKey });

    const systemPrompt = platform === 'midjourney'
      ? `You create Midjourney prompts. Include style keywords, lighting, camera angles, and parameters like --ar, --v, --s, --c.`
      : `You create Stable Diffusion prompts. Include detailed descriptions, negative prompts, and suggested settings.`;

    const response = await client.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Create a ${platform} prompt for: ${concept}\n\nStyle reference: ${style}` },
      ],
      max_tokens: 500,
    });

    return {
      success: true,
      data: {
        platform,
        prompt: response.choices[0]?.message?.content ?? '',
      },
    };
  }
}

// ============================================================================
// Tool Registry
// ============================================================================

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  register(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  list(): Tool[] {
    return Array.from(this.tools.values());
  }

  async listAvailable(): Promise<Tool[]> {
    const available: Tool[] = [];
    for (const tool of this.tools.values()) {
      if (await tool.isAvailable()) {
        available.push(tool);
      }
    }
    return available;
  }

  /**
   * Get tool capabilities as prompt context
   */
  toPromptContext(): string {
    let context = '# Available Tools\n\n';
    
    for (const tool of this.tools.values()) {
      context += `## ${tool.name}\n`;
      context += `${tool.description}\n\n`;
      context += `**Capabilities:**\n`;
      for (const cap of tool.capabilities) {
        context += `- ${cap}\n`;
      }
      context += '\n';
    }

    return context;
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createToolRegistry(config: {
  figmaToken?: string;
  figmaFileKey?: string;
  openaiKey?: string;
  anthropicKey?: string;
}): ToolRegistry {
  const registry = new ToolRegistry();

  if (config.figmaToken && config.figmaFileKey) {
    registry.register(new FigmaTool(config.figmaToken, config.figmaFileKey));
  }

  if (config.anthropicKey || config.openaiKey) {
    registry.register(new ImageSorterTool({
      anthropicKey: config.anthropicKey,
      openaiKey: config.openaiKey,
    }));
  }

  if (config.openaiKey) {
    registry.register(new ImageGeneratorTool({ openaiKey: config.openaiKey }));
  }

  return registry;
}
