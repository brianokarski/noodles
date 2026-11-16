/**
 * Moth Design Agent
 * 
 * Main orchestrator for the generative design agent.
 * Coordinates ideation, execution, and critique engines.
 */

import { OpenAI } from 'openai';
import { readFileSync } from 'fs';
import { join } from 'path';
import { FigmaClient, createFigmaClient } from '../figma/client';
import { VariableManager, createVariableManager } from '../figma/variables';

// ============================================================================
// Types
// ============================================================================

export interface MothConfig {
  openai: {
    apiKey: string;
    model?: string;
  };
  figma: {
    accessToken: string;
    fileKey: string;
  };
  brand: BrandContext;
}

export interface BrandContext {
  name: string;
  personality: {
    axes: {
      formal_playful: number;
      traditional_modern: number;
      serious_friendly: number;
      luxury_accessible: number;
      corporate_rebellious: number;
    };
    keywords: string[];
  };
  guidelines?: {
    typography?: string;
    color?: string;
    motion?: string;
    imagery?: string;
  };
}

export interface IdeationRequest {
  brief: string;
  context?: string;
  constraints?: string[];
  explorationAxes?: [string, string][];
  variationCount?: number;
}

export interface IdeationResult {
  concepts: Concept[];
  recommendation: string;
  questions: string[];
}

export interface Concept {
  name: string;
  description: string;
  position: Record<string, string>;
  decisions: {
    typography: Record<string, string>;
    color: Record<string, string>;
    layout: string;
    spacing: Record<string, string>;
    motion?: Record<string, string>;
  };
  tokens: string[];
  mood: string[];
  rationale: string;
}

export interface ExecutionRequest {
  concept: Concept;
  target: 'component' | 'section' | 'page';
  responsive?: boolean;
}

export interface CritiqueRequest {
  frameId?: string;
  frameData?: unknown;
  focus?: ('tokens' | 'accessibility' | 'hierarchy' | 'brand')[];
}

export interface CritiqueResult {
  summary: string;
  issues: Issue[];
  strengths: string[];
  recommendations: string[];
}

export interface Issue {
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  title: string;
  location: string;
  problem: string;
  impact: string;
  fix: string;
  reference?: string;
}

// ============================================================================
// Agent Core
// ============================================================================

export class MothAgent {
  private openai: OpenAI;
  private figma: FigmaClient;
  private variables: VariableManager;
  private brand: BrandContext;
  private prompts: Map<string, string> = new Map();

  constructor(config: MothConfig) {
    this.openai = new OpenAI({ apiKey: config.openai.apiKey });
    this.figma = createFigmaClient(config.figma);
    this.variables = createVariableManager(this.figma);
    this.brand = config.brand;

    // Load prompt templates
    this.loadPrompts();
  }

  private loadPrompts(): void {
    const promptDir = join(__dirname, 'prompts');
    const promptFiles = ['system', 'ideation', 'execution', 'critique'];

    for (const name of promptFiles) {
      try {
        const content = readFileSync(join(promptDir, `${name}.md`), 'utf-8');
        this.prompts.set(name, content);
      } catch (error) {
        console.warn(`Could not load prompt: ${name}`);
      }
    }
  }

  private getPrompt(name: string): string {
    return this.prompts.get(name) ?? '';
  }

  private buildContext(): string {
    return `
## Current Brand Context

**Name:** ${this.brand.name}

**Personality Axes:**
- Formal ↔ Playful: ${this.brand.personality.axes.formal_playful}
- Traditional ↔ Modern: ${this.brand.personality.axes.traditional_modern}
- Serious ↔ Friendly: ${this.brand.personality.axes.serious_friendly}
- Luxury ↔ Accessible: ${this.brand.personality.axes.luxury_accessible}
- Corporate ↔ Rebellious: ${this.brand.personality.axes.corporate_rebellious}

**Keywords:** ${this.brand.personality.keywords.join(', ')}
`;
  }

  // --------------------------------------------------------------------------
  // Ideation
  // --------------------------------------------------------------------------

