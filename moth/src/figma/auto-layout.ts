/**
 * Moth Auto-Layout Engine
 * 
 * Provides utilities for generating Figma auto-layout specifications
 * and converting component patterns to Figma-compatible structures.
 */

// ============================================================================
// Types
// ============================================================================

export type LayoutDirection = 'HORIZONTAL' | 'VERTICAL';
export type LayoutAlign = 'MIN' | 'CENTER' | 'MAX' | 'STRETCH' | 'BASELINE';
export type LayoutDistribute = 'PACKED' | 'SPACE_BETWEEN';
export type SizingMode = 'FIXED' | 'HUG' | 'FILL';

export interface AutoLayoutSpec {
  mode: 'HORIZONTAL' | 'VERTICAL';
  primaryAxisSizingMode: SizingMode;
  counterAxisSizingMode: SizingMode;
  primaryAxisAlignItems: LayoutAlign;
  counterAxisAlignItems: LayoutAlign;
  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  paddingLeft: number;
  itemSpacing: number;
  layoutWrap?: 'NO_WRAP' | 'WRAP';
}

export interface FrameSpec {
  name: string;
  type: 'FRAME';
  autoLayout?: AutoLayoutSpec;
  width?: number | 'FILL' | 'HUG';
  height?: number | 'FILL' | 'HUG';
  fills?: FillSpec[];
  strokes?: StrokeSpec[];
  cornerRadius?: number | CornerRadii;
  effects?: EffectSpec[];
  children?: (FrameSpec | TextSpec | InstanceSpec)[];
}

export interface TextSpec {
  name: string;
  type: 'TEXT';
  characters: string;
  style: string; // Text style reference
  fills?: FillSpec[];
  width?: number | 'FILL' | 'HUG';
}

export interface InstanceSpec {
  name: string;
  type: 'INSTANCE';
  componentKey: string;
  overrides?: Record<string, unknown>;
  width?: number | 'FILL' | 'HUG';
}

export interface FillSpec {
  type: 'SOLID' | 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'IMAGE';
  color?: { r: number; g: number; b: number; a?: number };
  opacity?: number;
  visible?: boolean;
  boundVariables?: {
    color?: { type: 'VARIABLE_ALIAS'; id: string };
  };
}

export interface StrokeSpec {
  type: 'SOLID';
  color: { r: number; g: number; b: number; a?: number };
  boundVariables?: {
    color?: { type: 'VARIABLE_ALIAS'; id: string };
  };
}

export interface CornerRadii {
  topLeft: number;
  topRight: number;
  bottomRight: number;
  bottomLeft: number;
}

export interface EffectSpec {
  type: 'DROP_SHADOW' | 'INNER_SHADOW' | 'LAYER_BLUR' | 'BACKGROUND_BLUR';
  visible: boolean;
  radius?: number;
  offset?: { x: number; y: number };
  color?: { r: number; g: number; b: number; a: number };
}

// ============================================================================
// Layout Presets
// ============================================================================

