/**
 * Moth Variable Manager
 * 
 * Transforms design tokens into Figma variables and syncs them.
 */

import { FigmaClient, FigmaVariable, FigmaVariableCollection } from './client';

// ============================================================================
// Types
// ============================================================================

export interface DesignToken {
  $value: unknown;
  $type: string;
  $description?: string;
}

export interface TokenGroup {
  [key: string]: DesignToken | TokenGroup;
}

export interface VariableDefinition {
  name: string;
  resolvedType: 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN';
  valuesByMode: Record<string, unknown>;
  scopes: string[];
  description?: string;
}

export interface CollectionDefinition {
  name: string;
  modes: string[];
  variables: VariableDefinition[];
}

// ============================================================================
// Token Type Mappings
// ============================================================================

const TOKEN_TYPE_TO_VARIABLE_TYPE: Record<string, VariableDefinition['resolvedType']> = {
  'color': 'COLOR',
  'dimension': 'FLOAT',
  'spacing': 'FLOAT',
  'size': 'FLOAT',
  'number': 'FLOAT',
  'fontWeight': 'FLOAT',
  'opacity': 'FLOAT',
  'string': 'STRING',
  'fontFamily': 'STRING',
  'boolean': 'BOOLEAN',
};

const TOKEN_TYPE_TO_SCOPES: Record<string, string[]> = {
  'color': ['ALL_FILLS', 'STROKE_COLOR', 'EFFECT_COLOR'],
  'dimension': ['GAP', 'WIDTH_HEIGHT', 'CORNER_RADIUS'],
  'spacing': ['GAP', 'WIDTH_HEIGHT'],
  'size': ['WIDTH_HEIGHT'],
  'radius': ['CORNER_RADIUS'],
  'opacity': ['OPACITY'],
  'fontFamily': ['FONT_FAMILY'],
  'fontWeight': ['FONT_WEIGHT'],
};

// ============================================================================
// Token Parsing
// ============================================================================

/**
 * Check if a value is a token (has $value and $type)
 */
function isToken(value: unknown): value is DesignToken {
  return (
    typeof value === 'object' &&
    value !== null &&
    '$value' in value &&
    '$type' in value
  );
}

/**
 * Parse a token value, resolving references
 */
function parseTokenValue(
  value: unknown,
  type: string,
  allTokens: TokenGroup
): unknown {
  // Handle string references like {color.brand.500}
  if (typeof value === 'string' && value.startsWith('{') && value.endsWith('}')) {
    const path = value.slice(1, -1).split('.');
    let resolved: unknown = allTokens;
    
    for (const segment of path) {
      if (typeof resolved === 'object' && resolved !== null && segment in resolved) {
        resolved = (resolved as Record<string, unknown>)[segment];
      } else {
        console.warn(`Could not resolve token reference: ${value}`);
        return value;
      }
    }
    
    if (isToken(resolved)) {
      return parseTokenValue(resolved.$value, resolved.$type, allTokens);
    }
    return resolved;
  }

  // Handle color values
  if (type === 'color' && typeof value === 'string') {
    return hexToFigmaColor(value);
  }

  // Handle dimension values (strip 'px')
  if ((type === 'dimension' || type === 'spacing' || type === 'size') && typeof value === 'string') {
    return parseFloat(value.replace('px', ''));
  }

  return value;
}

/**
 * Convert hex color to Figma color format
 */
function hexToFigmaColor(hex: string): { r: number; g: number; b: number; a: number } {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Handle shorthand hex
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  
  // Parse RGB values
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
  
  return { r, g, b, a };
}

// ============================================================================
// Token Transformation
// ============================================================================

/**
 * Flatten nested token structure into variable definitions
 */
export function flattenTokens(
  tokens: TokenGroup,
  prefix: string = '',
  allTokens?: TokenGroup
): VariableDefinition[] {
  const variables: VariableDefinition[] = [];
  const root = allTokens ?? tokens;

  for (const [key, value] of Object.entries(tokens)) {
    // Skip meta fields
    if (key.startsWith('$')) continue;

    const path = prefix ? `${prefix}/${key}` : key;

    if (isToken(value)) {
      // This is a token definition
      const resolvedType = TOKEN_TYPE_TO_VARIABLE_TYPE[value.$type];
      if (!resolvedType) {
        console.warn(`Unknown token type: ${value.$type} for ${path}`);
        continue;
      }

      const parsedValue = parseTokenValue(value.$value, value.$type, root);
      const scopes = TOKEN_TYPE_TO_SCOPES[value.$type] ?? ['ALL_SCOPES'];

      variables.push({
        name: path,
        resolvedType,
        valuesByMode: { 'default': parsedValue },
        scopes,
        description: value.$description,
      });
    } else if (typeof value === 'object' && value !== null) {
      // This is a nested group, recurse
      variables.push(...flattenTokens(value as TokenGroup, path, root));
    }
  }

  return variables;
}

/**
 * Group variables by collection (first path segment)
 */
