# Moth Figma Plugin

The Figma plugin that executes Moth design specifications directly in your canvas.

## Setup

### 1. Install dependencies
```bash
cd figma-plugin
npm install
```

### 2. Build the plugin
```bash
npm run build
```

### 3. Import into Figma
1. Open Figma Desktop
2. Go to **Plugins → Development → Import plugin from manifest...**
3. Select `figma-plugin/manifest.json`

### 4. Run the plugin
- Right-click on canvas → **Plugins → Development → Moth**
- Or use the Quick Actions menu: **⌘/** then type "Moth"

## Usage

### Quick Actions
The plugin includes pre-built components:
- **Button** — Primary button with auto-layout
- **Card** — Elevated card with shadow
- **Hero** — Hero section layout
- **Header** — Navigation header

Click any to instantly create it on your canvas.

### From Moth CLI
1. Run ideation or execution in the CLI:
   ```bash
   npm run moth:ideate -- --brief="pricing card"
   ```

2. Copy the generated spec JSON

3. Open the Moth plugin in Figma

4. Paste the JSON and click **Execute Design**

### Spec Format

```json
{
  "type": "frame",
  "name": "My Component",
  "autoLayout": {
    "mode": "VERTICAL",
    "gap": 16,
    "paddingTop": 24,
    "paddingRight": 24,
    "paddingBottom": 24,
    "paddingLeft": 24
  },
  "fills": [{ 
    "type": "SOLID", 
    "color": { "r": 1, "g": 1, "b": 1 } 
  }],
  "cornerRadius": 12,
  "children": [
    {
      "type": "frame",
      "name": "title",
      "text": {
        "characters": "Hello World",
        "fontSize": 24,
        "fontWeight": 600
      }
    }
  ]
}
```

## Development

Watch mode for development:
```bash
npm run watch
```

After changes, reload the plugin in Figma (right-click → Plugins → Development → Moth).

## Features

- ✅ Create frames with auto-layout
- ✅ Apply fills, strokes, effects
- ✅ Create text with styling
- ✅ Nested children support
- ✅ Corner radius
- ✅ Drop shadows
- ✅ Component instances
- 🔜 Variable binding
- 🔜 Responsive constraints
- 🔜 WebSocket live sync

