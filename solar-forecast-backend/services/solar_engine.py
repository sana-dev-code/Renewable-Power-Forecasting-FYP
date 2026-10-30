import numpy as np
from math import sin, cos, radians, asin, acos, pi

def solar_elevation_deg(lat, lon, ts_utc):
    # very light sun position approx (good enough for diurnal envelope)
    # convert to fractional hour angle etc.
    # Using NOAA-like approximation:
    doy = ts_utc.timetuple().tm_yday
    hour = ts_utc.hour + ts_utc.minute/60
    decl = radians(23.45) * sin(radians(360*(284 + doy)/365))
    latr = radians(lat)
    hra = radians(15*(hour - 12))  # hour angle
    sin_el = sin(latr)*sin(decl) + cos(latr)*cos(decl)*cos(hra)
    return max(0.0, asin(max(-1.0, min(1.0, sin_el)))) * 180/pi

def clearsky_ghi_wm2(lat, lon, ts_utc):
    Isc = 1367.0
    doy = ts_utc.timetuple().tm_yday
    E0 = 1 + 0.033 * cos(2*pi*doy/365)     # earth-sun factor
    el = solar_elevation_deg(lat, lon, ts_utc)
    tau = 0.75                              # bulk transmittance (tune if needed)
    return 0.0 if el <= 0 else Isc * E0 * sin(radians(el)) * tau  # W/m2

def apply_clouds(ghi_clear, cloud_pct, alpha=0.7):
    cf = max(0.0, min(1.0, cloud_pct/100.0))
    return max(0.0, ghi_clear * (1 - alpha*cf))

def temp_derate_factor(temp_c, coeff_perc_per_deg=-0.4):
    # -0.4% per °C above 25 (convert % to fraction)
    over = max(0.0, temp_c - 25.0)
    return max(0.8, 1.0 + (coeff_perc_per_deg/100.0)*over)  # floor at 0.8
