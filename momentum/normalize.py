"""
Normalization logic: maps raw listing data → cohort ID.
Handles edge cases in model/trim naming.
"""

import re
from typing import Optional, List

from cohorts import get_generation


def normalize_trim(raw_trim: str) -> Optional[str]:
    """
    Normalize trim string to one of: carrera, carrera_s, carrera_4s.
    Returns None if not a target trim (e.g., Turbo, GT3).
    """
    trim = raw_trim.lower().strip()
    
    # Exclude non-target variants early
    exclusions = ["turbo", "gt3", "gt2", "targa", "gts", "speedster", "sport classic", "cabriolet", "cabrio", "convertible"]
    if any(exc in trim for exc in exclusions):
        return None
    
    # Order matters: check 4S before S (since "4s" contains "s")
    if "4s" in trim or "4 s" in trim:
        return "carrera_4s"
    elif re.search(r"\bs\b", trim) or trim.endswith(" s") or "carrera s" in trim:
        return "carrera_s"
    elif "carrera" in trim:
        # Base Carrera - make sure it's not just part of another word
        return "carrera"
    
    return None


def is_manual_transmission(transmission: str) -> bool:
    """Check if transmission is manual (6-speed or 7-speed manual)."""
    trans = transmission.lower()
    # Exclude PDK, Tiptronic, automatic
    if any(x in trans for x in ["pdk", "tiptronic", "automatic", "auto"]):
        return False
    # Look for manual indicators
    return any(x in trans for x in ["manual", "6-speed", "6 speed", "7-speed", "7 speed"])


def classify_listing(raw_listing: dict) -> Optional[dict]:
    """
    Classify a raw listing into a normalized format with cohort ID.
    Returns None if listing doesn't match target criteria.
    
    Expected raw_listing keys:
    - year: int
    - title: str (e.g., "2007 Porsche 911 Carrera S Coupe 6-Speed")
    - transmission: str
    - mileage: int
    - price: int
    - end_date: str (YYYY-MM-DD)
    - url: str
    - source: str
    """
    year = raw_listing.get("year")
    if not year:
        return None
    
    # Determine generation
    generation = get_generation(year)
    if not generation:
        return None
    
    # Check transmission
    transmission = raw_listing.get("transmission", "")
    if not is_manual_transmission(transmission):
        return None
    
    # Normalize trim from title
    title = raw_listing.get("title", "")
    trim = normalize_trim(title)
    if not trim:
        return None
    
    # Build cohort ID
    cohort_id = f"{generation}_manual_{trim}"
    
    # Validate price is reasonable (filter out obvious errors)
    price = raw_listing.get("price")
    if not price or price < 5000 or price > 500000:
        return None
    
    # Return normalized listing
    return {
        "source": raw_listing.get("source", "unknown"),
        "date": raw_listing.get("end_date"),
        "cohort": cohort_id,
        "price": price,
        "mileage": raw_listing.get("mileage"),
        "url": raw_listing.get("url"),
    }


def normalize_listings(raw_listings: List[dict]) -> List[dict]:
    """
    Process a list of raw listings, returning only those that match target cohorts.
    """
    normalized = []
    for raw in raw_listings:
        result = classify_listing(raw)
        if result:
            normalized.append(result)
    return normalized
