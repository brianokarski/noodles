# Momentum - Porsche 997 Market Tracker

MVP data pipeline for tracking market momentum of Porsche 911 997.1 and 997.2 manual Carreras using auction data.

## Cohorts Tracked

| Cohort ID | Generation | Years | Trim |
|-----------|------------|-------|------|
| `997.1_manual_carrera` | 997.1 | 2005-2008 | Carrera |
| `997.1_manual_carrera_s` | 997.1 | 2005-2008 | Carrera S |
| `997.1_manual_carrera_4s` | 997.1 | 2005-2008 | Carrera 4S |
| `997.2_manual_carrera` | 997.2 | 2009-2012 | Carrera |
| `997.2_manual_carrera_s` | 997.2 | 2009-2012 | Carrera S |
| `997.2_manual_carrera_4s` | 997.2 | 2009-2012 | Carrera 4S |

## Setup

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

## Usage

### 1. Scrape Cars & Bids

```bash
python scrape_carsandbids.py
```

This will:
- Search Cars & Bids for Porsche 911 auctions
- Parse each auction page for details
- Filter to only 997.1/997.2 manual Carreras
- Save results to `data/snapshots/YYYY-MM-DD.json`

### 2. View Aggregated Stats

```bash
python aggregate.py
```

Prints per-cohort statistics (median price, count, range).

### 3. Generate Charts

```bash
python chart.py
```

Creates:
- `momentum_chart.html` - Timeline showing median prices and individual listings
- `cohort_comparison.html` - Bar chart comparing cohorts

## Data Format

Each normalized listing:

```json
{
  "source": "carsandbids",
  "date": "2024-01-15",
  "cohort": "997.2_manual_carrera_s",
  "price": 45500,
  "mileage": 62000,
  "url": "https://carsandbids.com/auctions/..."
}
```

## Architecture

```
├── cohorts.py          # Cohort definitions and colors
├── normalize.py        # Raw listing → cohort classification
├── scrape_carsandbids.py  # Cars & Bids scraper
├── aggregate.py        # Compute statistics from snapshots
├── chart.py            # Plotly visualization
└── data/
    └── snapshots/      # Daily JSON snapshots
        └── YYYY-MM-DD.json
```

## Adding New Sources

1. Create a new scraper (e.g., `scrape_bringatrailer.py`)
2. Output raw listings with: `year`, `title`, `transmission`, `mileage`, `price`, `end_date`, `url`, `source`
3. Use `normalize.normalize_listings()` to classify into cohorts
4. Save to snapshots using the same format

## Adding New Cohorts

Edit `cohorts.py` to add new cohort definitions:

```python
COHORT_DEFINITIONS["991_manual_carrera"] = {
    "generation": "991",
    "years": range(2012, 2016),
    "trims": ["carrera"],
    "transmission": "manual",
    "display_name": "991 Carrera",
    "color": "#17becf",
}
```

Then update `normalize.py` if the parsing logic needs adjustment.
