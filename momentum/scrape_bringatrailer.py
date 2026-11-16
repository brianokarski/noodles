"""
Bring a Trailer scraper for Porsche 911 997 listings.
Uses Playwright for browser automation.
"""

import json
import re
import time
from datetime import datetime
from pathlib import Path
from typing import Optional, List

from playwright.sync_api import sync_playwright, Page

from normalize import normalize_listings

# Respect rate limits
REQUEST_DELAY = 3.0
BASE_URL = "https://bringatrailer.com"

# Directory for snapshots
SNAPSHOT_DIR = Path(__file__).parent / "data" / "snapshots"


def search_997_auctions(page: Page) -> List[str]:
    """
    Load Bring a Trailer 997 Carrera page and get all auction result URLs.
    """
    auction_urls = []
    
    # Direct URL for 997 Carrera listings
    search_url = "https://bringatrailer.com/porsche/997-911-carrera/"
    
    print(f"Loading BaT 997 Carrera page...")
    
    try:
        page.goto(search_url, wait_until="domcontentloaded", timeout=30000)
        time.sleep(5)  # Let JS render
    except Exception as e:
        print(f"Error loading search page: {e}")
        return []
    
    # Click "Show More" to load auction results
    print("Loading auction results...")
    
    # Try to click "Show More" button multiple times to load more results
    for i in range(10):
        try:
            show_more = page.query_selector('button:has-text("Show More")')
            if show_more and show_more.is_visible():
                show_more.click()
                time.sleep(2)
                print(f"  Clicked Show More ({i+1})")
            else:
                break
        except Exception:
            break
    
    # Scroll to load more
    print("Scrolling to load more results...")
    for _ in range(5):
        page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        time.sleep(2)
    
    # Find all auction result links
    # BaT auction URLs look like: /listing/2009-porsche-911-carrera-s-coupe-6-speed/
    links = page.query_selector_all('a[href*="/listing/"]')
    
    for link in links:
        href = link.get_attribute("href")
        if href and "/listing/" in href and "porsche" in href.lower() and "911" in href.lower():
            full_url = f"{BASE_URL}{href}" if href.startswith("/") else href
            # Remove query params
            full_url = full_url.split("?")[0]
            if full_url not in auction_urls:
                auction_urls.append(full_url)
    
    print(f"\nFound {len(auction_urls)} unique 997 auction URLs")
    return auction_urls


def parse_auction_page(page: Page, url: str) -> Optional[dict]:
    """
    Parse a BaT auction page and extract listing data.
    """
    try:
        page.goto(url, wait_until="domcontentloaded", timeout=20000)
        time.sleep(3)
    except Exception as e:
        print(f"Error loading {url}: {e}")
        return None
    
    text_content = page.inner_text("body")
    
    # Extract title
    title_elem = page.query_selector("h1")
    if not title_elem:
        return None
    title = title_elem.inner_text().strip()
    
    # Extract year from title
    year_match = re.search(r"\b(19|20)\d{2}\b", title)
    year = int(year_match.group()) if year_match else None
    
    # Only 997-era years (2005-2012)
    if not year or year < 2005 or year > 2012:
        return None
    
    # Extract sold price - BaT shows "Sold for $XX,XXX" or "Bid to $XX,XXX"
    price = None
    
    price_patterns = [
        r"Sold\s+for\s+\$?([\d,]+)",
        r"Winning\s+bid[:\s]+\$?([\d,]+)",
        r"Final\s+bid[:\s]+\$?([\d,]+)",
        r"Bid\s+to\s+\$?([\d,]+)",
        r"Result:\s*\$?([\d,]+)",
    ]
    
    for pattern in price_patterns:
        match = re.search(pattern, text_content, re.I)
        if match:
            price_str = match.group(1).replace(",", "")
            try:
                price = int(price_str)
                if price > 5000:
                    break
            except ValueError:
                continue
    
    # Fallback: look for price in specific elements
    if not price:
        price_elem = page.query_selector('.listing-available-info-value, .listing-stats-value')
        if price_elem:
            price_text = price_elem.inner_text()
            price_match = re.search(r"\$?([\d,]+)", price_text)
            if price_match:
                price = int(price_match.group(1).replace(",", ""))
    
    # Extract mileage
    mileage = None
    mileage_match = re.search(r"([\d,]+)\s*(?:Miles|miles|mi)\b", text_content)
    if mileage_match:
        mileage = int(mileage_match.group(1).replace(",", ""))
    
    # Extract transmission
    transmission = ""
    if re.search(r"6-[Ss]peed\s+[Mm]anual|6-Speed|6MT", title + " " + text_content):
        transmission = "6-speed manual"
    elif re.search(r"7-[Ss]peed\s+[Mm]anual|7-Speed|7MT", title + " " + text_content):
        transmission = "7-speed manual"
    elif re.search(r"PDK|pdk", title + " " + text_content):
        transmission = "PDK"
    elif re.search(r"[Tt]iptronic", title + " " + text_content):
        transmission = "Tiptronic"
    elif re.search(r"[Aa]utomatic", title + " " + text_content):
        transmission = "Automatic"
    
    # Extract auction end date
    end_date = None
    date_match = re.search(
        r"(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}",
        text_content
    )
    if date_match:
        try:
            parsed_date = datetime.strptime(date_match.group().replace(",", ""), "%B %d %Y")
            end_date = parsed_date.strftime("%Y-%m-%d")
        except ValueError:
            pass
    
    if not end_date:
        end_date = datetime.now().strftime("%Y-%m-%d")
    
    if not price or price == 0:
        print(f"  → No price found, skipping")
        return None
    
    return {
        "year": year,
        "title": title,
        "transmission": transmission,
        "mileage": mileage,
        "price": price,
        "end_date": end_date,
        "url": url,
        "source": "bringatrailer",
    }


