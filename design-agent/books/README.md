# books

Source material isn't included in this repo. Drop your own copies of the books and references listed below into this folder, and the skills will read from them.

# Design Books Directory

Put your design book PDFs here. Each book trains a specific SKILL.

## How It Works

```
┌─────────────────────────────────────────────────────────────────────┐
│                     BOOK → SKILL PIPELINE                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   YOU DROP A PDF HERE                                               │
│         │                                                           │
│         ▼                                                           │
│   ┌─────────────────────────────────────────────────────────┐      │
│   │  books/                                                  │      │
│   │  ├── thinking_with_type.pdf       → typography skill    │      │
│   │  ├── grid_systems.pdf             → layout skill        │      │
│   │  ├── interaction_of_color.pdf     → color skill         │      │
│   │  └── designing_brand_identity.pdf → brand_strategy skill│      │
│   └─────────────────────────────────────────────────────────┘      │
│         │                                                           │
│         ▼  (book_processor.py)                                     │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────┐      │
│   │  AI EXTRACTION                                           │      │
│   │  • Reads the PDF                                         │      │
│   │  • Chunks into sections                                  │      │
│   │  • Uses Claude to extract:                              │      │
│   │    - PRINCIPLES (actionable rules)                       │      │
│   │    - CONCEPTS (ideas to understand)                      │      │
│   │    - VOCABULARY (design terms)                           │      │
│   └─────────────────────────────────────────────────────────┘      │
│         │                                                           │
│         ▼                                                           │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────┐      │
│   │  SKILL KNOWLEDGE                                         │      │
│   │  skills/typography/book_knowledge.json                  │      │
│   │                                                          │      │
│   │  Contains:                                               │      │
│   │  {                                                       │      │
│   │    "principles": [                                       │      │
│   │      {                                                   │      │
│   │        "name": "Maintain Baseline Grid",                │      │
│   │        "rule": "Align all text to a consistent          │      │
│   │                 baseline grid",                          │      │
│   │        "why": "Creates vertical rhythm...",             │      │
│   │        "when_to_break": "Display type for emphasis"     │      │
│   │      }                                                   │      │
│   │    ]                                                     │      │
│   │  }                                                       │      │
│   └─────────────────────────────────────────────────────────┘      │
│         │                                                           │
│         ▼  (agent uses this knowledge)                             │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────┐      │
│   │  AGENT CAN NOW:                                          │      │
│   │  • Apply typography principles when designing            │      │
│   │  • Critique designs against book knowledge               │      │
│   │  • Explain WHY a design choice is good/bad              │      │
│   └─────────────────────────────────────────────────────────┘      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Put your PDF in this folder

```
books/
└── thinking_with_type.pdf
```

### 2. Run the processor

```python
from training.book_processor import process_design_book

# Process a typography book → feeds "typography" skill
process_design_book(
    pdf_path="books/thinking_with_type.pdf",
    skill="typography",
    book_title="Thinking with Type"
)
```

Or from command line:

```bash
cd "Junior Design Agent"
python -m training.book_processor "books/thinking_with_type.pdf" typography "Thinking with Type"
```

### 3. Check the output

The extracted knowledge is saved to:
- `knowledge/books/typography_thinking_with_type.json` (full extraction)
- `skills/typography/book_knowledge.json` (linked to skill)

## Recommended Books by Skill

### Typography
- "Thinking with Type" - Ellen Lupton
- "The Elements of Typographic Style" - Robert Bringhurst
- "Stop Stealing Sheep" - Erik Spiekermann

### Layout / Grid Systems
- "Grid Systems in Graphic Design" - Josef Müller-Brockmann
- "Making and Breaking the Grid" - Timothy Samara
- "Layout Essentials" - Beth Tondreau

### Color
- "Interaction of Color" - Josef Albers
- "Color Design Workbook" - Adams Morioka

### Logo / Brand
- "Logo Design Love" - David Airey
- "Designing Brand Identity" - Alina Wheeler
- "Symbol" - Angus Hyland

### Strategic Design
- "Designing Brand Identity" - Alina Wheeler
- "The Brand Gap" - Marty Neumeier
- "Design Is a Job" - Mike Monteiro

### Composition
- "Principles of Form and Design" - Wucius Wong
- "Design Elements" - Timothy Samara

## What Gets Extracted

For each book, the processor extracts:

### Principles (Actionable Rules)
```json
{
  "name": "Line Length for Readability",
  "description": "Optimal line length for comfortable reading",
  "rule": "Keep body text lines between 45-75 characters",
  "why": "Lines too long cause reader to lose their place; too short disrupts rhythm",
  "examples": ["Newspaper columns are narrow", "Books use wider margins"],
  "when_to_apply": "Body text, articles, long-form content",
  "when_to_break": "Display headlines, captions, UI labels"
}
```

### Concepts (Ideas to Understand)
```json
{
  "name": "X-Height",
  "explanation": "The height of lowercase letters without ascenders or descenders. Affects perceived size and readability."
}
```

### Vocabulary (Terms)
```json
{
  "kerning": "Adjusting space between individual letter pairs",
  "tracking": "Uniform spacing across a range of letters",
  "leading": "Vertical space between lines of text"
}
```

## Tips

1. **Start with one book per skill** - You can always add more later
2. **Higher quality PDFs work better** - Text-based PDFs, not scanned images
3. **Processing takes time** - Each book may take 5-10 minutes (API calls)
4. **Review the output** - The extraction isn't perfect, you may want to edit

## Cost Estimate

Processing uses Claude API:
- ~$0.50-2.00 per book (depending on length)
- A 300-page book ≈ 50-100 API calls