export const LAYOUT_PRESETS = {
  // Stack layouts
  stackVertical: (gap: number = 16): Partial<AutoLayoutSpec> => ({
    mode: 'VERTICAL',
    primaryAxisAlignItems: 'MIN',
    counterAxisAlignItems: 'STRETCH',
    itemSpacing: gap,
  }),

  stackHorizontal: (gap: number = 16): Partial<AutoLayoutSpec> => ({
    mode: 'HORIZONTAL',
    primaryAxisAlignItems: 'MIN',
    counterAxisAlignItems: 'CENTER',
    itemSpacing: gap,
  }),

  // Center layouts
  centerBoth: (): Partial<AutoLayoutSpec> => ({
    mode: 'VERTICAL',
    primaryAxisAlignItems: 'CENTER',
    counterAxisAlignItems: 'CENTER',
    itemSpacing: 0,
  }),

  // Space between layouts
  spaceBetween: (): Partial<AutoLayoutSpec> => ({
    mode: 'HORIZONTAL',
    primaryAxisAlignItems: 'CENTER',
    counterAxisAlignItems: 'CENTER',
  }),

  // Card layout
  card: (padding: number = 16, gap: number = 12): Partial<AutoLayoutSpec> => ({
    mode: 'VERTICAL',
    primaryAxisAlignItems: 'MIN',
    counterAxisAlignItems: 'STRETCH',
    paddingTop: padding,
    paddingRight: padding,
    paddingBottom: padding,
    paddingLeft: padding,
    itemSpacing: gap,
  }),

  // Button layout
  button: (paddingX: number = 16, paddingY: number = 8, gap: number = 8): Partial<AutoLayoutSpec> => ({
    mode: 'HORIZONTAL',
    primaryAxisAlignItems: 'CENTER',
    counterAxisAlignItems: 'CENTER',
    paddingTop: paddingY,
    paddingRight: paddingX,
    paddingBottom: paddingY,
    paddingLeft: paddingX,
    itemSpacing: gap,
  }),

  // Header layout
  header: (paddingX: number = 24, height: number = 64): Partial<AutoLayoutSpec> => ({
    mode: 'HORIZONTAL',
    primaryAxisAlignItems: 'CENTER',
    counterAxisAlignItems: 'CENTER',
    paddingLeft: paddingX,
    paddingRight: paddingX,
    paddingTop: 0,
    paddingBottom: 0,
    itemSpacing: 0,
  }),
} as const;

// ============================================================================
// Layout Builders
// ============================================================================

/**
 * Build a complete auto-layout specification with defaults
 */
export function buildAutoLayout(
  partial: Partial<AutoLayoutSpec>
): AutoLayoutSpec {
  return {
    mode: partial.mode ?? 'VERTICAL',
    primaryAxisSizingMode: partial.primaryAxisSizingMode ?? 'HUG',
    counterAxisSizingMode: partial.counterAxisSizingMode ?? 'HUG',
    primaryAxisAlignItems: partial.primaryAxisAlignItems ?? 'MIN',
    counterAxisAlignItems: partial.counterAxisAlignItems ?? 'MIN',
    paddingTop: partial.paddingTop ?? 0,
    paddingRight: partial.paddingRight ?? 0,
    paddingBottom: partial.paddingBottom ?? 0,
    paddingLeft: partial.paddingLeft ?? 0,
    itemSpacing: partial.itemSpacing ?? 0,
    layoutWrap: partial.layoutWrap,
  };
}

/**
 * Create padding configuration (supports single value or TRBL)
 */
export function padding(
  value: number | { top?: number; right?: number; bottom?: number; left?: number }
): Pick<AutoLayoutSpec, 'paddingTop' | 'paddingRight' | 'paddingBottom' | 'paddingLeft'> {
  if (typeof value === 'number') {
    return {
      paddingTop: value,
      paddingRight: value,
      paddingBottom: value,
      paddingLeft: value,
    };
  }
  return {
    paddingTop: value.top ?? 0,
    paddingRight: value.right ?? 0,
    paddingBottom: value.bottom ?? 0,
    paddingLeft: value.left ?? 0,
  };
}

/**
 * Create symmetric padding (X and Y)
 */
export function paddingXY(x: number, y: number): Pick<AutoLayoutSpec, 'paddingTop' | 'paddingRight' | 'paddingBottom' | 'paddingLeft'> {
  return {
    paddingTop: y,
    paddingRight: x,
    paddingBottom: y,
    paddingLeft: x,
  };
}

// ============================================================================
// Frame Builders
// ============================================================================

/**
 * Create a frame specification
 */
