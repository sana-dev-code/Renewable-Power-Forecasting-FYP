# services/forecaster.py
# ML-first solar forecast with safe fallbacks

from __future__ import annotations

import os
import json
from functools import lru_cache
from datetime import datetime, timedelta, timezone

import numpy as np
import pandas as pd
import requests

from services.solar import solar_elevation_deg
from services.owm_fixed import future_hours_from_owm as owm_fetch
from services.projection import build as build_projection

# =========================
# Config / constants
# =========================
# =========================
# Config / constants
# =========================
import os

ART_DIR     = os.getenv("ART_DIR", "services/training_artifacts")  # <-- RT_DIR nahi, ART_DIR
DEFAULT_TZ  = os.getenv("DEFAULT_TZ", "Asia/Karachi")

# ML switching toggles
FORCE_ML       = os.getenv("FORCE_ML", "0") in ("1", "true", "True")
FORCE_BASELINE = os.getenv("FORCE_BASELINE", "0") in ("1", "true", "True")
ML_ZERO_GUARD  = os.getenv("ML_ZERO_GUARD", "1") in ("1", "true", "True")

# Hybrid + floor (NEW)
ENSEMBLE         = os.getenv("ENSEMBLE", "0") in ("1", "true", "True")   # ML + baseline blend
MIN_DAY_FRACTION = float(os.getenv("MIN_DAY_FRACTION", "0.02"))          # 2% daytime floor

DEBUG = os.getenv("DEBUG_FORECAST", "1") in ("1", "true", "True")

# Panel physics (approx realistic)
PANEL_AREA_M2 = {"Mono": 2.0, "Poly": 1.9, "Thin-Film": 1.8}
PANEL_EFF     = {"Mono": 0.20, "Poly": 0.18, "Thin-Film": 0.12}
DERATE        = 0.85
IRR_MAX_WM2   = 1200.0
PER_PANEL_MAX_KWH = 0.60  # hard safety cap per hour per panel

def _dprint(*args):
    if DEBUG:
        print("[FORECAST-DEBUG]", *args)


# =========================
# GEO fallback
# =========================
CITY2LL = {
    "lahore": (31.5204, 74.3587),
    "karachi": (24.8607, 67.0011),
    "islamabad": (33.6844, 73.0479),
    "peshawar": (34.0151, 71.5249),
    "multan": (30.1575, 71.5249),
}

def geocode_fallback(location: str):
    if not location:
        return 31.5204, 74.3587
    return CITY2LL.get(location.strip().lower(), (31.5204, 74.3587))


# =========================
# Optional ML artifacts
# =========================
try:
    import tensorflow as tf
    from joblib import load as joblib_load
except Exception:
    tf = None
    joblib_load = None

@lru_cache(maxsize=1)
def load_artifacts():
    """
    Load model/scaler/meta if present.
    Returns dict: {"ok": bool, "model": ..., "scaler": ..., "meta": {...}, "source": "..."}
    """
    # Force baseline via env
    if FORCE_BASELINE:
        return {
            "ok": False, "model": None, "scaler": None,
            "meta": {"T": 72, "H": 24, "features": ["irr", "t_amb", "t_mod", "wind", "hour", "doy"]},
            "source": "baseline(env)"
        }

    if (tf is None) or (not hasattr(tf, "keras")):
        return {
            "ok": False, "model": None, "scaler": None,
            "meta": {"T": 72, "H": 24, "features": ["irr", "t_amb", "t_mod", "wind", "hour", "doy"]},
            "source": "baseline(no-tf.keras)"
        }

    model_h5    = os.path.join(ART_DIR, "model.h5")
    model_keras = os.path.join(ART_DIR, "model.keras")
    scaler_path = os.path.join(ART_DIR, "scaler.pkl")
    meta_path   = os.path.join(ART_DIR, "meta.json")

    have_model = os.path.exists(model_h5) or os.path.exists(model_keras)
    if not (have_model and os.path.exists(scaler_path) and os.path.exists(meta_path)):
        return {
            "ok": False, "model": None, "scaler": None,
            "meta": {"T": 72, "H": 24, "features": ["irr", "t_amb", "t_mod", "wind", "hour", "doy"]},
            "source": "baseline(no-artifacts)"
        }

    # Load meta
    try:
        with open(meta_path, "r", encoding="utf-8") as f:
            meta = json.load(f)
    except Exception:
        return {
            "ok": False, "model": None, "scaler": None,
            "meta": {"T": 72, "H": 24, "features": ["irr", "t_amb", "t_mod", "wind", "hour", "doy"]},
            "source": "baseline(meta-load-failed)"
        }

    # Normalize keys (support "H" or "h")
    if "H" not in meta and "h" in meta:
        meta["H"] = meta.get("h")

    # Load model
    try:
        model_file = model_h5 if os.path.exists(model_h5) else model_keras
        model = tf.keras.models.load_model(model_file)
    except Exception:
        try:
            import keras  # fallback if tf.keras loader has issues
            model = keras.models.load_model(model_file)
        except Exception:
            return {"ok": False, "model": None, "scaler": None, "meta": meta, "source": "baseline(model-load-failed)"}

    # Load scaler
    try:
        scaler = joblib_load(scaler_path) if joblib_load else None
    except Exception:
        return {"ok": False, "model": None, "scaler": None, "meta": meta, "source": "baseline(scaler-load-failed)"}

    _dprint("Artifacts loaded:", {"features": meta.get("features"), "T": meta.get("T"), "H": meta.get("H")})
    return {"ok": True, "model": model, "scaler": scaler, "meta": meta, "source": "ml"}


