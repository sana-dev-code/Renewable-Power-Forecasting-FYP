import pandas as pd
import numpy as np
from datetime import datetime, timedelta

async def get_future(lat: float, lon: float, days: int = 7) -> pd.DataFrame:
    hours = days * 24
    start = datetime.utcnow().replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
    idx = pd.date_range(start=start, periods=hours, freq="H")
    hour = idx.hour
    irr = np.clip(820 * np.sin((hour-6)/12*np.pi), 0, None) + np.random.normal(0, 25, len(idx))
    t_amb = 22 + 9*np.sin(2*np.pi*idx.dayofyear/365) + np.random.normal(0,1.2,len(idx))
    t_mod = t_amb + 6
    wind = np.clip(np.random.normal(3.2, 1.1, len(idx)), 0, None)
    return pd.DataFrame({"ts": idx, "irr": irr, "t_amb": t_amb, "t_mod": t_mod, "wind": wind})