export function frame(
  name: string,
  options: {
    layout?: Partial<AutoLayoutSpec>;
    width?: number | 'FILL' | 'HUG';
    height?: number | 'FILL' | 'HUG';
    fill?: string; // Variable ID or hex color
    stroke?: string;
    radius?: number | CornerRadii;
    shadow?: 'sm' | 'md' | 'lg' | 'xl';
    children?: (FrameSpec | TextSpec | InstanceSpec)[];
  } = {}
): FrameSpec {
  const spec: FrameSpec = {
    name,
    type: 'FRAME',
    children: options.children,
  };

  if (options.layout) {
    spec.autoLayout = buildAutoLayout(options.layout);
  }

  if (options.width) spec.width = options.width;
  if (options.height) spec.height = options.height;

  if (options.fill) {
    spec.fills = [createFill(options.fill)];
  }

  if (options.stroke) {
    spec.strokes = [{ type: 'SOLID', color: parseColor(options.stroke) }];
  }

  if (options.radius) {
    spec.cornerRadius = options.radius;
  }

  if (options.shadow) {
    spec.effects = [createShadow(options.shadow)];
  }

  return spec;
}

/**
 * Create a text specification
 */
export function text(
  name: string,
  characters: string,
  style: string,
  options: {
    fill?: string;
    width?: number | 'FILL' | 'HUG';
  } = {}
): TextSpec {
  const spec: TextSpec = {
    name,
    type: 'TEXT',
    characters,
    style,
  };

  if (options.fill) {
    spec.fills = [createFill(options.fill)];
  }

  if (options.width) {
    spec.width = options.width;
  }

  return spec;
}

/**
 * Create a component instance specification
 */
export function instance(
  name: string,
  componentKey: string,
  overrides?: Record<string, unknown>
): InstanceSpec {
  return {
    name,
    type: 'INSTANCE',
    componentKey,
    overrides,
  };
}

// ============================================================================
// Fill & Effect Helpers
// ============================================================================

function createFill(value: string): FillSpec {
  // Check if it's a variable reference
  if (value.startsWith('{') && value.endsWith('}')) {
    return {
      type: 'SOLID',
      color: { r: 0, g: 0, b: 0 },
      boundVariables: {
        color: { type: 'VARIABLE_ALIAS', id: value.slice(1, -1) },
      },
    };
  }

  // Parse as hex color
  return {
    type: 'SOLID',
    color: parseColor(value),
  };
}

function parseColor(hex: string): { r: number; g: number; b: number; a?: number } {
  hex = hex.replace('#', '');
  
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }

  return {
    r: parseInt(hex.slice(0, 2), 16) / 255,
    g: parseInt(hex.slice(2, 4), 16) / 255,
    b: parseInt(hex.slice(4, 6), 16) / 255,
    a: hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1,
  };
}

const SHADOW_PRESETS: Record<string, EffectSpec> = {
  sm: {
    type: 'DROP_SHADOW',
    visible: true,
    radius: 2,
    offset: { x: 0, y: 1 },
    color: { r: 0, g: 0, b: 0, a: 0.05 },
  },
  md: {
    type: 'DROP_SHADOW',
    visible: true,
    radius: 6,
    offset: { x: 0, y: 4 },
    color: { r: 0, g: 0, b: 0, a: 0.1 },
  },
  lg: {
    type: 'DROP_SHADOW',
    visible: true,
    radius: 15,
    offset: { x: 0, y: 10 },
    color: { r: 0, g: 0, b: 0, a: 0.1 },
  },
  xl: {
    type: 'DROP_SHADOW',
    visible: true,
    radius: 25,
    offset: { x: 0, y: 20 },
    color: { r: 0, g: 0, b: 0, a: 0.1 },
  },
};

function createShadow(size: 'sm' | 'md' | 'lg' | 'xl'): EffectSpec {
  return SHADOW_PRESETS[size];
}

// ============================================================================
// Component Pattern Builders
// ============================================================================

/**
 * Create a button component structure
 */
