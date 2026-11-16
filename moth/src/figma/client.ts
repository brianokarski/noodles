/**
 * Moth Figma Client
 * 
 * Core integration layer for Figma REST API and plugin communication.
 * Handles authentication, file operations, and variable management.
 */

import axios, { AxiosInstance } from 'axios';
import { z } from 'zod';

// ============================================================================
// Types
// ============================================================================

export interface FigmaConfig {
  accessToken: string;
  fileKey: string;
  teamId?: string;
}

export interface FigmaNode {
  id: string;
  name: string;
  type: string;
  children?: FigmaNode[];
  [key: string]: unknown;
}

export interface FigmaFile {
  name: string;
  lastModified: string;
  document: FigmaNode;
  components: Record<string, FigmaComponent>;
  styles: Record<string, FigmaStyle>;
}

export interface FigmaComponent {
  key: string;
  name: string;
  description: string;
  componentSetId?: string;
}

export interface FigmaStyle {
  key: string;
  name: string;
  styleType: 'FILL' | 'TEXT' | 'EFFECT' | 'GRID';
  description: string;
}

export interface FigmaVariable {
  id: string;
  name: string;
  resolvedType: 'BOOLEAN' | 'FLOAT' | 'STRING' | 'COLOR';
  valuesByMode: Record<string, unknown>;
  scopes: string[];
}

export interface FigmaVariableCollection {
  id: string;
  name: string;
  modes: Array<{ modeId: string; name: string }>;
  variableIds: string[];
}

// ============================================================================
// Client
// ============================================================================

export class FigmaClient {
  private api: AxiosInstance;
  private fileKey: string;

  constructor(config: FigmaConfig) {
    this.fileKey = config.fileKey;
    this.api = axios.create({
      baseURL: 'https://api.figma.com/v1',
      headers: {
        'X-Figma-Token': config.accessToken,
      },
    });
  }

  // --------------------------------------------------------------------------
  // File Operations
  // --------------------------------------------------------------------------

  /**
   * Get the full Figma file document
   */
  async getFile(): Promise<FigmaFile> {
    const response = await this.api.get(`/files/${this.fileKey}`);
    return response.data;
  }

  /**
   * Get specific nodes by ID
   */
  async getNodes(nodeIds: string[]): Promise<Record<string, FigmaNode>> {
    const ids = nodeIds.join(',');
    const response = await this.api.get(`/files/${this.fileKey}/nodes`, {
      params: { ids },
    });
    return response.data.nodes;
  }

  /**
   * Get file images (exported)
   */
  async getImages(
    nodeIds: string[],
    options: {
      format?: 'jpg' | 'png' | 'svg' | 'pdf';
      scale?: number;
    } = {}
  ): Promise<Record<string, string>> {
    const { format = 'png', scale = 2 } = options;
    const ids = nodeIds.join(',');
    
    const response = await this.api.get(`/images/${this.fileKey}`, {
      params: { ids, format, scale },
    });
    return response.data.images;
  }

  // --------------------------------------------------------------------------
  // Component Operations
  // --------------------------------------------------------------------------

  /**
   * Get all components in the file
   */
  async getComponents(): Promise<FigmaComponent[]> {
    const response = await this.api.get(`/files/${this.fileKey}/components`);
    return response.data.meta.components;
  }

  /**
   * Get component sets (variant groups)
   */
  async getComponentSets(): Promise<unknown[]> {
    const response = await this.api.get(`/files/${this.fileKey}/component_sets`);
    return response.data.meta.component_sets;
  }

  // --------------------------------------------------------------------------
  // Style Operations
  // --------------------------------------------------------------------------

  /**
   * Get all styles in the file
   */
  async getStyles(): Promise<FigmaStyle[]> {
    const response = await this.api.get(`/files/${this.fileKey}/styles`);
    return response.data.meta.styles;
  }

  // --------------------------------------------------------------------------
  // Variable Operations
  // --------------------------------------------------------------------------

  /**
   * Get all variables and collections in the file
   */
  async getVariables(): Promise<{
    variables: Record<string, FigmaVariable>;
    collections: Record<string, FigmaVariableCollection>;
  }> {
    const response = await this.api.get(
      `/files/${this.fileKey}/variables/local`
    );
    return {
      variables: response.data.meta.variables,
      collections: response.data.meta.variableCollections,
    };
  }

  /**
   * Create or update variables (requires write access)
   */
  async postVariables(payload: {
    variableCollections?: Array<{
      action: 'CREATE' | 'UPDATE' | 'DELETE';
      id?: string;
      name?: string;
      initialModeId?: string;
    }>;
    variableModes?: Array<{
      action: 'CREATE' | 'UPDATE' | 'DELETE';
      id?: string;
      name?: string;
      variableCollectionId: string;
    }>;
    variables?: Array<{
      action: 'CREATE' | 'UPDATE' | 'DELETE';
      id?: string;
      name?: string;
      variableCollectionId?: string;
      resolvedType?: 'BOOLEAN' | 'FLOAT' | 'STRING' | 'COLOR';
      scopes?: string[];
      valuesByMode?: Record<string, unknown>;
    }>;
  }): Promise<void> {
    await this.api.post(`/files/${this.fileKey}/variables`, payload);
  }

  // --------------------------------------------------------------------------
  // Comments
  // --------------------------------------------------------------------------

  /**
   * Get comments on the file
   */
  async getComments(): Promise<unknown[]> {
    const response = await this.api.get(`/files/${this.fileKey}/comments`);
    return response.data.comments;
  }

  /**
   * Post a comment
   */
  async postComment(
    message: string,
    options?: {
      nodeId?: string;
      position?: { x: number; y: number };
    }
  ): Promise<void> {
    await this.api.post(`/files/${this.fileKey}/comments`, {
      message,
      client_meta: options?.nodeId
        ? { node_id: options.nodeId, node_offset: options.position }
        : undefined,
    });
  }

  // --------------------------------------------------------------------------
  // Dev Mode
  // --------------------------------------------------------------------------

  /**
   * Get dev resources (measurements, specs) for nodes
   */
  async getDevResources(nodeIds: string[]): Promise<unknown> {
    const response = await this.api.get(
      `/files/${this.fileKey}/dev_resources`,
      {
        params: { node_ids: nodeIds.join(',') },
      }
    );
    return response.data;
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createFigmaClient(config: FigmaConfig): FigmaClient {
  return new FigmaClient(config);
}

// ============================================================================
// Schema Validation
// ============================================================================

export const FigmaConfigSchema = z.object({
  accessToken: z.string().min(1, 'Figma access token is required'),
  fileKey: z.string().min(1, 'Figma file key is required'),
  teamId: z.string().optional(),
});

export function validateConfig(config: unknown): FigmaConfig {
  return FigmaConfigSchema.parse(config);
}