  async ideate(request: IdeationRequest): Promise<IdeationResult> {
    const systemPrompt = this.getPrompt('system');
    const ideationPrompt = this.getPrompt('ideation');
    const brandContext = this.buildContext();

    const userMessage = `
${brandContext}

## Ideation Brief

${request.brief}

${request.context ? `### Additional Context\n${request.context}` : ''}

${request.constraints?.length ? `### Constraints\n${request.constraints.map(c => `- ${c}`).join('\n')}` : ''}

${request.explorationAxes?.length ? `### Exploration Axes\n${request.explorationAxes.map(([a, b]) => `- ${a} ↔ ${b}`).join('\n')}` : ''}

### Output Requirements
Generate ${request.variationCount ?? 6} distinct concepts.
`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt + '\n\n' + ideationPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.8,
      max_tokens: 4000,
    });

    const content = response.choices[0]?.message?.content ?? '';
    
    // Parse the response into structured concepts
    // In production, you'd want more robust parsing or use function calling
    return this.parseIdeationResponse(content);
  }

  private parseIdeationResponse(content: string): IdeationResult {
    // Simplified parsing - in production use structured output or function calling
    const concepts: Concept[] = [];
    const conceptMatches = content.match(/### Concept \d+: "(.+?)"/g) ?? [];
    
    // Extract concepts (simplified)
    for (const match of conceptMatches) {
      const name = match.match(/"(.+?)"/)?.[1] ?? 'Untitled';
      concepts.push({
        name,
        description: 'Extracted from AI response',
        position: {},
        decisions: {
          typography: {},
          color: {},
          layout: '',
          spacing: {},
        },
        tokens: [],
        mood: [],
        rationale: '',
      });
    }

    // Extract recommendation
    const recommendationMatch = content.match(/## Recommendation\n(.+?)(\n##|$)/s);
    const recommendation = recommendationMatch?.[1]?.trim() ?? '';

    // Extract questions
    const questionsMatch = content.match(/## Questions.*\n([\s\S]*?)$/);
    const questionsText = questionsMatch?.[1] ?? '';
    const questions = questionsText
      .split('\n')
      .filter(line => line.trim().startsWith('-') || line.trim().match(/^\d+\./))
      .map(line => line.replace(/^[-\d.]+\s*/, '').trim());

    return { concepts, recommendation, questions };
  }

  // --------------------------------------------------------------------------
  // Execution
  // --------------------------------------------------------------------------

  async execute(request: ExecutionRequest): Promise<{
    success: boolean;
    frameSpec?: unknown;
    message: string;
  }> {
    const systemPrompt = this.getPrompt('system');
    const executionPrompt = this.getPrompt('execution');
    const brandContext = this.buildContext();

    const userMessage = `
${brandContext}

## Execution Request

**Target:** ${request.target}
**Responsive:** ${request.responsive ?? false}

### Concept to Execute

**Name:** ${request.concept.name}
**Description:** ${request.concept.description}

**Design Decisions:**
- Typography: ${JSON.stringify(request.concept.decisions.typography)}
- Color: ${JSON.stringify(request.concept.decisions.color)}
- Layout: ${request.concept.decisions.layout}
- Spacing: ${JSON.stringify(request.concept.decisions.spacing)}
${request.concept.decisions.motion ? `- Motion: ${JSON.stringify(request.concept.decisions.motion)}` : ''}

**Tokens to Use:** ${request.concept.tokens.join(', ')}

Generate a complete Figma-ready specification using auto-layout and design system variables.
`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt + '\n\n' + executionPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.3, // Lower temperature for execution accuracy
      max_tokens: 4000,
    });

    const content = response.choices[0]?.message?.content ?? '';

    return {
      success: true,
      frameSpec: content, // Would be parsed into actual Figma spec
      message: 'Execution specification generated successfully.',
    };
  }

  // --------------------------------------------------------------------------
  // Critique
  // --------------------------------------------------------------------------

  async critique(request: CritiqueRequest): Promise<CritiqueResult> {
    const systemPrompt = this.getPrompt('system');
    const critiquePrompt = this.getPrompt('critique');
    const brandContext = this.buildContext();

    // If we have a frame ID, fetch the frame data
    let frameData = request.frameData;
    if (request.frameId && !frameData) {
      const nodes = await this.figma.getNodes([request.frameId]);
      frameData = nodes[request.frameId];
    }

    const focusAreas = request.focus ?? ['tokens', 'accessibility', 'hierarchy', 'brand'];

    const userMessage = `
${brandContext}

## Critique Request

**Focus Areas:** ${focusAreas.join(', ')}

### Frame Data
\`\`\`json
${JSON.stringify(frameData, null, 2)}
\`\`\`

Provide a structured critique following the framework.
`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt + '\n\n' + critiquePrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.4,
      max_tokens: 4000,
    });

    const content = response.choices[0]?.message?.content ?? '';

    return this.parseCritiqueResponse(content);
  }

  private parseCritiqueResponse(content: string): CritiqueResult {
    // Simplified parsing
    const issues: Issue[] = [];
    const strengths: string[] = [];
    const recommendations: string[] = [];

    // Extract summary
    const summaryMatch = content.match(/## Summary\n([\s\S]*?)(\n##|$)/);
    const summary = summaryMatch?.[1]?.trim() ?? '';

    // Extract strengths
    const strengthsMatch = content.match(/## What's Working Well.*\n([\s\S]*?)(\n##|$)/);
    if (strengthsMatch) {
      const strengthsText = strengthsMatch[1];
      strengths.push(
        ...strengthsText
          .split('\n')
          .filter(line => line.trim().startsWith('-'))
          .map(line => line.replace(/^-\s*/, '').trim())
      );
    }

    // Extract recommendations
    const recsMatch = content.match(/## Recommendations\n([\s\S]*?)(\n##|$)/);
    if (recsMatch) {
      const recsText = recsMatch[1];
      recommendations.push(
        ...recsText
          .split('\n')
          .filter(line => line.trim().match(/^[\d-]/))
          .map(line => line.replace(/^[\d.-]+\s*/, '').trim())
      );
    }

    return { summary, issues, strengths, recommendations };
  }

  // --------------------------------------------------------------------------
  // Utility Methods
  // --------------------------------------------------------------------------

  /**
   * Sync design tokens to Figma variables
   */
  async syncTokens(tokenPath: string): Promise<{
    created: number;
    updated: number;
    unchanged: number;
  }> {
    const tokens = JSON.parse(readFileSync(tokenPath, 'utf-8'));
    return this.variables.syncTokens(tokens);
  }

  /**
   * Get current file structure
   */
  async getFileStructure(): Promise<unknown> {
    const file = await this.figma.getFile();
    return {
      name: file.name,
      lastModified: file.lastModified,
      pages: file.document.children?.map(page => ({
        id: page.id,
        name: page.name,
        type: page.type,
      })),
    };
  }

  /**
   * Add a comment to the file
   */
  async addComment(message: string, nodeId?: string): Promise<void> {
    await this.figma.postComment(message, nodeId ? { nodeId } : undefined);
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createMothAgent(config: MothConfig): MothAgent {
  return new MothAgent(config);
}

// ============================================================================
// Default Export
// ============================================================================

export default MothAgent;

