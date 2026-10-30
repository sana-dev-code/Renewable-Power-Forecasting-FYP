# services/owm.py
import os, httpx
import pandas as pd
from datetime import datetime, timezone

OWM_KEY = os.getenv("OWM_KEY", "")
BASE = "https://api.openweathermap.org/data/2.5/onecall"

async def future_hours_from_owm(lat: float, lon: float, hours: int = 7*24) -> pd.DataFrame | None:
    print(f"DEBUG: OWM_KEY is set: {bool(OWM_KEY)}")  # Debug print
    if not OWM_KEY:
        print("DEBUG: OWM_KEY is empty, returning None")  # Debug print
        return None
    params = {
        "lat": f"{lat:.4f}", "lon": f"{lon:.4f}",
        "appid": OWM_KEY, "units": "metric", "exclude": "minutely,alerts"
    }
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            r = await client.get(BASE, params=params)
        if r.status_code != 200:
            return None
        js = r.json()
        recs = []
        # OWM hourly → up to ~48h; daily → 7d
        hourly = js.get("hourly") or []
        for h in hourly[:hours]:
            ts = datetime.fromtimestamp(h["dt"], tz=timezone.utc)
            t_amb = float(h.get("temp", 25.0))
            wind  = float(h.get("wind_speed", 3.0))
            # approximate irradiance: use cloud cover to modulate a clear-sky cap
            clouds = float(h.get("clouds", 50.0)) / 100.0
            clear_cap_wm2 = 950.0  # noon-ish cap
            irr = max(0.0, clear_cap_wm2 * (1.0 - 0.75*clouds))
            recs.append({"ts": ts, "irr": irr, "t_amb": t_amb, "t_mod": t_amb + 6.0, "wind": wind})

        # If need more than 48h, extend with daily block (coarse)
        if len(recs) < hours:
            daily = js.get("daily") or []
            # spread daily solar into day hours as a bell curve
            need = hours - len(recs)
            for d in daily:
                if need <= 0: break
                base_dt = datetime.fromtimestamp(d["dt"], tz=timezone.utc).replace(hour=6, minute=0, second=0, microsecond=0)
                # derived “irradiance level” from clouds
                clouds = float(d.get("clouds", 50.0))/100.0 if "clouds" in d else 0.5
                day_cap = 900.0*(1.0 - 0.7*clouds)
                for i in range(12):  # 6→18 local-ish
                    if need <= 0: break
                    ts = base_dt.replace(hour=6+i)
                    x = (i-6)/6.0  # bell around noon
                    irr = max(0.0, day_cap * (1 - x*x))
                    t_amb = float(d.get("temp", {}).get("day", 28.0))
                    wind  = float(d.get("wind_speed", 3.0)) if "wind_speed" in d else 3.0
                    recs.append({"ts": ts, "irr": irr, "t_amb": t_amb, "t_mod": t_amb+6.0, "wind": wind})
                    need -= 1

        if not recs:
            return None
        df = pd.DataFrame.from_records(recs).sort_values("ts").reset_index(drop=True)
        return df
    except Exception:
        return None
