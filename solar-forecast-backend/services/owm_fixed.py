# services/owm_fixed.py
import os, httpx
import pandas as pd
from datetime import datetime, timezone, timedelta


OWM_KEY = os.getenv("OWM_KEY", "")
BASE_CURRENT = "https://api.openweathermap.org/data/2.5/weather"
BASE_FORECAST = "https://api.openweathermap.org/data/2.5/forecast"

async def future_hours_from_owm(lat: float, lon: float, hours: int = 7*24) -> pd.DataFrame | None:
    print(f"DEBUG: OWM_KEY is set: {bool(OWM_KEY)}")  # Debug print
    if not OWM_KEY:
        print("DEBUG: OWM_KEY is empty, returning None")  # Debug print
        return None

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            # Try forecast endpoint first (5-day forecast, 3-hour intervals)
            params_forecast = {
                "lat": f"{lat:.4f}", "lon": f"{lon:.4f}",
                "appid": OWM_KEY, "units": "metric"
            }

            r = await client.get(BASE_FORECAST, params=params_forecast)
            if r.status_code == 200:
                js = r.json()
                recs = []

                # Process 3-hour forecast data (up to 5 days)
                forecast_list = js.get("list", [])
                for item in forecast_list[:hours//3]:  # Take only what we need
                    ts = datetime.fromtimestamp(item["dt"], tz=timezone.utc)
                    main = item.get("main", {})
                    wind = item.get("wind", {})
                    clouds = item.get("clouds", {}).get("all", 50.0)

                    t_amb = float(main.get("temp", 25.0))
                    wind_speed = float(wind.get("speed", 3.0))

                    # Calculate irradiance based on cloud cover
                    clouds_pct = float(clouds) / 100.0
                    clear_cap_wm2 = 950.0  # noon-ish cap
                    irr = max(0.0, clear_cap_wm2 * (1.0 - 0.75*clouds_pct))

                    recs.append({
                        "ts": ts,
                        "irr": irr,
                        "t_amb": t_amb,
                        "t_mod": t_amb + 6.0,
                        "wind": wind_speed
                    })

                if recs:
                    df = pd.DataFrame.from_records(recs).sort_values("ts").reset_index(drop=True)
                    print(f"DEBUG: Got {len(recs)} forecast records from OWM")
                    return df

            # If forecast fails, try current weather + synthetic extension
            print("DEBUG: Forecast endpoint failed, trying current weather + synthetic")
            params_current = {
                "lat": f"{lat:.4f}", "lon": f"{lon:.4f}",
                "appid": OWM_KEY, "units": "metric"
            }

            r2 = await client.get(BASE_CURRENT, params=params_current)
            if r2.status_code != 200:
                print(f"DEBUG: Current weather also failed with status {r2.status_code}")
                return None

            js2 = r2.json()
            main = js2.get("main", {})
            wind = js2.get("wind", {})
            clouds = js2.get("clouds", {}).get("all", 50.0)

            # Get current weather as base
            t_amb = float(main.get("temp", 25.0))
            wind_speed = float(wind.get("speed", 3.0))
            clouds_pct = float(clouds) / 100.0
            clear_cap_wm2 = 950.0
            base_irr = max(0.0, clear_cap_wm2 * (1.0 - 0.75*clouds_pct))

            # Generate synthetic hourly data based on current conditions
            recs = []
            now = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
            start_time = now + timedelta(hours=1)  # Start from next hour

            for i in range(min(hours, 24)):  # Generate up to 24 hours
                ts = start_time + timedelta(hours=i)
                hour = ts.hour

                # Diurnal pattern with current weather conditions
                if 6 <= hour <= 18:  # Daytime
                    # Peak at noon, modulated by current cloud conditions
                    hour_factor = 1.0 - 0.3 * abs(hour - 12) / 6.0  # Bell curve around noon
                    irr = max(0.0, base_irr * hour_factor)
                else:  # Night time
                    irr = 0.0

                # Temperature variation throughout the day
                temp_variation = 5.0 * (hour - 12) / 12.0  # Cooler at night
                current_t_amb = t_amb + temp_variation

                recs.append({
                    "ts": ts,
                    "irr": irr,
                    "t_amb": current_t_amb,
                    "t_mod": t_amb + 6.0,
                    "wind": wind_speed
                })

            if recs:
                df = pd.DataFrame.from_records(recs).sort_values("ts").reset_index(drop=True)
                print(f"DEBUG: Generated {len(recs)} synthetic forecast records")
                return df

        return None

    except Exception as e:
        print(f"DEBUG: Exception in OWM fetch: {e}")
        return None