def scrape_all_listings(max_auctions: int = 50) -> List[dict]:
    """
    Main scraping function using Playwright browser.
    """
    print("Starting Bring a Trailer scrape...")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = context.new_page()
        
        # Get auction URLs
        urls = search_997_auctions(page)
        
        # Limit to max_auctions
        urls = urls[:max_auctions]
        print(f"Processing {len(urls)} auctions...")
        
        # Parse each auction
        raw_listings = []
        for i, url in enumerate(urls, 1):
            print(f"Parsing auction {i}/{len(urls)}: {url.split('/')[-2]}")
            listing = parse_auction_page(page, url)
            if listing:
                raw_listings.append(listing)
                trans_str = listing['transmission'] or 'unknown trans'
                print(f"  → {listing['year']} {trans_str} ${listing['price']:,}")
            time.sleep(REQUEST_DELAY)
        
        browser.close()
    
    print(f"\nParsed {len(raw_listings)} valid 997-era listings from BaT")
    
    # Normalize to target cohorts
    normalized = normalize_listings(raw_listings)
    print(f"Normalized to {len(normalized)} target cohort listings")
    
    return normalized


def save_snapshot(listings: List[dict], date: str = None) -> Path:
    """
    Save listings to a dated snapshot file.
    Appends to existing snapshot if present.
    """
    if date is None:
        date = datetime.now().strftime("%Y-%m-%d")
    
    SNAPSHOT_DIR.mkdir(parents=True, exist_ok=True)
    filepath = SNAPSHOT_DIR / f"{date}.json"
    
    # Load existing data if present
    existing = []
    if filepath.exists():
        with open(filepath) as f:
            existing = json.load(f)
    
    # Merge, avoiding duplicates by URL
    existing_urls = {l.get("url") for l in existing}
    for listing in listings:
        if listing.get("url") not in existing_urls:
            existing.append(listing)
    
    with open(filepath, "w") as f:
        json.dump(existing, f, indent=2)
    
    print(f"Saved {len(existing)} total listings to {filepath}")
    return filepath


def main():
    """Run the scraper and save results."""
    listings = scrape_all_listings(max_auctions=40)
    
    if listings:
        save_snapshot(listings)
        print("\n=== Results ===")
        for listing in listings[:5]:
            mileage_str = f"{listing['mileage']:,} mi" if listing.get('mileage') else "N/A"
            print(f"  {listing['cohort']}: ${listing['price']:,} @ {mileage_str}")
        if len(listings) > 5:
            print(f"  ... and {len(listings) - 5} more")
    else:
        print("No matching listings found.")


if __name__ == "__main__":
    main()

