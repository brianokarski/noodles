"""
PCAR Market scraper for Porsche 911 997.2 listings.
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

REQUEST_DELAY = 3.0
BASE_URL = "https://www.pcarmarket.com"
SNAPSHOT_DIR = Path(__file__).parent / "data" / "snapshots"


def search_997_auctions(page: Page) -> List[str]:
    """
    Load PCAR Market sold auctions for 997.2 (2009-2012).
    """
    auction_urls = []
    
    # Direct URL for 997.2 sold auctions
    search_url = "https://www.pcarmarket.com/auctions?auctionType=sold&make=porsche&startYear=2009&endYear=2012"
    
    print(f"Loading PCAR Market 997.2 sold auctions...")
    
    try:
        page.goto(search_url, wait_until="domcontentloaded", timeout=30000)
        time.sleep(5)
    except Exception as e:
        print(f"Error loading search page: {e}")
        return []
    
    # Scroll to load more results
    print("Scrolling to load results...")
    last_count = 0
    for i in range(20):
        page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        time.sleep(1.5)
        
        links = page.query_selector_all('a[href*="/auction/"]')
        if len(links) == last_count:
            break
        last_count = len(links)
        if i % 5 == 0:
            print(f"  Scroll {i+1}: {len(links)} links")
    
    # Try clicking "Load More" if present
    for _ in range(10):
        try:
            btn = page.query_selector('button:has-text("Load More"), a:has-text("Load More"), [class*="load-more"]')
            if btn and btn.is_visible():
                btn.click()
                time.sleep(2)
            else:
                break
        except:
            break
    
    # Get all auction links
    links = page.query_selector_all('a[href*="/auction/"]')
    
    for link in links:
        href = link.get_attribute("href")
        if href and "/auction/" in href:
            full_url = f"{BASE_URL}{href}" if href.startswith("/") else href
            full_url = full_url.split("?")[0]
            if full_url not in auction_urls and "911" in href.lower():
                auction_urls.append(full_url)
    
    print(f"\nFound {len(auction_urls)} unique 911 auction URLs")
    return auction_urls


def parse_auction_page(page: Page, url: str) -> Optional[dict]:
    """
    Parse a PCAR Market auction page.
    """
    try:
        page.goto(url, wait_until="domcontentloaded", timeout=20000)
        time.sleep(2)
    except Exception as e:
        print(f"Error loading {url}: {e}")
        return None
    
    text_content = page.inner_text("body")
    
    # Get title
    title_elem = page.query_selector("h1")
    if not title_elem:
        return None
    title = title_elem.inner_text().strip()
    
    # Year - 997.2 only (2009-2012)
    year_match = re.search(r"\b(200[9]|201[0-2])\b", title)
    if not year_match:
        return None
    year = int(year_match.group())
    
    # Skip non-target variants
    title_lower = title.lower()
    if any(x in title_lower for x in ["turbo", "gt3", "gt2", "targa", "cabriolet", "gts", "cabrio", "convertible", "speedster"]):
        return None
    
    # Must be a Carrera
    if "carrera" not in title_lower and "911" in title_lower:
        # Check if it's just a base 911 (still a Carrera)
        if not any(x in title_lower for x in ["carrera", "c2", "c4"]):
            return None
    
    # Extract sold price
    price = None
    
    # Look for sold price patterns
    price_patterns = [
        r"Sold\s+for\s+\$?([\d,]+)",
        r"Winning\s+bid[:\s]+\$?([\d,]+)",
        r"Final\s+price[:\s]+\$?([\d,]+)",
        r"Hammer\s+price[:\s]+\$?([\d,]+)",
        r"\$(\d{2,3},\d{3})\b",
    ]
    
    for pattern in price_patterns:
        match = re.search(pattern, text_content, re.I)
        if match:
            price = int(match.group(1).replace(",", ""))
            if price > 10000:
                break
    
    if not price or price < 10000:
        return None
    
    # Mileage
    mileage = None
    mileage_match = re.search(r"([\d,]+)\s*(?:Miles|miles|mi)\b", text_content)
    if mileage_match:
        mileage = int(mileage_match.group(1).replace(",", ""))
    
    # Transmission - skip PDK/Tiptronic
    if any(x in text_content.lower() for x in ["pdk", "tiptronic", "automatic"]):
        if "manual" not in text_content.lower():
            return None
    
    transmission = "6-speed manual"
    
    # Date
    end_date = datetime.now().strftime("%Y-%m-%d")
    date_match = re.search(
        r"(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}",
        text_content
    )
    if date_match:
        try:
            parsed = datetime.strptime(date_match.group().replace(",", ""), "%B %d %Y")
            end_date = parsed.strftime("%Y-%m-%d")
        except:
            pass
    
    return {
        "year": year,
        "title": title,
        "transmission": transmission,
        "mileage": mileage,
        "price": price,
        "end_date": end_date,
        "url": url,
        "source": "pcarmarket",
    }


def scrape_all_listings(max_auctions: int = 50) -> List[dict]:
    """
    Main scraping function.
    """
    print("Starting PCAR Market scrape...")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        )
        page = context.new_page()
        
        urls = search_997_auctions(page)
        urls = urls[:max_auctions]
        
        print(f"Processing {len(urls)} auctions...")
        
        raw_listings = []
        for i, url in enumerate(urls, 1):
            slug = url.split("/")[-1][:40]
            print(f"[{i}/{len(urls)}] {slug}...", end=" ")
            
            listing = parse_auction_page(page, url)
            if listing:
                print(f"✓ {listing['year']} ${listing['price']:,}")
                raw_listings.append(listing)
            else:
                print("skip")
            
            time.sleep(REQUEST_DELAY)
        
        browser.close()
    
    print(f"\nParsed {len(raw_listings)} valid 997.2 listings")
    
    normalized = normalize_listings(raw_listings)
    print(f"Normalized to {len(normalized)} target cohort listings")
    
    return normalized


def save_snapshot(listings: List[dict], date: str = None) -> Path:
    """
    Save/merge listings to snapshot file.
    """
    if date is None:
        date = datetime.now().strftime("%Y-%m-%d")
    
    SNAPSHOT_DIR.mkdir(parents=True, exist_ok=True)
    filepath = SNAPSHOT_DIR / f"{date}.json"
    
    existing = []
    if filepath.exists():
        with open(filepath) as f:
            existing = json.load(f)
    
    existing_urls = {l.get("url") for l in existing}
    added = 0
    for listing in listings:
        if listing.get("url") not in existing_urls:
            existing.append(listing)
            added += 1
    
    with open(filepath, "w") as f:
        json.dump(existing, f, indent=2)
    
    print(f"Added {added} new listings. Total: {len(existing)}")
    return filepath


def main():
    listings = scrape_all_listings(max_auctions=40)
    
    if listings:
        save_snapshot(listings)
        print("\n=== 997.2 Results ===")
        for listing in listings[:5]:
            mileage_str = f"{listing['mileage']:,} mi" if listing.get('mileage') else "N/A"
            print(f"  {listing['cohort']}: ${listing['price']:,} @ {mileage_str}")
        if len(listings) > 5:
            print(f"  ... and {len(listings) - 5} more")
    else:
        print("No matching listings found.")


if __name__ == "__main__":
    main()

