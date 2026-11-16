/**
 * Moth Visual Learning Engine
 * 
 * Analyzes reference images to extract design patterns, styles, and preferences.
 * Uses vision models to understand visual language and update brand context.
 * 
 * Supports multiple vision providers:
 * - OpenAI (GPT-4o)
 * - Anthropic (Claude 3.5 Sonnet) - recommended for design analysis
 * - Google (Gemini 1.5 Pro)
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, basename } from 'path';

// ============================================================================
// Provider Types
// ============================================================================

export type VisionProvider = 'openai' | 'claude' | 'gemini';

export interface VisionConfig {
  provider: VisionProvider;
  openaiKey?: string;
  anthropicKey?: string;
  googleKey?: string;
  model?: string;
}

// ============================================================================
// Types
// ============================================================================

export interface VisualAnalysis {
  image: string;
  analysis: {
    typography: TypographyObservations;
    color: ColorObservations;
    layout: LayoutObservations;
    spacing: SpacingObservations;
    motion: MotionObservations;
    imagery: ImageryObservations;
    mood: string[];
    keywords: string[];
  };
  confidence: number;
}

export interface TypographyObservations {
  displayStyle: string;
  bodyStyle: string;
  hierarchy: string;
  contrast: 'high' | 'medium' | 'low';
  weights: string[];
  characteristics: string[];
}

export interface ColorObservations {
  dominant: string[];
  accent: string[];
  neutrals: string[];
  palette: 'monochromatic' | 'analogous' | 'complementary' | 'triadic' | 'custom';
  temperature: 'warm' | 'cool' | 'neutral';
  saturation: 'vibrant' | 'muted' | 'mixed';
  mood: string;
}

export interface LayoutObservations {
  structure: 'grid' | 'freeform' | 'asymmetric' | 'centered' | 'modular';
  density: 'sparse' | 'balanced' | 'dense';
  whitespace: 'generous' | 'moderate' | 'minimal';
  alignment: string;
  characteristics: string[];
}

export interface SpacingObservations {
  rhythm: 'tight' | 'regular' | 'loose';
  consistency: 'strict' | 'varied';
  scale: string;
  grouping: string;
}

export interface MotionObservations {
  implied: boolean;
  style: string;
  energy: 'calm' | 'moderate' | 'dynamic';
  suggestions: string[];
}

export interface ImageryObservations {
  style: string;
  treatment: string;
  subjects: string[];
  cropping: string;
  overlays: string;
}

export interface LearnedStyle {
  name: string;
  createdAt: string;
  updatedAt: string;
  sourceImages: string[];
  analyses: VisualAnalysis[];
  synthesis: StyleSynthesis;
}

export interface StyleSynthesis {
  summary: string;
  
  typography: {
    displayFont: string;
    bodyFont: string;
    hierarchy: string;
    recommendations: string[];
  };
  
  color: {
    primary: string;
    secondary: string;
    accent: string;
    neutrals: string;
    palette: string;
    recommendations: string[];
  };
  
  layout: {
    structure: string;
    density: string;
    whitespace: string;
    recommendations: string[];
  };
  
  spacing: {
    philosophy: string;
    scale: string;
    recommendations: string[];
  };
  
  motion: {
    energy: string;
    style: string;
    recommendations: string[];
  };
  
  imagery: {
    style: string;
    treatment: string;
    recommendations: string[];
  };
  
  personality: {
    formal_playful: number;
    traditional_modern: number;
    serious_friendly: number;
    luxury_accessible: number;
    corporate_rebellious: number;
  };
  
  keywords: string[];
  avoidKeywords: string[];
}

// ============================================================================
// Analysis Prompt
// ============================================================================

const ANALYSIS_PROMPT = `You are an expert design analyst. Analyze this image and extract detailed design observations.

Respond in JSON format with this exact structure:
{
  "typography": {
    "displayStyle": "description of headline/display typography",
    "bodyStyle": "description of body text if visible",
    "hierarchy": "how type hierarchy is established",
    "contrast": "high|medium|low",
    "weights": ["weights used"],
    "characteristics": ["key type characteristics"]
  },
  "color": {
    "dominant": ["hex or descriptive colors"],
    "accent": ["accent colors"],
    "neutrals": ["neutral colors"],
    "palette": "monochromatic|analogous|complementary|triadic|custom",
    "temperature": "warm|cool|neutral",
    "saturation": "vibrant|muted|mixed",
    "mood": "emotional quality of colors"
  },
  "layout": {
    "structure": "grid|freeform|asymmetric|centered|modular",
    "density": "sparse|balanced|dense",
    "whitespace": "generous|moderate|minimal",
    "alignment": "how elements are aligned",
    "characteristics": ["key layout characteristics"]
  },
  "spacing": {
    "rhythm": "tight|regular|loose",
    "consistency": "strict|varied",
    "scale": "description of spacing scale",
    "grouping": "how elements are grouped"
  },
  "motion": {
    "implied": true/false,
    "style": "what motion style is implied",
    "energy": "calm|moderate|dynamic",
    "suggestions": ["motion recommendations based on visual style"]
  },
  "imagery": {
    "style": "photography style or illustration style",
    "treatment": "color treatment, filters, overlays",
    "subjects": ["what subjects are shown"],
    "cropping": "how images are cropped",
    "overlays": "any overlay treatments"
  },
  "mood": ["mood keywords"],
  "keywords": ["design style keywords"]
}

Be specific and detailed. If something isn't visible or applicable, describe what you can infer from the overall style.`;

const SYNTHESIS_PROMPT = `You are an expert design director. Based on multiple image analyses, synthesize a cohesive design direction.

Given these individual analyses:
{ANALYSES}

Create a synthesis that captures the common patterns and overall design direction. Where analyses differ, identify the dominant pattern.

Respond in JSON format:
{
  "summary": "2-3 sentence summary of the overall design direction",
  
  "typography": {
    "displayFont": "recommended display font style (e.g., 'geometric sans-serif, bold weight')",
    "bodyFont": "recommended body font style",
    "hierarchy": "how to establish hierarchy",
    "recommendations": ["specific typography recommendations"]
  },
  
  "color": {
    "primary": "primary color description or hex",
    "secondary": "secondary color description",
    "accent": "accent color description",
    "neutrals": "neutral palette description",
    "palette": "palette relationship type",
    "recommendations": ["specific color recommendations"]
  },
  
  "layout": {
    "structure": "recommended layout structure",
    "density": "content density approach",
    "whitespace": "whitespace philosophy",
    "recommendations": ["specific layout recommendations"]
  },
  
  "spacing": {
    "philosophy": "spacing philosophy description",
    "scale": "recommended spacing scale approach",
    "recommendations": ["specific spacing recommendations"]
  },
  
  "motion": {
    "energy": "calm|moderate|dynamic",
    "style": "motion style description",
    "recommendations": ["specific motion recommendations"]
  },
  
  "imagery": {
    "style": "imagery style direction",
    "treatment": "how to treat images",
    "recommendations": ["specific imagery recommendations"]
  },
  
  "personality": {
    "formal_playful": 0.0-1.0,
    "traditional_modern": 0.0-1.0,
    "serious_friendly": 0.0-1.0,
    "luxury_accessible": 0.0-1.0,
    "corporate_rebellious": 0.0-1.0
  },
  
  "keywords": ["5-10 keywords that define this style"],
  "avoidKeywords": ["things to avoid based on the style"]
}`;

// ============================================================================
// Visual Learning Engine
// ============================================================================

export class VisualLearner {
  private openai?: OpenAI;
  private anthropic?: Anthropic;
  private provider: VisionProvider;
  private model: string;
  private stylesPath: string;

  constructor(config: VisionConfig, stylesPath: string = './learned-styles') {
    this.provider = config.provider;
    this.stylesPath = stylesPath;

    switch (config.provider) {
      case 'claude':
        if (!config.anthropicKey) throw new Error('Anthropic API key required for Claude');
        this.anthropic = new Anthropic({ apiKey: config.anthropicKey });
        this.model = config.model ?? 'claude-sonnet-4-20250514';
        break;
      case 'openai':
      default:
        if (!config.openaiKey) throw new Error('OpenAI API key required');
        this.openai = new OpenAI({ apiKey: config.openaiKey });
        this.model = config.model ?? 'gpt-4o';
        break;
    }
  }

  /**
   * Analyze a single image and extract design observations
   */
  async analyzeImage(imagePath: string): Promise<VisualAnalysis> {
    // Read image and convert to base64
    const imageBuffer = readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    const mimeType = this.getMimeType(imagePath) as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

    let content: string;

    if (this.provider === 'claude' && this.anthropic) {
      // Use Claude for analysis (recommended for design)
      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mimeType,
                  data: base64Image,
                },
              },
              {
                type: 'text',
                text: ANALYSIS_PROMPT,
              },
            ],
          },
        ],
      });

      content = response.content[0].type === 'text' ? response.content[0].text : '{}';
    } else if (this.openai) {
      // Use OpenAI GPT-4o
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: ANALYSIS_PROMPT },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`,
                  detail: 'high',
                },
              },
            ],
          },
        ],
        max_tokens: 2000,
      });

      content = response.choices[0]?.message?.content ?? '{}';
    } else {
      throw new Error('No vision provider configured');
    }
    
    // Parse JSON from response (handle markdown code blocks)
    let analysis;
    try {
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || 
                       content.match(/```\n?([\s\S]*?)\n?```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      analysis = JSON.parse(jsonStr);
    } catch {
      console.warn('Failed to parse analysis JSON, using defaults');
      analysis = {};
    }

    return {
      image: basename(imagePath),
      analysis,
      confidence: this.provider === 'claude' ? 0.9 : 0.85, // Claude slightly better for design
    };
  }

  /**
   * Analyze multiple images and synthesize a style
   */
  async learnFromImages(
    imagePaths: string[],
    styleName: string
  ): Promise<LearnedStyle> {
    console.log(`Analyzing ${imagePaths.length} images...`);

    // Analyze each image
    const analyses: VisualAnalysis[] = [];
    for (const imagePath of imagePaths) {
      console.log(`  Analyzing: ${basename(imagePath)}`);
      const analysis = await this.analyzeImage(imagePath);
      analyses.push(analysis);
    }

    console.log('Synthesizing style...');

    // Synthesize all analyses into a cohesive style
    const synthesis = await this.synthesizeStyle(analyses);

    const learnedStyle: LearnedStyle = {
      name: styleName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sourceImages: imagePaths.map(p => basename(p)),
      analyses,
      synthesis,
    };

    // Save the learned style
    this.saveStyle(learnedStyle);

    return learnedStyle;
  }

  /**
   * Synthesize multiple analyses into a cohesive style direction
   */
  private async synthesizeStyle(analyses: VisualAnalysis[]): Promise<StyleSynthesis> {
    const analysesJson = JSON.stringify(analyses.map(a => a.analysis), null, 2);
    const prompt = SYNTHESIS_PROMPT.replace('{ANALYSES}', analysesJson);

    let content: string;

    if (this.provider === 'claude' && this.anthropic) {
      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      });
      content = response.content[0].type === 'text' ? response.content[0].text : '{}';
    } else if (this.openai) {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000,
      });
      content = response.choices[0]?.message?.content ?? '{}';
    } else {
      throw new Error('No provider configured');
    }

    try {
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) ||
                       content.match(/```\n?([\s\S]*?)\n?```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      return JSON.parse(jsonStr);
    } catch {
      console.warn('Failed to parse synthesis JSON');
      return this.getDefaultSynthesis();
    }
  }

  /**
   * Save a learned style to disk
   */
  private saveStyle(style: LearnedStyle): void {
    const fileName = `${style.name.toLowerCase().replace(/\s+/g, '-')}.json`;
    const filePath = join(this.stylesPath, fileName);
    
    // Ensure directory exists
    const { mkdirSync } = require('fs');
    mkdirSync(this.stylesPath, { recursive: true });
    
    writeFileSync(filePath, JSON.stringify(style, null, 2));
    console.log(`Style saved to: ${filePath}`);
  }

  /**
   * Load a learned style from disk
   */
  loadStyle(styleName: string): LearnedStyle | null {
    const fileName = `${styleName.toLowerCase().replace(/\s+/g, '-')}.json`;
    const filePath = join(this.stylesPath, fileName);

    if (!existsSync(filePath)) {
      return null;
    }

    return JSON.parse(readFileSync(filePath, 'utf-8'));
  }

  /**
   * List all learned styles
   */
  listStyles(): string[] {
    if (!existsSync(this.stylesPath)) {
      return [];
    }

    const { readdirSync } = require('fs');
    return readdirSync(this.stylesPath)
      .filter((f: string) => f.endsWith('.json'))
      .map((f: string) => f.replace('.json', ''));
  }

  /**
   * Generate a brand context from a learned style
   */
  styleToBrandContext(style: LearnedStyle): object {
    const { synthesis } = style;

    return {
      name: style.name,
      personality: {
        axes: synthesis.personality,
        keywords: synthesis.keywords,
      },
      guidelines: {
        typography: synthesis.typography.recommendations.join('\n'),
        color: synthesis.color.recommendations.join('\n'),
        layout: synthesis.layout.recommendations.join('\n'),
        spacing: synthesis.spacing.recommendations.join('\n'),
        motion: synthesis.motion.recommendations.join('\n'),
        imagery: synthesis.imagery.recommendations.join('\n'),
      },
      avoid: synthesis.avoidKeywords,
      summary: synthesis.summary,
    };
  }

  /**
   * Update moth.config.json with learned style
   */
  applyStyleToConfig(style: LearnedStyle, configPath: string): void {
    const config = JSON.parse(readFileSync(configPath, 'utf-8'));
    const brandContext = this.styleToBrandContext(style);

    config.brand = {
      ...config.brand,
      ...brandContext,
      learnedFrom: style.name,
    };

    writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(`Applied "${style.name}" style to config`);
  }

  private getMimeType(path: string): string {
    const ext = path.toLowerCase().split('.').pop();
    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
    };
    return mimeTypes[ext ?? ''] ?? 'image/jpeg';
  }

  private getDefaultSynthesis(): StyleSynthesis {
    return {
      summary: 'Unable to synthesize style from provided images.',
      typography: {
        displayFont: 'sans-serif',
        bodyFont: 'sans-serif',
        hierarchy: 'size and weight',
        recommendations: [],
      },
      color: {
        primary: 'blue',
        secondary: 'gray',
        accent: 'orange',
        neutrals: 'grayscale',
        palette: 'custom',
        recommendations: [],
      },
      layout: {
        structure: 'grid',
        density: 'balanced',
        whitespace: 'moderate',
        recommendations: [],
      },
      spacing: {
        philosophy: '4px base unit',
        scale: 'geometric',
        recommendations: [],
      },
      motion: {
        energy: 'moderate',
        style: 'smooth transitions',
        recommendations: [],
      },
      imagery: {
        style: 'photography',
        treatment: 'natural',
        recommendations: [],
      },
      personality: {
        formal_playful: 0.5,
        traditional_modern: 0.5,
        serious_friendly: 0.5,
        luxury_accessible: 0.5,
        corporate_rebellious: 0.5,
      },
      keywords: [],
      avoidKeywords: [],
    };
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createVisualLearner(
  config: VisionConfig | string, // backward compat: string = openai key
  stylesPath?: string
): VisualLearner {
  if (typeof config === 'string') {
    // Legacy: just an OpenAI key
    return new VisualLearner({ provider: 'openai', openaiKey: config }, stylesPath);
  }
  return new VisualLearner(config, stylesPath);
}

/**
 * Convenience factory for Claude (recommended for design analysis)
 */
export function createClaudeLearner(anthropicKey: string, stylesPath?: string): VisualLearner {
  return new VisualLearner({
    provider: 'claude',
    anthropicKey,
    model: 'claude-sonnet-4-20250514',
  }, stylesPath);
}

