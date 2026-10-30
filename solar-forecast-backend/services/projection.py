import pandas as pd
import numpy as np

def _climatology_from_hist(hist: pd.DataFrame) -> pd.DataFrame:
    df = hist.copy()
    df["ts"] = pd.to_datetime(df["ts"], utc=True)  # ✅ ensure UTC datetime
    df["doy"] = df["ts"].dt.dayofyear
    df["hour"] = df["ts"].dt.hour
    return df.groupby(["doy","hour"], as_index=False)[["irr","t_amb","t_mod","wind"]].median()

def build(hist: pd.DataFrame, near: pd.DataFrame, days: int, lat: float, lon: float) -> pd.DataFrame:
    fut = near.copy()
    fut["ts"] = pd.to_datetime(fut["ts"], utc=True)  # ✅ ensure UTC datetime

    if days <= len(fut)//24:
        return fut

    extra_hours = days*24 - len(fut)
    clim = _climatology_from_hist(hist)

    last = fut["ts"].iloc[-1]

    m = fut.copy()
    m["doy"] = m["ts"].dt.dayofyear
    m["hour"] = m["ts"].dt.hour
    m = m.merge(clim, on=["doy","hour"], suffixes=("","_clim"))

    bias_irr = (m["irr"] - m["irr_clim"]).median()
    bias_ta  = (m["t_amb"] - m["t_amb_clim"]).median()
    bias_tm  = (m["t_mod"] - m["t_mod_clim"]).median()
    bias_w   = (m["wind"] - m["wind_clim"]).median()

    rows = []
    for h in range(extra_hours):
        ts = last + pd.Timedelta(hours=h+1)

        row = clim[(clim["doy"] == ts.dayofyear) & (clim["hour"] == ts.hour)]
        if row.empty:
            row = clim.sample(1, random_state=int(ts.hour))

        r = row.iloc[0]
        rows.append({
            "ts": ts,
            "irr": max(float(r["irr"] + bias_irr), 0.0),
            "t_amb": float(r["t_amb"] + bias_ta),
            "t_mod": float(r["t_mod"] + bias_tm),
            "wind": max(float(r["wind"] + bias_w), 0.0),
        })

    proj = pd.DataFrame(rows)
    return pd.concat([fut, proj], ignore_index=True)
