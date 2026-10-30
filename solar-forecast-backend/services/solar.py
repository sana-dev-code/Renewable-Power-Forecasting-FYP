# services/solar.py
import math
from math import sin, cos, radians, asin, pi

from math import sin, cos, radians, asin, pi

def solar_elevation_deg(lat: float, lon: float, ts_utc) -> float:
    """
    Lightweight (NOAA-ish) solar elevation approximation.
    Uses longitude-based solar time correction so day/night aligns better locally.
    Input ts_utc must be timezone-aware UTC datetime.
    """
    doy = ts_utc.timetuple().tm_yday

    # UTC fractional hour
    utc_hour = ts_utc.hour + ts_utc.minute / 60.0

    # ✅ approximate local solar time using longitude (15° ≈ 1 hour)
    solar_hour = utc_hour + (lon / 15.0)

    # wrap 0..24
    solar_hour = solar_hour % 24.0

    decl = radians(23.45) * sin(radians(360.0 * (284 + doy) / 365.0))
    latr = radians(lat)

    # hour angle (solar noon ~ 12)
    hra = radians(15.0 * (solar_hour - 12.0))

    sin_el = sin(latr) * sin(decl) + cos(latr) * cos(decl) * cos(hra)
    sin_el = max(-1.0, min(1.0, sin_el))

    el_rad = asin(sin_el)
    el_deg = el_rad * 180.0 / pi
    return max(0.0, el_deg)


def clearsky_ghi_wm2(lat: float, lon: float, ts_utc) -> float:
    """
    Simple clear-sky global horizontal irradiance (W/m^2).
    """
    Isc = 1367.0  # solar constant
    doy = ts_utc.timetuple().tm_yday
    E0 = 1.0 + 0.033 * cos(2.0 * pi * doy / 365.0)  # Earth–Sun distance factor
    el = solar_elevation_deg(lat, lon, ts_utc)
    if el <= 0.0:
        return 0.0
    tau = 0.75  # bulk transmittance
    return Isc * E0 * sin(radians(el)) * tau

def apply_clouds(ghi_clear: float, cloud_pct: float, alpha: float = 0.7) -> float:
    """
    Cloud cover modulation. alpha 0.7 ~ strong reduction when overcast.
    """
    cf = max(0.0, min(1.0, cloud_pct / 100.0))
    return max(0.0, ghi_clear * (1.0 - alpha * cf))

def temp_derate_factor(temp_c: float, coeff_perc_per_deg: float = -0.4) -> float:
    """
    -0.4% per °C above 25°C → fraction. Floor at 0.8.
    """
    over = max(0.0, temp_c - 25.0)
    f = 1.0 + (coeff_perc_per_deg / 100.0) * over
    return max(0.8, f)
