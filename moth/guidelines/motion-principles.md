# Motion Principles

> "Animation is not about making things move. It's about making things feel alive."

---

## Core Beliefs

### 1. Motion is Communication

Every animation should answer one of these:
- **Where did this come from?** (spatial origin)
- **What just happened?** (feedback)
- **What should I focus on?** (attention)
- **What's the relationship?** (connection)

### 2. Less is More

The best animation is invisible. Users should feel something changed, not see it animate.

### 3. Respect User Preferences

Always honor `prefers-reduced-motion`. Provide instant alternatives.

---

## The Motion Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│  LEVEL 4: Delight                                               │
│  Celebrations, Easter eggs, onboarding moments                  │
│  (Rarest, most expressive)                                      │
├─────────────────────────────────────────────────────────────────┤
│  LEVEL 3: Choreography                                          │
│  Page transitions, modal entrances, hero reveals                │
│  (Coordinated, narrative)                                       │
├─────────────────────────────────────────────────────────────────┤
│  LEVEL 2: Transitions                                           │
│  State changes, expanding panels, navigation                    │
│  (Functional, meaningful)                                       │
├─────────────────────────────────────────────────────────────────┤
│  LEVEL 1: Micro-interactions                                    │
│  Hovers, clicks, toggles, ripples                               │
│  (Instant, subtle)                                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Duration Guidelines

### The Speed Ladder

| Duration | Milliseconds | Use Case |
|----------|--------------|----------|
| Instant | 0-50ms | Color changes, micro-feedback |
| Fast | 50-150ms | Button states, small UI changes |
| Normal | 150-300ms | Standard transitions |
| Slow | 300-500ms | Large UI changes, reveals |
| Dramatic | 500-1000ms | Page transitions, hero moments |

### Duration Rules

1. **Faster for small, slower for large**
   - Small elements → fast transitions
   - Large elements → slower transitions

2. **Faster for exits than entrances**
   - Enter: Give time to notice
   - Exit: Get out of the way quickly