# =========================
# History (NASA or synthetic)
# =========================
def nasa_power_hourly(lat: float, lon: float, hours: int = 180*24) -> pd.DataFrame | None:
    try:
        end_utc   = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
        start_utc = end_utc - timedelta(hours=hours-1)
        url = "https://power.larc.nasa.gov/api/temporal/hourly/point"
        params = {
            "latitude": f"{lat:.4f}",
            "longitude": f"{lon:.4f}",
            "start": start_utc.strftime("%Y%m%d"),
            "end": end_utc.strftime("%Y%m%d"),
            "community": "RE",
            "parameters": "ALLSKY_SFC_SW_DWN,T2M,WS10M",
            "format": "JSON",
            "time-standard": "UTC",
        }
        r = requests.get(url, params=params, timeout=20)
        if r.status_code != 200:
            return None
        js = r.json()
        props = js.get("properties", {})
        parameter = props.get("parameter", {})
        irr_d = parameter.get("ALLSKY_SFC_SW_DWN", {})
        t2m_d = parameter.get("T2M", {})
        w10_d = parameter.get("WS10M", {})
        keys = sorted(set(irr_d.keys()) | set(t2m_d.keys()) | set(w10_d.keys()))
        rows = []
        for k in keys:
            if len(k) != 10:
                continue
            ts = datetime.strptime(k, "%Y%m%d%H").replace(tzinfo=timezone.utc)
            irr_kwh_m2 = float(irr_d.get(k, 0.0)) if irr_d else 0.0
            irr = max(0.0, irr_kwh_m2 * 1000.0)  # W/m² approx
            t   = float(t2m_d.get(k, 25.0)) if t2m_d else 25.0
            w   = max(0.0, float(w10_d.get(k, 3.0))) if w10_d else 3.0
            rows.append({"ts": ts, "irr": irr, "t_amb": t, "t_mod": t + 6.0, "wind": w})
        if not rows:
            return None
        return pd.DataFrame(rows).sort_values("ts").reset_index(drop=True)
    except Exception:
        return None

def synthetic_history(hours: int = 180*24) -> pd.DataFrame:
    end = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    idx = pd.date_range(end=end, periods=hours, freq="h", tz="UTC")
    hour = idx.hour.values
    irr   = np.clip(900.0 * np.sin((hour-6)/12*np.pi), 0.0, None) + np.random.normal(0, 20, len(idx))
    irr   = np.clip(irr, 0.0, None)
    t_amb = 26 + 8*np.sin(2*np.pi*idx.dayofyear/365) + np.random.normal(0, 1.0, len(idx))
    t_mod = t_amb + 6
    wind  = np.clip(np.random.normal(3.5, 1.0, len(idx)), 0.0, None)
    return pd.DataFrame({"ts": idx, "irr": irr, "t_amb": t_amb, "t_mod": t_mod, "wind": wind})

