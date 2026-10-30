import pandas as pd
import numpy as np
from datetime import datetime, timedelta

async def get_history(lat: float, lon: float, months: int = 12) -> pd.DataFrame:
    # Synthetic hourly history (last 180 days) — replace with NASA POWER later
    hours = 180 * 24
    end = datetime.utcnow().replace(minute=0, second=0, microsecond=0)
    idx = pd.date_range(end=end, periods=hours, freq="H")
    # fake diurnal irradiance curve (0 at night)
    hour = idx.hour
    irradiance = np.clip(800 * np.sin((hour-6)/12*np.pi), 0, None) + np.random.normal(0, 20, len(idx))
    ambient = 20 + 10*np.sin(2*np.pi*idx.dayofyear/365) + np.random.normal(0,1,len(idx))
    module = ambient + 6
    wind = np.clip(np.random.normal(3.5, 1.0, len(idx)), 0, None)

    return pd.DataFrame({
        "ts": idx, "irr": irradiance, "t_amb": ambient, "t_mod": module, "wind": wind
    })
