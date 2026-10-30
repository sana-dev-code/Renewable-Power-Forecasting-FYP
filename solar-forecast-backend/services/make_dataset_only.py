import os
import pandas as pd
import numpy as np

from services.forecaster_debug_fix import build_history, add_time_feats, geocode_fallback
from services.solar import solar_elevation_deg

# --------- SETTINGS ----------
LOCATION = os.getenv("TRAIN_LOC", "Lahore")
DAYS_BACK = int(os.getenv("DAYS_BACK", "180"))

OUT_DIR = os.getenv("OUT_DIR", "services/training_artifacts")
os.makedirs(OUT_DIR, exist_ok=True)

OUT_CSV = os.path.join(OUT_DIR, f"dataset_{LOCATION}_{DAYS_BACK}d.csv")

# --------- BUILD DATA ----------
print("📥 building dataset...")
lat, lon = geocode_fallback(LOCATION)
hist = build_history(lat, lon, days_back=DAYS_BACK)
hist = add_time_feats(hist)

hist["ts"] = pd.to_datetime(hist["ts"], utc=True)

# daylight mask
day_mask = hist["ts"].map(lambda t: solar_elevation_deg(lat, lon, t.to_pydatetime()) > 3.0).to_numpy()

# physics-based target per panel (hourly kWh)
cap = (hist["irr"].values * 2.0 * 0.20 * 0.85) / 1000.0
y = cap.astype("float32")
y[~day_mask] = 0.0
y = np.clip(y, 0.0, None)

FEATURES = ["irr", "t_amb", "t_mod", "wind", "hour", "doy"]
df = hist[["ts"] + FEATURES].copy()
df["target_kwh_per_panel"] = y

df.to_csv(OUT_CSV, index=False)
print("✅ Dataset saved:", OUT_CSV)
print("Rows:", len(df))
print("Columns:", list(df.columns))