export function buttonPattern(options: {
  variant: 'primary' | 'secondary' | 'ghost' | 'destructive';
  size: 'sm' | 'md' | 'lg';
  label: string;
  hasIcon?: boolean;
  iconPosition?: 'left' | 'right';
}): FrameSpec {
  const sizeConfig = {
    sm: { paddingX: 12, paddingY: 6, gap: 6, height: 32 },
    md: { paddingX: 16, paddingY: 8, gap: 8, height: 40 },
    lg: { paddingX: 24, paddingY: 12, gap: 8, height: 48 },
  };

  const config = sizeConfig[options.size];
  
  const children: (TextSpec | InstanceSpec)[] = [];
  
  if (options.hasIcon && options.iconPosition === 'left') {
    children.push(instance('icon', 'icon-placeholder'));
  }
  
  children.push(text('label', options.label, `Body/${options.size === 'lg' ? 'Medium' : 'Small'}`));
  
  if (options.hasIcon && options.iconPosition === 'right') {
    children.push(instance('icon', 'icon-placeholder'));
  }

  return frame(`Button/${options.variant}/${options.size}`, {
    layout: {
      ...LAYOUT_PRESETS.button(config.paddingX, config.paddingY, config.gap),
    },
    height: config.height,
    fill: `{button.variant.${options.variant}.background}`,
    radius: options.size === 'sm' ? 4 : 8,
    children,
  });
}

/**
 * Create a card component structure
 */
export function cardPattern(options: {
  variant: 'elevated' | 'outlined' | 'filled';
  hasMedia?: boolean;
  hasActions?: boolean;
}): FrameSpec {
  const children: FrameSpec[] = [];

  if (options.hasMedia) {
    children.push(
      frame('media', {
        width: 'FILL',
        height: 200,
        fill: '{color.neutral.200}',
      })
    );
  }

  children.push(
    frame('content', {
      layout: LAYOUT_PRESETS.stackVertical(12),
      width: 'FILL',
      children: [
        text('title', 'Card Title', 'Heading/H3'),
        text('description', 'Card description goes here with some sample text.', 'Body/Small'),
      ],
    })
  );

  if (options.hasActions) {
    children.push(
      frame('actions', {
        layout: LAYOUT_PRESETS.stackHorizontal(12),
        width: 'FILL',
      })
    );
  }

  const variantStyles = {
    elevated: { fill: '{color.background.primary}', shadow: 'lg' as const },
    outlined: { fill: '{color.background.primary}', stroke: '{color.border.primary}' },
    filled: { fill: '{color.background.secondary}' },
  };

  return frame(`Card/${options.variant}`, {
    layout: LAYOUT_PRESETS.card(24, 16),
    width: 320,
    radius: 16,
    ...variantStyles[options.variant],
    children,
  });
}

/**
 * Create a section component structure
 */
export function sectionPattern(options: {
  hasEyebrow?: boolean;
  hasTitle?: boolean;
  hasDescription?: boolean;
  contentSlot?: FrameSpec;
}): FrameSpec {
  const headerChildren: TextSpec[] = [];

  if (options.hasEyebrow) {
    headerChildren.push(text('eyebrow', 'EYEBROW', 'Label/Large'));
  }
  if (options.hasTitle) {
    headerChildren.push(text('title', 'Section Title', 'Heading/H2'));
  }
  if (options.hasDescription) {
    headerChildren.push(text('description', 'Section description with more details about this section.', 'Body/Medium'));
  }

  const children: FrameSpec[] = [];
  
  if (headerChildren.length > 0) {
    children.push(
      frame('section-header', {
        layout: LAYOUT_PRESETS.stackVertical(8),
        width: 'FILL',
        children: headerChildren,
      })
    );
  }

  if (options.contentSlot) {
    children.push(options.contentSlot);
  }

  return frame('Section', {
    layout: {
      ...LAYOUT_PRESETS.stackVertical(32),
      ...paddingXY(80, 64),
    },
    width: 'FILL',
    children,
  });
}

