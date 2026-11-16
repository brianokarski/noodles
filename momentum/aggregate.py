"""
Aggregation logic: compute per-day per-cohort statistics from snapshots.
"""

import json
from pathlib import Path
from statistics import median
from typing import List

from cohorts import COHORT_DEFINITIONS

SNAPSHOT_DIR = Path(__file__).parent / "data" / "snapshots"


def load_all_snapshots() -> List[dict]:
    """
    Load all snapshot files and return combined list of listings.
    """
    all_listings = []
    
    if not SNAPSHOT_DIR.exists():
        print(f"Snapshot directory not found: {SNAPSHOT_DIR}")
        return []
    
    snapshot_files = sorted(SNAPSHOT_DIR.glob("*.json"))
    print(f"Found {len(snapshot_files)} snapshot files")
    
    for filepath in snapshot_files:
        with open(filepath) as f:
            listings = json.load(f)
            all_listings.extend(listings)
            print(f"  Loaded {len(listings)} listings from {filepath.name}")
    
    # Deduplicate by URL (same listing might appear in multiple snapshots)
    seen_urls = set()
    unique_listings = []
    for listing in all_listings:
        url = listing.get("url")
        if url and url not in seen_urls:
            seen_urls.add(url)
            unique_listings.append(listing)
    
    print(f"Total unique listings: {len(unique_listings)}")
    return unique_listings


def aggregate_by_cohort_and_date(listings: List[dict]) -> dict:
    """
    Group listings by cohort and date, compute statistics.
    
    Returns:
        {
            "997.1_manual_carrera": {
                "2024-01-15": {
                    "median_price": 45000,
                    "count": 3,
                    "prices": [42000, 45000, 48000]
                },
                ...
            },
            ...
        }
    """
    # Initialize structure for all cohorts
    aggregated = {cohort_id: {} for cohort_id in COHORT_DEFINITIONS}
    
    for listing in listings:
        cohort = listing.get("cohort")
        date = listing.get("date")
        price = listing.get("price")
        
        if not all([cohort, date, price]):
            continue
        
        if cohort not in aggregated:
            continue
        
        if date not in aggregated[cohort]:
            aggregated[cohort][date] = {
                "prices": [],
                "mileages": [],
                "listings": [],
            }
        
        aggregated[cohort][date]["prices"].append(price)
        if listing.get("mileage"):
            aggregated[cohort][date]["mileages"].append(listing["mileage"])
        aggregated[cohort][date]["listings"].append(listing)
    
    # Compute statistics
    for cohort in aggregated:
        for date in aggregated[cohort]:
            prices = aggregated[cohort][date]["prices"]
            aggregated[cohort][date]["median_price"] = median(prices) if prices else 0
            aggregated[cohort][date]["count"] = len(prices)
            aggregated[cohort][date]["min_price"] = min(prices) if prices else 0
            aggregated[cohort][date]["max_price"] = max(prices) if prices else 0
    
    return aggregated


def get_cohort_summary(aggregated: dict) -> dict:
    """
    Compute overall summary stats per cohort.
    """
    summary = {}
    
    for cohort_id, dates in aggregated.items():
        all_prices = []
        for date_data in dates.values():
            all_prices.extend(date_data.get("prices", []))
        
        if all_prices:
            summary[cohort_id] = {
                "total_listings": len(all_prices),
                "median_price": median(all_prices),
                "min_price": min(all_prices),
                "max_price": max(all_prices),
                "date_range": (min(dates.keys()), max(dates.keys())) if dates else None,
            }
    
    return summary


def flatten_for_charting(aggregated: dict) -> List[dict]:
    """
    Flatten aggregated data for easy charting.
    Returns list of {cohort, date, median_price, count, prices} dicts.
    """
    flattened = []
    
    for cohort_id, dates in aggregated.items():
        for date, stats in dates.items():
            flattened.append({
                "cohort": cohort_id,
                "date": date,
                "median_price": stats["median_price"],
                "count": stats["count"],
                "prices": stats["prices"],
                "listings": stats["listings"],
            })
    
    # Sort by date
    flattened.sort(key=lambda x: x["date"])
    return flattened


def main():
    """Run aggregation and print summary."""
    listings = load_all_snapshots()
    
    if not listings:
        print("No listings found. Run scraper first.")
        return
    
    aggregated = aggregate_by_cohort_and_date(listings)
    summary = get_cohort_summary(aggregated)
    
    print("\n=== Cohort Summary ===")
    for cohort_id, stats in sorted(summary.items()):
        print(f"\n{cohort_id}:")
        print(f"  Listings: {stats['total_listings']}")
        print(f"  Median: ${stats['median_price']:,.0f}")
        print(f"  Range: ${stats['min_price']:,} - ${stats['max_price']:,}")
        if stats['date_range']:
            print(f"  Dates: {stats['date_range'][0]} to {stats['date_range'][1]}")


if __name__ == "__main__":
    main()