3. **Match cognitive importance**
   - Important change → slower (let it register)
   - Trivial change → faster (don't waste time)

---

## Easing Principles

### When to Use Each Curve

```
Ease-Out (Decelerate)
├── Use: Elements ENTERING the screen
├── Feel: "Arriving confidently"
└── Example: Modal appearing, dropdown opening

Ease-In (Accelerate)
├── Use: Elements LEAVING the screen
├── Feel: "Departing smoothly"
└── Example: Modal dismissing, notification exiting

Ease-In-Out
├── Use: Elements MOVING within the screen
├── Feel: "Smooth journey"
└── Example: Carousel sliding, drawer moving

Linear
├── Use: Non-spatial properties
├── Feel: "Consistent rate"
└── Example: Opacity fades, color transitions

Spring
├── Use: Emphasis, playful interactions
├── Feel: "Natural and bouncy"
└── Example: Toggle switch, like button
```

### Never Use

- Linear for movement (feels robotic)
- Slow ease-in for entrances (feels sluggish)
- Bounce on every element (feels chaotic)

---

## Choreography Patterns

### Staggered Reveals

Elements enter in sequence, creating rhythm:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   ████████████████████   ← Header enters first (0ms)           │
│                                                                 │
│   ██████████   ← Card 1 enters (100ms delay)                   │
│                                                                 │
│                ██████████   ← Card 2 enters (150ms delay)      │
│                                                                 │
│                            ██████████   ← Card 3 (200ms delay) │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Stagger Patterns:**
- Sequential (left-to-right, top-to-bottom)
- Diagonal (natural reading flow)
- Center-out (radial expansion)
- Random (organic feel)

### Shared Element Transitions

Elements that persist between states should transform, not disappear and reappear:

```
State A                    State B
┌────────────────┐        ┌────────────────────────┐
│ ┌────┐         │   →    │     ┌──────────────┐   │
│ │ 🖼️ │         │   →    │     │     🖼️       │   │
│ └────┘         │   →    │     └──────────────┘   │
│ Title          │        │     Title              │
│ Description... │        │     Full description   │
└────────────────┘        └────────────────────────┘

The image MORPHS between states (scale, position)
Not: fade out + fade in
```

### Parent-Child Relationships

When a parent moves, children should follow:

```
✓ Good: Menu slides in → items stagger in after container settles
✗ Bad: Menu slides in while items animate independently
```

---

## Component-Specific Motion

### Buttons

```
Hover (Fast, 100ms):
├── Background color transition
├── Optional: slight scale (1.02) or lift (translateY -2px)

Active (Instant, 50ms):
├── Scale down (0.98)
├── Darker background

Focus (Fast, 150ms):
├── Focus ring appears with soft expansion
```

### Modals

```
Enter (Normal, 200-300ms):
├── Backdrop: fade in (linear)
├── Container: scale from 0.95 + fade in (ease-out)

Exit (Fast, 150ms):
├── Container: fade out (ease-in)
├── Backdrop: fade out (follows container)
```

### Dropdowns

```
Open (Fast, 150ms):
├── Container: scale Y from 0.95 + fade in (spring)
├── Transform origin: top

Close (Faster, 100ms):
├── Fade out (ease-in)
```

### Toast Notifications

```
Enter (Normal, 200ms):
├── Slide up from below + fade in (ease-out)

Auto-dismiss countdown:
├── Progress bar (linear, matches timeout)

Exit (Fast, 150ms):
├── Slide up + fade out (ease-in)
├── Or: slide to side if swiped
```

### Skeleton Loading

```
Shimmer effect:
├── Linear gradient moving left to right
├── Duration: 1.5s
├── Ease: linear
├── Repeat: infinite
```

---

## State Transitions

### Loading States

```
Enter loading:
├── Content fades out (fast, 100ms)
├── Spinner fades in (fast, 100ms)

Exit loading:
├── Spinner fades out (fast, 100ms)
├── Content fades in (normal, 200ms)
├── Consider: skeleton → content transition
```

### Error States

```
Error appear:
├── Shake effect (short, 300ms)
├── Error message slides down + fades in

Error resolve:
├── Success indicator briefly appears
├── Normal state restores
```

### Empty States

```
Content → Empty:
├── Content fades out
├── Empty state fades in with slight delay

Empty → Content:
├── Empty state fades out quickly
├── Content items stagger in
```

---

## Performance Guidelines

### Hardware Acceleration

Only animate these properties for GPU acceleration:

```
✓ transform (translate, scale, rotate)
✓ opacity

✗ width, height (causes layout)
✗ margin, padding (causes layout)
✗ top, left (causes layout)
✗ box-shadow (expensive paint)
```

### `will-change` Usage

```css
/* Apply before animation starts */
.element-about-to-animate {
  will-change: transform, opacity;
}

/* Remove after animation completes */
.element-done-animating {
  will-change: auto;
}
```

### Throttling Complex Animations

- Limit to 60fps target
- Reduce particle counts on low-end devices
- Disable parallax on mobile
- Respect `prefers-reduced-motion`

---

## Reduced Motion

### Strategy

When `prefers-reduced-motion: reduce`:

1. **Disable non-essential motion**
   - Parallax effects
   - Auto-playing animations
   - Hover micro-interactions

2. **Replace with instant changes**
   ```css
   @media (prefers-reduced-motion: reduce) {
     *, *::before, *::after {
       animation-duration: 0.01ms !important;
       transition-duration: 0.01ms !important;
     }
   }
   ```

3. **Keep essential feedback**
   - Focus indicators (can use opacity)
   - State changes (instant color shifts)
   - Loading states (static spinner or text)

### Testing Checklist

- [ ] All animations disabled
- [ ] Interface still fully functional
- [ ] State changes still visible
- [ ] No jarring instant transitions where gradual is expected

---

## Motion Anti-Patterns

### ❌ Never

- Animate layout properties (width, height, top, left)
- Use animations longer than 500ms for UI
- Animate multiple things simultaneously without choreography
- Apply motion to elements that repeat hundreds of times
- Use motion that contradicts spatial logic

### ✓ Always

- Match duration to element size
- Use ease-out for entrances
- Use ease-in for exits
- Test with reduced motion enabled
- Consider the emotional impact