def build_history(lat: float, lon: float, days_back: int = 180) -> pd.DataFrame:
    df = nasa_power_hourly(lat, lon, hours=days_back*24)
    if df is None or df.empty:
        df = synthetic_history(days_back*24)
    df["irr"] = np.clip(df["irr"].astype("float32"), 0.0, None)
    if float(np.nanmax(df["irr"])) <= 0.0:
        df = synthetic_history(days_back*24)
    return df


# =========================
# Feats / helpers
# =========================
def add_time_feats(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    ts = pd.to_datetime(out["ts"], utc=True)

    out["hour"] = ts.dt.hour.astype("int16")
    out["doy"]  = ts.dt.dayofyear.astype("int16")

    # ✅ MUST: seasonal encoding (matches meta.json)
    out["doy_sin"] = np.sin(2*np.pi*out["doy"].to_numpy() / 365.0).astype("float32")
    out["doy_cos"] = np.cos(2*np.pi*out["doy"].to_numpy() / 365.0).astype("float32")

    return out


def summarize_daily_tz(ts_like, total_kwh, tz=DEFAULT_TZ, full_days_only=False):
    ts_utc = pd.to_datetime(ts_like, utc=True)
    dt = pd.DatetimeIndex(ts_utc).tz_convert(tz)

    total = np.array(total_kwh, dtype="float64")
    total = np.nan_to_num(total, nan=0.0, posinf=0.0, neginf=0.0)

    df = pd.DataFrame({"ts": dt, "total": total})

    if full_days_only:
        start = (dt.min().floor("D") + pd.Timedelta(days=1))
        end   = dt.max().floor("D")
        df = df[(df["ts"] >= start) & (df["ts"] < end)]

    if df.empty:
        return []

    df["date"] = df["ts"].dt.date
    daily = df.groupby("date", as_index=False, sort=True)["total"].sum()
    daily = daily.rename(columns={"total": "total_kWh"})
    daily["total_kWh"] = daily["total_kWh"].astype("float64")
    daily["total_kWh"] = daily["total_kWh"].apply(lambda x: float(np.nan_to_num(x, nan=0.0, posinf=0.0, neginf=0.0)))
    return daily.to_dict(orient="records")

def _sanitize_and_check_features(df: pd.DataFrame, features: list[str]):
    missing = [c for c in features if c not in df.columns]
    if missing:
        raise ValueError(f"ML features missing: {missing}")
    for c in features:
        df[c] = pd.to_numeric(df[c], errors="coerce").astype("float32")
    df[features] = df[features].replace([np.inf, -np.inf], np.nan).fillna(0.0)
    return df

def _daylight_mask(ts_arr, lat, lon):
    elev = pd.to_datetime(ts_arr, utc=True).map(lambda t: solar_elevation_deg(lat, lon, t)).to_numpy()
    return elev > 0.5

def _ml_zero_guard(ts_arr, per_panel, lat, lon, min_day_points=6, tol=1e-6):
    day = _daylight_mask(ts_arr, lat, lon)
    n_day = int(day.sum())
    if n_day >= min_day_points and float(np.nanmax(per_panel[day])) <= tol:
        return True
    return False

def _apply_solar_mask(df: pd.DataFrame, lat: float, lon: float) -> pd.DataFrame:
    out = df.copy()
    tsu = pd.to_datetime(out["ts"], utc=True)
    elev = tsu.map(lambda t: solar_elevation_deg(lat, lon, t)).to_numpy(dtype="float32")
    day_factor = np.clip(np.sin(np.radians(elev)), 0.0, None).astype("float32")
    out["irr"] = (out["irr"].astype("float32") * day_factor).clip(lower=0.0)
    out.loc[elev <= 0.5, "irr"] = 0.0
    return out

def _map_ml_to_kwh(per_panel_raw: np.ndarray, fut_df: pd.DataFrame, panel_type: str, meta: dict) -> np.ndarray:
    y = np.nan_to_num(per_panel_raw, nan=0.0, posinf=0.0, neginf=0.0).astype("float64")

    # optional linear scaling
    if meta.get("y_scale") is not None:
        try:
            y *= float(meta["y_scale"])
        except Exception:
            pass
    if meta.get("y_bias") is not None:
        try:
            y += float(meta["y_bias"])
        except Exception:
            pass

    y_type = (meta.get("y_type") or "kwh").lower()
    if y_type == "wh":
        y = y / 1000.0
    elif y_type == "ratio":
        area = PANEL_AREA_M2.get(panel_type, 2.0)
        eff  = PANEL_EFF.get(panel_type, 0.20)
        irr  = fut_df["irr"].to_numpy(dtype="float64")
        cap_kwh = (irr * area * eff * DERATE) / 1000.0
        cap_kwh = np.clip(cap_kwh, 0.0, PER_PANEL_MAX_KWH)
        y = np.clip(y, 0.0, 1.0) * cap_kwh
    # else assume already kWh

    y = np.clip(y, 0.0, PER_PANEL_MAX_KWH)
    y = np.nan_to_num(y, nan=0.0, posinf=0.0, neginf=0.0).astype("float32")
    return y


# =========================
# ML forecaster
# =========================
def _ml_forecast(model, scaler, meta, hist_df: pd.DataFrame, fut_df: pd.DataFrame):
    """
    Returns:
        ts_out (np.ndarray[datetime64[ns, UTC]]), per_panel_raw (float32)
    """
    features = meta.get("features", ["irr","t_amb","t_mod","wind","hour","doy"])
    T = int(meta.get("T", 72))

    # history -> feats -> scale
    hist_aug = add_time_feats(hist_df.copy())
    hist_aug = _sanitize_and_check_features(hist_aug, features)
    X_hist = scaler.transform(hist_aug[features].values.astype("float32"))
    if len(X_hist) < T:
        raise ValueError(f"Not enough history for T={T}, have={len(X_hist)}")
    window = X_hist[-T:].copy()

    # future drivers
    fut = fut_df.copy()
    fut["ts"] = pd.to_datetime(fut["ts"], utc=True)
    fut = add_time_feats(fut)
    fut = _sanitize_and_check_features(fut, features)
    X_fut = scaler.transform(fut[features].values.astype("float32"))

    per_panel = np.zeros(len(X_fut), dtype="float32")
    for i in range(len(X_fut)):
        x = X_fut[i]
        window = np.vstack([window[1:], x])
        y_seq = model.predict(window[np.newaxis, ...], verbose=0)[0]
        y0 = float(y_seq[0]) if np.size(y_seq) else 0.0
        if not np.isfinite(y0):
            y0 = 0.0
        per_panel[i] = max(0.0, y0)

    ts_out = fut["ts"].to_numpy()
    return ts_out, per_panel


# =========================
# Main API
# =========================
async def forecast_main(location: str, panel_type: str, number_of_panels: int,
                        forecast_days: int, tz: str = DEFAULT_TZ):

    lat, lon = geocode_fallback(location)
    hist = build_history(lat, lon, days_back=180)

    # Near-term from OWM (up to 7 days)
    near_days = min(int(forecast_days), 7)
    near = await owm_fetch(lat, lon, hours=near_days*24)
    if near is None or near.empty:
        # fallback synthetic near-future
        ts0 = pd.Timestamp.utcnow().floor("h") + pd.Timedelta(hours=1)
        idx = pd.date_range(start=ts0, periods=near_days*24, freq="h", tz="UTC")
        hrs = idx.hour.values
        irr = np.clip(900.0 * np.sin((hrs-6)/12*np.pi), 0.0, None)
        near = pd.DataFrame({
            "ts": idx, "irr": irr, "t_amb": 26.0, "t_mod": 32.0, "wind": 3.0, "weather": "Unknown"
        })

    # to hourly + clean
    near["ts"] = pd.to_datetime(near["ts"], utc=True)
    near = near.set_index("ts").resample("h").interpolate(limit_direction="both").reset_index()
    near["irr"] = np.clip(near["irr"].astype(float), 0.0, IRR_MAX_WM2)
    near = _apply_solar_mask(near, lat, lon)

    # extend horizon if needed
    fut = near.copy()
    needed_hours = int(forecast_days) * 24
    if needed_hours > len(fut):
        fut = build_projection(hist, fut, days=int(forecast_days), lat=lat, lon=lon)

    fut["ts"]  = pd.to_datetime(fut["ts"], utc=True)
    fut["irr"] = np.clip(fut["irr"].astype(float), 0.0, IRR_MAX_WM2)
    fut = _apply_solar_mask(fut, lat, lon)

    # Decide ML vs baseline
    # ---------- Decide ML vs baseline (REPLACEMENT BLOCK) ----------
    art = load_artifacts()
    panels = max(1, int(number_of_panels))

    def _baseline_from(fut_df, reason):
        irr  = fut_df["irr"].to_numpy(dtype="float64")
        area = PANEL_AREA_M2.get(panel_type, 2.0)
        eff  = PANEL_EFF.get(panel_type, 0.20)
        per_panel = (irr * area * eff * DERATE) / 1000.0
        per_panel = np.clip(per_panel, 0.0, PER_PANEL_MAX_KWH).astype("float32")
        return fut_df["ts"].to_numpy(), per_panel, f"baseline({reason})"

    # baseline capacity (ensemble/floor ke liye)
    _, baseline_pp, _ = _baseline_from(fut, "cap")

    if art.get("ok"):
        try:
            ts_arr, ml_raw = _ml_forecast(
                art["model"], art["scaler"], art["meta"],
                hist_df=hist, fut_df=fut
            )
            ml_pp = _map_ml_to_kwh(ml_raw, fut, panel_type, art["meta"]).astype("float32")

            # Night cleanup
            elev = pd.to_datetime(ts_arr, utc=True).map(lambda t: solar_elevation_deg(lat, lon, t)).to_numpy()
            day = elev > 0.5
            ml_pp[~day] = 0.0

            # Zero-guard: daytime me sab zero to baseline
            if ML_ZERO_GUARD and not FORCE_ML and _ml_zero_guard(ts_arr, ml_pp, lat, lon):
                _dprint("ML zero-guard -> baseline fallback")
                ts_arr, per_panel, model_used = _baseline_from(fut, "ml-zero-guard")
            else:
                # Ensemble (ML + baseline) optional
                if ENSEMBLE:
                    alpha = float(os.getenv("ENSEMBLE_ALPHA", "0.7"))  # 0..1 (ML weight)
                    per_panel = (alpha * ml_pp + (1.0 - alpha) * baseline_pp).astype("float32")
                    model_used = "ml+baseline(ensemble)"
                else:
                    per_panel = ml_pp
                    model_used = "ml(force)" if FORCE_ML else "ml"

                # Daytime floor: MIN_DAY_FRACTION * baseline
                floor = (MIN_DAY_FRACTION * baseline_pp).astype("float32")
                per_panel[day] = np.maximum(per_panel[day], floor[day])

            if DEBUG:
                _dprint(
                    "ML daytime points:", int(day.sum()),
                    "max_kWh_per_panel_day:", float(per_panel[day].max() if day.any() else -1),
                )

        except Exception as e:
            _dprint("ML crash:", repr(e))
            import traceback; _dprint(traceback.format_exc())
            if FORCE_ML:
                # Force mode me crash bubble-up taake asli bug dikh jaye
                raise
            ts_arr, per_panel, model_used = _baseline_from(fut, "ml-fallback")
    else:
        if FORCE_ML:
            raise RuntimeError("FORCE_ML=1 but ML artifacts not available")
        ts_arr, per_panel, model_used = _baseline_from(fut, art.get("source", "no-ml"))
    # ---------- end replacement ----------


    total = np.nan_to_num(per_panel * panels, nan=0.0, posinf=0.0, neginf=0.0).astype("float64")

    daily = summarize_daily_tz(ts_arr, total, tz=tz, full_days_only=False)
    conf = "high" if forecast_days <= 7 else ("medium" if forecast_days <= 15 else "low")

    series = []
    for t, pp in zip(ts_arr, per_panel):
       pp_safe = float(np.nan_to_num(pp, nan=0.0, posinf=0.0, neginf=0.0))
       total_safe = float(np.nan_to_num(pp_safe * panels, nan=0.0, posinf=0.0, neginf=0.0))

    # ✅ UTC → Asia/Karachi (PKT)
       t_local = pd.to_datetime(t, utc=True).tz_convert(tz)

       series.append({
          "ts": t_local.isoformat(),   # PKT time
          "per_panel_kWh": pp_safe,
         "total_kWh": total_safe,
        })

    return {
        "range_days": int(forecast_days),
        "granularity": "hourly",
        "series": series,
        "daily_summary": daily,
        "confidence": conf,
        "meta": {
            "tz": tz,
            "location": location,
            "lat": lat,
            "lon": lon,
            "panel_type": panel_type,
            "panel_count": panels,
            "artifacts": model_used,  # "ml", "ml(force)" or baseline(...)
        }
    }
