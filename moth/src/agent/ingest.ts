/**
 * Moth Document Ingestion Engine
 * 
 * Extracts design principles from PDFs, markdown, and text documents.
 * Uses LLMs to understand and structure design knowledge.
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, basename, extname } from 'path';
import * as pdf from 'pdf-parse';

// ============================================================================
// Types
// ============================================================================

export type IngestionProvider = 'openai' | 'claude' | 'gemini';

export interface IngestionConfig {
  provider: IngestionProvider;
  openaiKey?: string;
  anthropicKey?: string;
  googleKey?: string;
  model?: string;
}

export interface DocumentSource {
  path: string;
  type: 'pdf' | 'markdown' | 'text';
  content: string;
  metadata?: {
    title?: string;
    author?: string;
    subject?: string;
  };
}

export interface ExtractedPrinciple {
  category: 'typography' | 'color' | 'layout' | 'spacing' | 'motion' | 'imagery' | 'general';
  title: string;
  description: string;
  rules: string[];
  examples?: string[];
  contraindications?: string[];
  source: string;
  confidence: number;
}

export interface KnowledgeBase {
  name: string;
  createdAt: string;
  updatedAt: string;
  sources: string[];
  principles: ExtractedPrinciple[];
  summary: string;
  tags: string[];
}

// ============================================================================
// Extraction Prompt
// ============================================================================

const EXTRACTION_PROMPT = `You are an expert design educator analyzing design literature.

Extract structured design principles from this document. Focus on actionable rules and guidelines.

For each principle you find, provide:
1. Category (typography, color, layout, spacing, motion, imagery, or general)
2. A clear title
3. A description of the principle
4. Specific rules that can be followed
5. Examples if mentioned
6. Things to avoid (contraindications)

Respond in JSON format:
{
  "principles": [
    {
      "category": "typography",
      "title": "Optical Alignment Over Mathematical",
      "description": "Visual alignment should prioritize what looks correct to the eye rather than pixel-perfect mathematical alignment",
      "rules": [
        "Round shapes extend slightly beyond baselines",
        "Pointed shapes like 'A' extend beyond cap height",
        "Adjust letterspacing optically for display sizes"
      ],
      "examples": ["The 'O' in Helvetica sits below the baseline"],
      "contraindications": ["Don't use auto-kerning for headlines"]
    }
  ],
  "summary": "2-3 sentence summary of the document's main thesis",
  "tags": ["typography", "optical-design", "swiss-style"]
}

Be thorough. Extract EVERY actionable principle, even if it seems basic.`;

// ============================================================================
// Document Ingestion Engine
// ============================================================================

export class DocumentIngester {
  private openai?: OpenAI;
  private anthropic?: Anthropic;
  private provider: IngestionProvider;
  private model: string;
  private knowledgePath: string;

  constructor(config: IngestionConfig, knowledgePath: string = './knowledge') {
    this.provider = config.provider;
    this.knowledgePath = knowledgePath;

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
        this.model = config.model ?? 'gpt-4-turbo-preview';
        break;
    }
  }

  /**
   * Read a document and extract its text content
   */
  async readDocument(filePath: string): Promise<DocumentSource> {
    const ext = extname(filePath).toLowerCase();
    let content: string;
    let type: 'pdf' | 'markdown' | 'text';
    const metadata: DocumentSource['metadata'] = {};

    switch (ext) {
      case '.pdf':
        const buffer = readFileSync(filePath);
        const pdfData = await pdf.default(buffer);
        content = pdfData.text;
        type = 'pdf';
        metadata.title = pdfData.info?.Title;
        metadata.author = pdfData.info?.Author;
        metadata.subject = pdfData.info?.Subject;
        break;

      case '.md':
      case '.markdown':
        content = readFileSync(filePath, 'utf-8');
        type = 'markdown';
        // Extract title from first heading
        const titleMatch = content.match(/^#\s+(.+)$/m);
        if (titleMatch) metadata.title = titleMatch[1];
        break;

      default:
        content = readFileSync(filePath, 'utf-8');
        type = 'text';
    }

    return {
      path: filePath,
      type,
      content,
      metadata,
    };
  }

  /**
   * Extract design principles from a document
   */
  async extractPrinciples(doc: DocumentSource): Promise<{
    principles: ExtractedPrinciple[];
    summary: string;
    tags: string[];
  }> {
    // Chunk long documents (LLMs have context limits)
    const chunks = this.chunkContent(doc.content, 8000);
    const allPrinciples: ExtractedPrinciple[] = [];
    let allTags: string[] = [];
    const summaries: string[] = [];

    for (const chunk of chunks) {
      const prompt = `${EXTRACTION_PROMPT}

Document (${doc.metadata?.title ?? basename(doc.path)}):
---
${chunk}
---`;

      let response: string;

      if (this.provider === 'claude' && this.anthropic) {
        const result = await this.anthropic.messages.create({
          model: this.model,
          max_tokens: 4000,
          messages: [{ role: 'user', content: prompt }],
        });
        response = result.content[0].type === 'text' ? result.content[0].text : '{}';
      } else if (this.openai) {
        const result = await this.openai.chat.completions.create({
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 4000,
        });
        response = result.choices[0]?.message?.content ?? '{}';
      } else {
        throw new Error('No provider configured');
      }

      try {
        const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) ||
                         response.match(/```\n?([\s\S]*?)\n?```/);
        const jsonStr = jsonMatch ? jsonMatch[1] : response;
        const parsed = JSON.parse(jsonStr);

        // Add source to each principle
        const principlesWithSource = (parsed.principles ?? []).map((p: ExtractedPrinciple) => ({
          ...p,
          source: doc.metadata?.title ?? basename(doc.path),
          confidence: 0.85,
        }));

        allPrinciples.push(...principlesWithSource);
        allTags = [...new Set([...allTags, ...(parsed.tags ?? [])])];
        if (parsed.summary) summaries.push(parsed.summary);
      } catch {
        console.warn(`Failed to parse extraction for chunk`);
      }
    }

    // Combine summaries
    const combinedSummary = summaries.length > 1
      ? await this.synthesizeSummary(summaries)
      : summaries[0] ?? '';

    return {
      principles: allPrinciples,
      summary: combinedSummary,
      tags: allTags,
    };
  }

  /**
   * Ingest multiple documents and create a knowledge base
   */
  async createKnowledgeBase(
    documentPaths: string[],
    name: string
  ): Promise<KnowledgeBase> {
    console.log(`Ingesting ${documentPaths.length} documents...`);

    const allPrinciples: ExtractedPrinciple[] = [];
    const allTags: string[] = [];
    const sources: string[] = [];
    const summaries: string[] = [];

    for (const docPath of documentPaths) {
      console.log(`  Processing: ${basename(docPath)}`);
      
      try {
        const doc = await this.readDocument(docPath);
        const { principles, summary, tags } = await this.extractPrinciples(doc);
        
        allPrinciples.push(...principles);
        allTags.push(...tags);
        sources.push(doc.metadata?.title ?? basename(docPath));
        if (summary) summaries.push(summary);
      } catch (error) {
        console.warn(`  Failed to process: ${basename(docPath)} - ${error}`);
      }
    }

    // Deduplicate and merge similar principles
    const mergedPrinciples = this.mergeSimilarPrinciples(allPrinciples);

    // Synthesize overall summary
    const overallSummary = await this.synthesizeSummary(summaries);

    const knowledgeBase: KnowledgeBase = {
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sources,
      principles: mergedPrinciples,
      summary: overallSummary,
      tags: [...new Set(allTags)],
    };

    // Save knowledge base
    this.saveKnowledgeBase(knowledgeBase);

    console.log(`\n✓ Created knowledge base "${name}"`);
    console.log(`  ${mergedPrinciples.length} principles extracted from ${sources.length} sources`);

    return knowledgeBase;
  }

  /**
   * Split content into manageable chunks
   */
  private chunkContent(content: string, maxChars: number): string[] {
    if (content.length <= maxChars) return [content];

    const chunks: string[] = [];
    const paragraphs = content.split(/\n\n+/);
    let currentChunk = '';

    for (const para of paragraphs) {
      if (currentChunk.length + para.length > maxChars) {
        if (currentChunk) chunks.push(currentChunk);
        currentChunk = para;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + para;
      }
    }

    if (currentChunk) chunks.push(currentChunk);
    return chunks;
  }

  /**
   * Merge similar principles to avoid duplication
   */
  private mergeSimilarPrinciples(principles: ExtractedPrinciple[]): ExtractedPrinciple[] {
    // Group by category and title similarity
    const grouped = new Map<string, ExtractedPrinciple[]>();

    for (const principle of principles) {
      const key = `${principle.category}:${principle.title.toLowerCase().slice(0, 30)}`;
      const existing = grouped.get(key) ?? [];
      existing.push(principle);
      grouped.set(key, existing);
    }

    // Merge groups
    const merged: ExtractedPrinciple[] = [];
    for (const group of grouped.values()) {
      if (group.length === 1) {
        merged.push(group[0]);
      } else {
        // Merge rules and examples from duplicates
        const base = group[0];
        const allRules = new Set(group.flatMap(p => p.rules));
        const allExamples = new Set(group.flatMap(p => p.examples ?? []));
        const allContra = new Set(group.flatMap(p => p.contraindications ?? []));
        const sources = [...new Set(group.map(p => p.source))];

        merged.push({
          ...base,
          rules: [...allRules],
          examples: [...allExamples],
          contraindications: [...allContra],
          source: sources.join(', '),
          confidence: Math.max(...group.map(p => p.confidence)),
        });
      }
    }

    return merged;
  }

  /**
   * Create a combined summary from multiple summaries
   */
  private async synthesizeSummary(summaries: string[]): Promise<string> {
    if (summaries.length === 0) return '';
    if (summaries.length === 1) return summaries[0];

    const prompt = `Synthesize these summaries into a single cohesive paragraph (max 3 sentences):

${summaries.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;

    if (this.provider === 'claude' && this.anthropic) {
      const result = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }],
      });
      return result.content[0].type === 'text' ? result.content[0].text : summaries[0];
    } else if (this.openai) {
      const result = await this.openai.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
      });
      return result.choices[0]?.message?.content ?? summaries[0];
    }

    return summaries[0];
  }

  /**
   * Save knowledge base to disk
   */
  private saveKnowledgeBase(kb: KnowledgeBase): void {
    mkdirSync(this.knowledgePath, { recursive: true });
    const fileName = `${kb.name.toLowerCase().replace(/\s+/g, '-')}.json`;
    const filePath = join(this.knowledgePath, fileName);
    writeFileSync(filePath, JSON.stringify(kb, null, 2));
    console.log(`  Saved to: ${filePath}`);
  }

  /**
   * Load a knowledge base from disk
   */
  loadKnowledgeBase(name: string): KnowledgeBase | null {
    const fileName = `${name.toLowerCase().replace(/\s+/g, '-')}.json`;
    const filePath = join(this.knowledgePath, fileName);

    if (!existsSync(filePath)) return null;
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  }

  /**
   * List all knowledge bases
   */
  listKnowledgeBases(): string[] {
    if (!existsSync(this.knowledgePath)) return [];

    const { readdirSync } = require('fs');
    return readdirSync(this.knowledgePath)
      .filter((f: string) => f.endsWith('.json'))
      .map((f: string) => f.replace('.json', ''));
  }

  /**
   * Convert knowledge base to guidelines markdown
   */
  toGuidelines(kb: KnowledgeBase): string {
    let md = `# ${kb.name}\n\n`;
    md += `> ${kb.summary}\n\n`;
    md += `**Sources:** ${kb.sources.join(', ')}\n\n`;
    md += `---\n\n`;

    // Group principles by category
    const byCategory = new Map<string, ExtractedPrinciple[]>();
    for (const principle of kb.principles) {
      const existing = byCategory.get(principle.category) ?? [];
      existing.push(principle);
      byCategory.set(principle.category, existing);
    }

    for (const [category, principles] of byCategory) {
      md += `## ${category.charAt(0).toUpperCase() + category.slice(1)}\n\n`;
      
      for (const p of principles) {
        md += `### ${p.title}\n\n`;
        md += `${p.description}\n\n`;
        md += `**Rules:**\n`;
        for (const rule of p.rules) {
          md += `- ${rule}\n`;
        }
        
        if (p.examples?.length) {
          md += `\n**Examples:**\n`;
          for (const ex of p.examples) {
            md += `- ${ex}\n`;
          }
        }
        
        if (p.contraindications?.length) {
          md += `\n**Avoid:**\n`;
          for (const contra of p.contraindications) {
            md += `- ${contra}\n`;
          }
        }
        
        md += '\n';
      }
    }

    return md;
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createDocumentIngester(
  config: IngestionConfig | string,
  knowledgePath?: string
): DocumentIngester {
  if (typeof config === 'string') {
    return new DocumentIngester({ provider: 'openai', openaiKey: config }, knowledgePath);
  }
  return new DocumentIngester(config, knowledgePath);
}
