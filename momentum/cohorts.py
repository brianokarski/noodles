"""
Cohort definitions for 997.1 and 997.2 manual Carreras.
Extend this file to add new makes/models/generations.
"""

from typing import Optional

# 997.1: 2005-2008, 997.2: 2009-2012
COHORT_DEFINITIONS = {
    "997.1_manual_carrera": {
        "generation": "997.1",
        "years": range(2005, 2009),
        "trims": ["carrera"],
        "transmission": "manual",
        "display_name": "997.1 Carrera",
        "color": "#1f77b4",  # Blue
    },
    "997.1_manual_carrera_s": {
        "generation": "997.1",
        "years": range(2005, 2009),
        "trims": ["carrera s", "carrera-s"],
        "transmission": "manual",
        "display_name": "997.1 Carrera S",
        "color": "#2ca02c",  # Green
    },
    "997.1_manual_carrera_4s": {
        "generation": "997.1",
        "years": range(2005, 2009),
        "trims": ["carrera 4s", "carrera-4s", "4s"],
        "transmission": "manual",
        "display_name": "997.1 Carrera 4S",
        "color": "#ff7f0e",  # Orange
    },
    "997.2_manual_carrera": {
        "generation": "997.2",
        "years": range(2009, 2013),
        "trims": ["carrera"],
        "transmission": "manual",
        "display_name": "997.2 Carrera",
        "color": "#9467bd",  # Purple
    },
    "997.2_manual_carrera_s": {
        "generation": "997.2",
        "years": range(2009, 2013),
        "trims": ["carrera s", "carrera-s"],
        "transmission": "manual",
        "display_name": "997.2 Carrera S",
        "color": "#d62728",  # Red
    },
    "997.2_manual_carrera_4s": {
        "generation": "997.2",
        "years": range(2009, 2013),
        "trims": ["carrera 4s", "carrera-4s", "4s"],
        "transmission": "manual",
        "display_name": "997.2 Carrera 4S",
        "color": "#8c564b",  # Brown
    },
}


def get_generation(year: int) -> Optional[str]:
    """Determine 997 generation from model year."""
    if 2005 <= year <= 2008:
        return "997.1"
    elif 2009 <= year <= 2012:
        return "997.2"
    return None


def get_cohort_color(cohort_id: str) -> str:
    """Get the display color for a cohort."""
    return COHORT_DEFINITIONS.get(cohort_id, {}).get("color", "#333333")


def get_cohort_display_name(cohort_id: str) -> str:
    """Get the display name for a cohort."""
    return COHORT_DEFINITIONS.get(cohort_id, {}).get("display_name", cohort_id)

