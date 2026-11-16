/**
 * Moth Skills System
 * 
 * Composable, nestable skills that the agent can learn, combine, and apply.
 * Skills can be:
 * - Learned from documents
 * - Learned from images
 * - Manually defined
 * - Composed from other skills
 * 
 * This enables "faceted datasets" where swiss-modernism might combine:
 * - typography skills from Müller-Brockmann PDFs
 * - color skills from your 100 curated images
 * - layout skills from grid theory documents
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join, basename } from 'path';
import { StyleSynthesis, LearnedStyle } from './learn';
import { KnowledgeBase, ExtractedPrinciple } from './ingest';

// ============================================================================
// Types
// ============================================================================

export type SkillCategory = 
  | 'typography'
  | 'color' 
  | 'layout'
  | 'spacing'
  | 'motion'
  | 'imagery'
  | 'voice'
  | 'composite';

export interface Skill {
  id: string;
  name: string;
  category: SkillCategory;
  description: string;
  
  // Source of the skill
  source: {
    type: 'learned-style' | 'knowledge-base' | 'manual' | 'composite';
    refs: string[]; // IDs of source materials
  };
  
  // What the skill contains
  content: SkillContent;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  tags: string[];
  confidence: number; // 0-1
}

export interface SkillContent {
  // Principles/rules to follow
  principles: SkillPrinciple[];
  
  // Parameters/settings
  parameters?: Record<string, unknown>;
  
  // Examples of application
  examples?: SkillExample[];
  
  // Things to avoid
  avoid?: string[];
  
  // Child skills (for composite skills)
  children?: string[]; // Skill IDs
}

export interface SkillPrinciple {
  rule: string;
  priority: 'required' | 'recommended' | 'optional';
  context?: string; // When this applies
}

export interface SkillExample {
  description: string;
  input: string;
  output: string;
  explanation?: string;
}

export interface SkillSet {
  name: string;
  description: string;
  skills: string[]; // Skill IDs in priority order
  overrides?: Record<string, unknown>; // Parameter overrides
}

// ============================================================================
// Skill Manager
// ============================================================================

export class SkillManager {
  private skillsPath: string;
  private skills: Map<string, Skill> = new Map();
  private skillSets: Map<string, SkillSet> = new Map();

  constructor(skillsPath: string = './skills') {
    this.skillsPath = skillsPath;
    this.loadSkills();
  }

  // --------------------------------------------------------------------------
  // CRUD Operations
  // --------------------------------------------------------------------------

  /**
   * Create a new skill from scratch
   */
  createSkill(skill: Omit<Skill, 'id' | 'createdAt' | 'updatedAt'>): Skill {
    const id = this.generateId(skill.name);
    const now = new Date().toISOString();
    
    const newSkill: Skill = {
      ...skill,
      id,
      createdAt: now,
      updatedAt: now,
    };

    this.skills.set(id, newSkill);
    this.saveSkill(newSkill);
    return newSkill;
  }

  /**
   * Create a skill from a learned visual style
   */
  fromLearnedStyle(style: LearnedStyle, category: SkillCategory): Skill {
    const synthesis = style.synthesis;
    
    // Extract category-specific content
    let content: SkillContent;
    
    switch (category) {
      case 'typography':
        content = {
          principles: [
            { rule: `Display font: ${synthesis.typography.displayFont}`, priority: 'required' },
            { rule: `Body font: ${synthesis.typography.bodyFont}`, priority: 'required' },
            { rule: `Hierarchy: ${synthesis.typography.hierarchy}`, priority: 'recommended' },
            ...synthesis.typography.recommendations.map(r => ({ 
              rule: r, 
              priority: 'recommended' as const
            })),
          ],
          parameters: {
            displayFont: synthesis.typography.displayFont,
            bodyFont: synthesis.typography.bodyFont,
          },
        };
        break;
        
      case 'color':
        content = {
          principles: [
            { rule: `Primary color: ${synthesis.color.primary}`, priority: 'required' },
            { rule: `Secondary: ${synthesis.color.secondary}`, priority: 'required' },
            { rule: `Accent: ${synthesis.color.accent}`, priority: 'required' },
            { rule: `Palette type: ${synthesis.color.palette}`, priority: 'recommended' },
            ...synthesis.color.recommendations.map(r => ({ 
              rule: r, 
              priority: 'recommended' as const
            })),
          ],
          parameters: {
            primary: synthesis.color.primary,
            secondary: synthesis.color.secondary,
            accent: synthesis.color.accent,
            neutrals: synthesis.color.neutrals,
          },
        };
        break;
        
      case 'layout':
        content = {
          principles: [
            { rule: `Structure: ${synthesis.layout.structure}`, priority: 'required' },
            { rule: `Density: ${synthesis.layout.density}`, priority: 'recommended' },
            { rule: `Whitespace: ${synthesis.layout.whitespace}`, priority: 'recommended' },
            ...synthesis.layout.recommendations.map(r => ({ 
              rule: r, 
              priority: 'recommended' as const
            })),
          ],
          parameters: {
            structure: synthesis.layout.structure,
            density: synthesis.layout.density,
            whitespace: synthesis.layout.whitespace,
          },
        };
        break;
        
      case 'motion':
        content = {
          principles: [
            { rule: `Energy level: ${synthesis.motion.energy}`, priority: 'required' },
            { rule: `Style: ${synthesis.motion.style}`, priority: 'required' },
            ...synthesis.motion.recommendations.map(r => ({ 
              rule: r, 
              priority: 'recommended' as const
            })),
          ],
          parameters: {
            energy: synthesis.motion.energy,
            style: synthesis.motion.style,
          },
        };
        break;
        
      case 'imagery':
        content = {
          principles: [
            { rule: `Style: ${synthesis.imagery.style}`, priority: 'required' },
            { rule: `Treatment: ${synthesis.imagery.treatment}`, priority: 'required' },
            ...synthesis.imagery.recommendations.map(r => ({ 
              rule: r, 
              priority: 'recommended' as const
            })),
          ],
        };
        break;
        
      default:
        content = { principles: [] };
    }

    return this.createSkill({
      name: `${style.name} ${category}`,
      category,
      description: `${category} principles extracted from ${style.name} visual references`,
      source: {
        type: 'learned-style',
        refs: [style.name],
      },
      content,
      tags: synthesis.keywords,
      confidence: 0.85,
    });
  }

  /**
   * Create a skill from a knowledge base
   */
  fromKnowledgeBase(kb: KnowledgeBase, category: SkillCategory): Skill {
    // Filter principles by category
    const relevantPrinciples = kb.principles.filter(p => 
      p.category === category || p.category === 'general'
    );

    const content: SkillContent = {
      principles: relevantPrinciples.flatMap(p => 
        p.rules.map(rule => ({
          rule,
          priority: 'recommended' as const,
          context: p.title,
        }))
      ),
      examples: relevantPrinciples.flatMap(p =>
        (p.examples ?? []).map(ex => ({
          description: p.title,
          input: 'See source document',
          output: ex,
        }))
      ),
      avoid: relevantPrinciples.flatMap(p => p.contraindications ?? []),
    };

    return this.createSkill({
      name: `${kb.name} ${category}`,
      category,
      description: `${category} principles from ${kb.name}`,
      source: {
        type: 'knowledge-base',
        refs: [kb.name],
      },
      content,
      tags: kb.tags,
      confidence: 0.9,
    });
  }

  /**
   * Compose multiple skills into a new composite skill
   */
  compose(
    name: string,
    skillIds: string[],
    description?: string,
    overrides?: Record<string, unknown>
  ): Skill {
    const childSkills = skillIds.map(id => this.skills.get(id)).filter(Boolean) as Skill[];
    
    if (childSkills.length === 0) {
      throw new Error('No valid skills found to compose');
    }

    // Merge principles with deduplication
    const allPrinciples: SkillPrinciple[] = [];
    const seenRules = new Set<string>();
    
    for (const skill of childSkills) {
      for (const principle of skill.content.principles) {
        const normalized = principle.rule.toLowerCase().trim();
        if (!seenRules.has(normalized)) {
          seenRules.add(normalized);
          allPrinciples.push(principle);
        }
      }
    }

    // Merge parameters
    const mergedParams: Record<string, unknown> = {};
    for (const skill of childSkills) {
      Object.assign(mergedParams, skill.content.parameters ?? {});
    }
    Object.assign(mergedParams, overrides ?? {});

    // Merge avoid lists
    const mergedAvoid = [...new Set(childSkills.flatMap(s => s.content.avoid ?? []))];

    // Collect all tags
    const allTags = [...new Set(childSkills.flatMap(s => s.tags))];

    return this.createSkill({
      name,
      category: 'composite',
      description: description ?? `Composite skill combining: ${childSkills.map(s => s.name).join(', ')}`,
      source: {
        type: 'composite',
        refs: skillIds,
      },
      content: {
        principles: allPrinciples,
        parameters: mergedParams,
        avoid: mergedAvoid,
        children: skillIds,
      },
      tags: allTags,
      confidence: Math.min(...childSkills.map(s => s.confidence)),
    });
  }

  // --------------------------------------------------------------------------
  // Skill Sets (Named Combinations)
  // --------------------------------------------------------------------------

  /**
   * Create a named skill set for quick application
   * Example: "swiss-modernism" = typography-swiss + color-swiss + layout-grid
   */
  createSkillSet(
    name: string,
    skillIds: string[],
    description?: string,
    overrides?: Record<string, unknown>
  ): SkillSet {
    const set: SkillSet = {
      name,
      description: description ?? `Skill set: ${name}`,
      skills: skillIds,
      overrides,
    };

    this.skillSets.set(name, set);
    this.saveSkillSet(set);
    return set;
  }

  /**
   * Get all skills in a skill set, resolved and merged
   */
  resolveSkillSet(name: string): Skill | null {
    const set = this.skillSets.get(name);
    if (!set) return null;

    return this.compose(set.name, set.skills, set.description, set.overrides);
  }

  // --------------------------------------------------------------------------
  // Query & Retrieval
  // --------------------------------------------------------------------------

  getSkill(id: string): Skill | null {
    return this.skills.get(id) ?? null;
  }

  getSkillsByCategory(category: SkillCategory): Skill[] {
    return Array.from(this.skills.values()).filter(s => s.category === category);
  }

  getSkillsByTag(tag: string): Skill[] {
    return Array.from(this.skills.values()).filter(s => s.tags.includes(tag));
  }

  searchSkills(query: string): Skill[] {
    const q = query.toLowerCase();
    return Array.from(this.skills.values()).filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.tags.some(t => t.toLowerCase().includes(q))
    );
  }

  listSkills(): Skill[] {
    return Array.from(this.skills.values());
  }

  listSkillSets(): SkillSet[] {
    return Array.from(this.skillSets.values());
  }

  // --------------------------------------------------------------------------
  // Export for Agent Context
  // --------------------------------------------------------------------------

  /**
   * Convert a skill to prompt context for the LLM
   */
  toPromptContext(skill: Skill): string {
    let context = `## Skill: ${skill.name}\n\n`;
    context += `${skill.description}\n\n`;
    
    // Required rules
    const required = skill.content.principles.filter(p => p.priority === 'required');
    if (required.length > 0) {
      context += `### Required Rules\n`;
      for (const p of required) {
        context += `- ${p.rule}\n`;
      }
      context += '\n';
    }

    // Recommended rules
    const recommended = skill.content.principles.filter(p => p.priority === 'recommended');
    if (recommended.length > 0) {
      context += `### Recommended Rules\n`;
      for (const p of recommended) {
        context += `- ${p.rule}\n`;
      }
      context += '\n';
    }

    // Things to avoid
    if (skill.content.avoid?.length) {
      context += `### Avoid\n`;
      for (const a of skill.content.avoid) {
        context += `- ${a}\n`;
      }
      context += '\n';
    }

    // Parameters
    if (skill.content.parameters && Object.keys(skill.content.parameters).length > 0) {
      context += `### Parameters\n`;
      context += '```json\n' + JSON.stringify(skill.content.parameters, null, 2) + '\n```\n\n';
    }

    return context;
  }

  /**
   * Get combined prompt context for multiple skills
   */
  getCombinedContext(skillIds: string[]): string {
    const skills = skillIds.map(id => this.getSkill(id)).filter(Boolean) as Skill[];
    return skills.map(s => this.toPromptContext(s)).join('\n---\n\n');
  }

  // --------------------------------------------------------------------------
  // Persistence
  // --------------------------------------------------------------------------

  private loadSkills(): void {
    if (!existsSync(this.skillsPath)) {
      mkdirSync(this.skillsPath, { recursive: true });
      return;
    }

    // Load individual skills
    const skillsDir = join(this.skillsPath, 'skills');
    if (existsSync(skillsDir)) {
      for (const file of readdirSync(skillsDir)) {
        if (file.endsWith('.json')) {
          try {
            const skill = JSON.parse(readFileSync(join(skillsDir, file), 'utf-8'));
            this.skills.set(skill.id, skill);
          } catch {
            console.warn(`Failed to load skill: ${file}`);
          }
        }
      }
    }

    // Load skill sets
    const setsDir = join(this.skillsPath, 'sets');
    if (existsSync(setsDir)) {
      for (const file of readdirSync(setsDir)) {
        if (file.endsWith('.json')) {
          try {
            const set = JSON.parse(readFileSync(join(setsDir, file), 'utf-8'));
            this.skillSets.set(set.name, set);
          } catch {
            console.warn(`Failed to load skill set: ${file}`);
          }
        }
      }
    }
  }

  private saveSkill(skill: Skill): void {
    const skillsDir = join(this.skillsPath, 'skills');
    mkdirSync(skillsDir, { recursive: true });
    const filePath = join(skillsDir, `${skill.id}.json`);
    writeFileSync(filePath, JSON.stringify(skill, null, 2));
  }

  private saveSkillSet(set: SkillSet): void {
    const setsDir = join(this.skillsPath, 'sets');
    mkdirSync(setsDir, { recursive: true });
    const filePath = join(setsDir, `${set.name.toLowerCase().replace(/\s+/g, '-')}.json`);
    writeFileSync(filePath, JSON.stringify(set, null, 2));
  }

  private generateId(name: string): string {
    const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const timestamp = Date.now().toString(36);
    return `${base}-${timestamp}`;
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createSkillManager(skillsPath?: string): SkillManager {
  return new SkillManager(skillsPath);
}