export function groupByCollection(
  variables: VariableDefinition[]
): Map<string, VariableDefinition[]> {
  const collections = new Map<string, VariableDefinition[]>();

  for (const variable of variables) {
    const [collection] = variable.name.split('/');
    
    if (!collections.has(collection)) {
      collections.set(collection, []);
    }
    collections.get(collection)!.push(variable);
  }

  return collections;
}

// ============================================================================
// Sync Operations
// ============================================================================

export class VariableManager {
  private client: FigmaClient;

  constructor(client: FigmaClient) {
    this.client = client;
  }

  /**
   * Get current variables from Figma
   */
  async getCurrentVariables(): Promise<{
    variables: Record<string, FigmaVariable>;
    collections: Record<string, FigmaVariableCollection>;
  }> {
    return this.client.getVariables();
  }

  /**
   * Sync token definitions to Figma variables
   */
  async syncTokens(tokens: TokenGroup): Promise<{
    created: number;
    updated: number;
    unchanged: number;
  }> {
    const stats = { created: 0, updated: 0, unchanged: 0 };

    // Flatten tokens to variables
    const variables = flattenTokens(tokens);
    const collections = groupByCollection(variables);

    // Get current state from Figma
    const { variables: existingVars, collections: existingColls } = 
      await this.getCurrentVariables();

    // Build lookup maps
    const existingVarsByName = new Map<string, FigmaVariable>();
    for (const v of Object.values(existingVars)) {
      existingVarsByName.set(v.name, v);
    }

    const existingCollsByName = new Map<string, FigmaVariableCollection>();
    for (const c of Object.values(existingColls)) {
      existingCollsByName.set(c.name, c);
    }

    // Process each collection
    for (const [collectionName, collectionVars] of collections) {
      let collection = existingCollsByName.get(collectionName);

      // Create collection if it doesn't exist
      if (!collection) {
        await this.client.postVariables({
          variableCollections: [{
            action: 'CREATE',
            name: collectionName,
          }],
        });
        
        // Re-fetch to get the new collection ID
        const { collections: newColls } = await this.getCurrentVariables();
        collection = Object.values(newColls).find(c => c.name === collectionName);
      }

      if (!collection) {
        console.error(`Failed to create/find collection: ${collectionName}`);
        continue;
      }

      // Get the default mode
      const defaultModeId = collection.modes[0]?.modeId;
      if (!defaultModeId) {
        console.error(`Collection ${collectionName} has no modes`);
        continue;
      }

      // Sync variables in this collection
      for (const varDef of collectionVars) {
        const existing = existingVarsByName.get(varDef.name);

        if (!existing) {
          // Create new variable
          await this.client.postVariables({
            variables: [{
              action: 'CREATE',
              name: varDef.name,
              variableCollectionId: collection.id,
              resolvedType: varDef.resolvedType,
              scopes: varDef.scopes,
              valuesByMode: {
                [defaultModeId]: varDef.valuesByMode['default'],
              },
            }],
          });
          stats.created++;
        } else {
          // Check if update needed
          const existingValue = existing.valuesByMode[defaultModeId];
          const newValue = varDef.valuesByMode['default'];

          if (JSON.stringify(existingValue) !== JSON.stringify(newValue)) {
            await this.client.postVariables({
              variables: [{
                action: 'UPDATE',
                id: existing.id,
                valuesByMode: {
                  [defaultModeId]: newValue,
                },
              }],
            });
            stats.updated++;
          } else {
            stats.unchanged++;
          }
        }
      }
    }

    return stats;
  }

  /**
   * Add a new mode to a collection (e.g., dark mode)
   */
  async addMode(
    collectionName: string,
    modeName: string,
    modeValues: Record<string, unknown>
  ): Promise<void> {
    const { collections } = await this.getCurrentVariables();
    const collection = Object.values(collections).find(c => c.name === collectionName);

    if (!collection) {
      throw new Error(`Collection not found: ${collectionName}`);
    }

    // Create the new mode
    await this.client.postVariables({
      variableModes: [{
        action: 'CREATE',
        name: modeName,
        variableCollectionId: collection.id,
      }],
    });

    // Re-fetch to get the new mode ID
    const { variables, collections: updatedColls } = await this.getCurrentVariables();
    const updatedCollection = Object.values(updatedColls).find(c => c.name === collectionName);
    const newMode = updatedCollection?.modes.find(m => m.name === modeName);

    if (!newMode) {
      throw new Error(`Failed to create mode: ${modeName}`);
    }

    // Update variables with new mode values
    for (const [varName, value] of Object.entries(modeValues)) {
      const variable = Object.values(variables).find(v => v.name === varName);
      if (variable) {
        await this.client.postVariables({
          variables: [{
            action: 'UPDATE',
            id: variable.id,
            valuesByMode: {
              ...variable.valuesByMode,
              [newMode.modeId]: value,
            },
          }],
        });
      }
    }
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createVariableManager(client: FigmaClient): VariableManager {
  return new VariableManager(client);
}

