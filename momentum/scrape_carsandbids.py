"""
Cars & Bids scraper for Porsche 911 997 listings.
Uses Playwright for browser automation to bypass bot detection.
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
REQUEST_DELAY = 3.0  # seconds between page loads
BASE_URL = "https://carsandbids.com"

# Directory for snapshots
SNAPSHOT_DIR = Path(__file__).parent / "data" / "snapshots"


def search_porsche_911_auctions(page: Page, max_pages: int = 20) -> List[str]:
    """
    Search Cars & Bids for completed Porsche 911 997 auctions.
    Uses the direct 997 search page and scrolls to load all results.
    """
    auction_urls = []
    
    # Direct URL for Porsche 997 911 listings
    search_url = "https://carsandbids.com/search/porsche/997-911"
    
    print(f"Loading Porsche 997 search page...")
    
    try:
        page.goto(search_url, wait_until="networkidle", timeout=60000)
        time.sleep(3)
    except Exception as e:
        print(f"Error loading search page: {e}")
        return []
    
    # Scroll down to load more results (infinite scroll)
    print("Scrolling to load all results...")
    last_count = 0
    scroll_attempts = 0
    max_scroll_attempts = 30
    
    while scroll_attempts < max_scroll_attempts:
        # Scroll to bottom
        page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        time.sleep(2)
        
        # Count current auction links
        links = page.query_selector_all('a[href*="/auctions/"]')
        current_count = len(links)
        
        print(f"  Scroll {scroll_attempts + 1}: Found {current_count} links")
        
        if current_count == last_count:
            # No new content loaded, we're done
            break
        
        last_count = current_count
        scroll_attempts += 1
    
    # Extract all auction URLs
    links = page.query_selector_all('a[href*="/auctions/"]')
    
    for link in links:
        href = link.get_attribute("href")
        if href and re.match(r".*/auctions/[A-Za-z0-9]+/.*", href):
            full_url = f"{BASE_URL}{href}" if href.startswith("/") else href
            if full_url not in auction_urls:
                auction_urls.append(full_url)
    
    print(f"\nFound {len(auction_urls)} unique Porsche 997 auction URLs")
    return auction_urls


def parse_auction_page(page: Page, url: str) -> Optional[dict]:
    """
    Parse a single auction page and extract listing data.
    """
    try:
        page.goto(url, wait_until="networkidle", timeout=30000)
        time.sleep(2)  # Let JS fully render
    except Exception as e:
        print(f"Error loading {url}: {e}")
        return None
    
    # Get page content
    content = page.content()
    text_content = page.inner_text("body")
    
    # Extract title
    title_elem = page.query_selector("h1")
    if not title_elem:
        return None
    title = title_elem.inner_text().strip()
    
    # Extract year from title
    year_match = re.search(r"\b(19|20)\d{2}\b", title)
    year = int(year_match.group()) if year_match else None
    
    # Quick filter: only 997-era years
    if not year or year < 2005 or year > 2012:
        return None
    
    # Extract sold price - try multiple approaches
    price = None
    
    # Look for price in the page text using common patterns
    price_patterns = [
        r"Sold\s+[Ff]or\s+\$?([\d,]+)",
        r"Winning\s+[Bb]id[:\s]+\$?([\d,]+)",
        r"Final\s+[Bb]id[:\s]+\$?([\d,]+)",
        r"Bid\s+to\s+\$?([\d,]+)",
        r"\$(\d{2,3},\d{3})\b",  # Match $XX,XXX or $XXX,XXX format
    ]
    
    for pattern in price_patterns:
        match = re.search(pattern, text_content)
        if match:
            price_str = match.group(1).replace(",", "")
            try:
                price = int(price_str)
                if price > 5000:  # Sanity check - real car prices
                    break
            except ValueError:
                continue
    
    # If still no price, look for any large dollar amount
    if not price:
        all_prices = re.findall(r"\$([\d,]+)", text_content)
        for p in all_prices:
            try:
                val = int(p.replace(",", ""))
                if 10000 < val < 500000:  # Reasonable car price range
                    price = val
                    break
            except ValueError:
                continue
    
    # Extract mileage from quick facts
    mileage = None
    mileage_match = re.search(r"([\d,]+)\s*(?:Miles|miles|mi)", content)
    if mileage_match:
        mileage = int(mileage_match.group(1).replace(",", ""))
    
    # Extract transmission
    transmission = ""
    if re.search(r"6-[Ss]peed\s+[Mm]anual|Manual|6MT", content):
        transmission = "6-speed manual"
    elif re.search(r"7-[Ss]peed\s+[Mm]anual|7MT", content):
        transmission = "7-speed manual"
    elif re.search(r"PDK|pdk", content):
        transmission = "PDK"
    elif re.search(r"[Tt]iptronic", content):
        transmission = "Tiptronic"
    elif re.search(r"[Aa]utomatic", content):
        transmission = "Automatic"
    
    # Extract auction end date
    end_date = None
    date_match = re.search(
        r"(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}",
        content
    )
    if date_match:
        try:
            parsed_date = datetime.strptime(date_match.group().replace(",", ""), "%B %d %Y")
            end_date = parsed_date.strftime("%Y-%m-%d")
        except ValueError:
            pass
    
    if not end_date:
        end_date = datetime.now().strftime("%Y-%m-%d")
    
    # Only return if we have essential data
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
        "source": "carsandbids",
    }


def scrape_all_listings(max_pages: int = 5) -> List[dict]:
    """
    Main scraping function using Playwright browser.
    """
    print("Starting Cars & Bids scrape with browser automation...")
    
    with sync_playwright() as p:
        # Launch browser (headless)
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = context.new_page()
        
        # Get auction URLs
        urls = search_porsche_911_auctions(page, max_pages=max_pages)
        print(f"\nFound {len(urls)} total auction URLs")
        
        # Parse each auction
        raw_listings = []
        for i, url in enumerate(urls, 1):
            print(f"Parsing auction {i}/{len(urls)}: {url}")
            listing = parse_auction_page(page, url)
            if listing:
                raw_listings.append(listing)
                trans_str = listing['transmission'] or 'unknown trans'
                print(f"  → {listing['year']} {trans_str} ${listing['price']:,}")
            time.sleep(REQUEST_DELAY)
        
        browser.close()
    
    print(f"\nParsed {len(raw_listings)} valid 997-era listings")
    
    # Normalize to target cohorts
    normalized = normalize_listings(raw_listings)
    print(f"Normalized to {len(normalized)} target cohort listings (manual Carreras only)")
    
    return normalized


def save_snapshot(listings: List[dict], date: str = None) -> Path:
    """
    Save listings to a dated snapshot file.
    """
    if date is None:
        date = datetime.now().strftime("%Y-%m-%d")
    
    SNAPSHOT_DIR.mkdir(parents=True, exist_ok=True)
    filepath = SNAPSHOT_DIR / f"{date}.json"
    
    with open(filepath, "w") as f:
        json.dump(listings, f, indent=2)
    
    print(f"Saved snapshot to {filepath}")
    return filepath


def main():
    """Run the scraper and save results."""
    listings = scrape_all_listings(max_pages=5)
    
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
