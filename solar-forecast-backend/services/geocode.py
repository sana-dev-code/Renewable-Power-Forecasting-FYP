# NOTE: FYP demo ke liye hardcoded cities; baad me real geocoder use kar lena
CITIES = {
    "lahore": (31.5204, 74.3587),
    "karachi": (24.8607, 67.0011),
    "islamabad": (33.6844, 73.0479),
    "multan": (30.1575, 71.5249),
}

async def to_latlon(location: str):
    key = location.strip().lower()
    if key in CITIES: return CITIES[key]
    # default: Lahore
    return CITIES["lahore"]
