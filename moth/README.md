# Moth — Generative Brand Identity Agent

> A junior designer agent that ideates, explores, and produces brand identity systems through Figma using structured design intelligence.

```
 _____ ______   ________  _________  ___  ___     
|\   _ \  _   \|\   __  \|\___   ___\\  \|\  \    
\ \  \\\__\ \  \ \  \|\  \|___ \  \_\ \  \\\  \   
 \ \  \\|__| \  \ \  \\\  \   \ \  \ \ \   __  \  
  \ \  \    \ \  \ \  \\\  \   \ \  \ \ \  \ \  \ 
   \ \__\    \ \__\ \_______\   \ \__\ \ \__\ \__\
    \|__|     \|__|\|_______|    \|__|  \|__|\|__|
```

## Philosophy

Moth operates as a **junior designer with infinite patience and structured thinking**. It doesn't replace creative direction—it amplifies it by:

- **Generating variations** at scale while respecting brand constraints
- **Maintaining consistency** through rigorous token-based systems
- **Exploring edges** of the design space systematically
- **Documenting decisions** with rationale chains

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CREATIVE DIRECTOR                             │
│                    (Strategy + Art Direction)                       │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         MOTH AGENT                                  │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐            │
│  │   IDEATION    │  │   EXECUTION   │  │   CRITIQUE    │            │
│  │    ENGINE     │──│    ENGINE     │──│    ENGINE     │            │
│  └───────────────┘  └───────────────┘  └───────────────┘            │
│          │                  │                  │                    │
│          └──────────────────┼──────────────────┘                    │
│                             │                                       │
│  ┌──────────────────────────┴──────────────────────────┐            │
│  │              DESIGN SYSTEM KERNEL                   │            │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐    │            │
│  │  │ TOKENS  │ │  GRID   │ │ MOTION  │ │  IMAGE  │    │            │
│  │  │ SYSTEM  │ │  LOGIC  │ │ SYSTEM  │ │ SYSTEM  │    │            │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘    │            │
│  └─────────────────────────────────────────────────────┘            │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      FIGMA INTEGRATION LAYER                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐      │
│  │   VARIABLES     │  │   COMPONENTS    │  │   AUTO-LAYOUT   │      │
│  │   (Color/Space) │  │   (Patterns)    │  │   (Structure)   │      │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Core Modules

### 1. Design Token System (`/src/tokens/`)
Atomic values that form the DNA of the brand.

- **Color primitives** → Semantic color roles → Component-level tokens
- **Spacing scale** → Layout rhythm → Component spacing
- **Typography scale** → Text styles → Component type tokens
- **Radii, shadows, borders** → Surface treatments

### 2. Component Patterns (`/src/components/`)
Reusable patterns built on auto-layout principles.

- **Atomic components** (buttons, inputs, badges)
- **Molecules** (cards, list items, media objects)
- **Organisms** (headers, sections, forms)
- **Templates** (page layouts, grid systems)

### 3. Grid Logic (`/guidelines/grid-logic.md`)
Spatial philosophy that governs all layout decisions.

- Baseline grid adherence
- Column/gutter relationships
- Responsive scaling logic
- Content density modes

### 4. Motion System (`/src/motion/`)
Choreographed movement that expresses brand personality.

- Timing functions (curves)
- Duration scales
- Orchestration patterns
- State transitions

### 5. Image Treatment (`/guidelines/image-treatment.md`)
Visual language for photography and imagery.

- Crop ratios
- Color treatments
- Overlay strategies
- Focal point logic

---

## Agent Capabilities

### Ideation Mode
```
Input:  "Explore logo lockups for a fintech brand targeting Gen-Z"
Output: 12 structured variations with rationale, organized by personality axis
```

### Execution Mode
```
Input:  "Build a hero section using our tokens for product launch"
Output: Figma component with proper variables, auto-layout, and documentation
```

### Critique Mode
```
Input:  [Figma frame selection]
Output: Design audit with token compliance, accessibility, and improvement suggestions
```

---

## Usage

```bash
# Initialize the agent with a brand context
npm run moth:init --brand="acme-corp"

# Start ideation session
npm run moth:ideate --brief="landing page concepts"

# Execute a design task
npm run moth:execute --task="build hero section"

# Run design audit
npm run moth:critique --frame="https://figma.com/..."
```

---

## File Structure

```
design-agent/
├── README.md
├── package.json
├── moth.config.json          # Agent configuration
├── src/
│   ├── agent/
│   │   ├── ideation.ts       # Concept generation engine
│   │   ├── execution.ts      # Figma production engine
│   │   ├── critique.ts       # Design audit engine
│   │   └── prompts/          # System prompts
│   ├── figma/
│   │   ├── client.ts         # Figma API integration
│   │   ├── variables.ts      # Variable management
│   │   ├── components.ts     # Component creation
│   │   └── auto-layout.ts    # Layout engine
│   ├── tokens/
│   │   ├── primitives.json   # Raw values
│   │   ├── semantic.json     # Meaning-mapped tokens
│   │   └── component.json    # Component-level tokens
│   ├── components/
│   │   ├── patterns.json     # Component pattern definitions
│   │   └── variants.json     # Variant configurations
│   └── motion/
│       ├── curves.json       # Easing functions
│       ├── durations.json    # Timing scales
│       └── choreography.json # Orchestration patterns
└── guidelines/
    ├── brand-voice.md        # Brand personality rules
    ├── grid-logic.md         # Spatial philosophy
    ├── typography.md         # Type system rules
    ├── color-theory.md       # Color application rules
    ├── motion-principles.md  # Animation guidelines
    └── image-treatment.md    # Photography rules
```

---

## The Moth Design Philosophy

> "Constraints are the canvas. Tokens are the paint. The agent is the hand that never tires."

Moth believes in:

1. **Systematic creativity** — Exploration within guardrails
2. **Traceable decisions** — Every choice has a rationale
3. **Composable thinking** — Complex from simple
4. **Respectful automation** — Augment, never replace

---

## License

MIT — Build beautiful things.

