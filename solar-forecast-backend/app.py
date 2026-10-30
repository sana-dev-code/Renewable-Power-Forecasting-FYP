# app.py
from __future__ import annotations

import os
import json
import asyncio
import datetime
from fastapi import FastAPI, Query, Request, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, StreamingResponse
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, Field
from services.forecaster_debug_fix import forecast_main

from db import lifespan
from models import Forecast
from tortoise.contrib.pydantic import pydantic_model_creator

OWM_KEY        = os.getenv("OWM_KEY", "")
INTERNAL_TOKEN = os.getenv("INTERNAL_TOKEN", "")

# ── Internal auth guard ──────────────────────────────────
def require_internal(request: Request):
    if not INTERNAL_TOKEN:
        return  # dev mode — skip
    token = request.headers.get("x-internal-token", "")
    if token != INTERNAL_TOKEN:
        raise HTTPException(status_code=403, detail="Direct access not allowed.")

app = FastAPI(
    title="Solar Forecast API",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

templates = Jinja2Templates(directory="templates")

# CORS — only auth-proxy allowed
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:4000,http://127.0.0.1:4000"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization", "x-user-id", "x-user-email", "Cache-Control"],
)

# ── Models ───────────────────────────────────────────────
class ForecastIn(BaseModel):
    location: str = Field(..., example="Lahore")
    panel_type: str = Field(..., example="Mono")
    number_of_panels: int = Field(..., ge=1, example=6)
    forecast_days: int = Field(..., ge=1, le=30, example=7)

class TrainIn(BaseModel):
    location: str   = Field("Lahore", example="Lahore")
    days_back: int  = Field(30,  ge=7,  le=180)
    epochs: int     = Field(5,   ge=1,  le=50)
    seq_len: int    = Field(24,  ge=12, le=72)
    units: int      = Field(16,  ge=8,  le=64)
    batch_size: int = Field(64,  ge=16, le=256)

# ── Routes ───────────────────────────────────────────────
@app.get("/ping")
def ping():
    return {"ok": True}

@app.get("/docs", response_class=HTMLResponse)
async def custom_swagger_ui_html(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.post("/forecast/auto")
async def forecast_auto(inp: ForecastIn, _: None = Depends(require_internal)):
    try:
        result = await forecast_main(
            location=inp.location,
            panel_type=inp.panel_type,
            number_of_panels=inp.number_of_panels,
            forecast_days=inp.forecast_days,
            tz="Asia/Karachi",
            owm_key=OWM_KEY,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"/forecast/auto failed: {type(e).__name__}: {e}")

ForecastOut = pydantic_model_creator(Forecast, name="ForecastOut")

@app.post("/forecasts", response_model=ForecastOut)
async def create_forecast(inp: ForecastIn, _: None = Depends(require_internal)):
    try:
        result = await forecast_main(
            location=inp.location,
            panel_type=inp.panel_type,
            number_of_panels=inp.number_of_panels,
            forecast_days=inp.forecast_days,
            tz="Asia/Karachi",
            owm_key=OWM_KEY,
        )
        raw_daily   = result.get("daily_summary") or []
        daily_json  = [{**d, "date": str(d.get("date"))} for d in raw_daily]
        series_json = result.get("series", []) or []
        meta        = result.get("meta", {}) or {}
        fc = await Forecast.create(
            location=inp.location,
            panel_type=inp.panel_type,
            panel_count=inp.number_of_panels,
            forecast_days=inp.forecast_days,
            confidence=result.get("confidence"),
            daily_json=daily_json,
            series_json=series_json,
            lat=meta.get("lat"),
            lon=meta.get("lon"),
            artifacts=meta.get("artifacts"),
        )
        return await ForecastOut.from_tortoise_orm(fc)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"/forecasts failed: {type(e).__name__}: {e}")

@app.get("/forecasts", response_model=list[ForecastOut])
async def list_forecasts(limit: int = Query(10, ge=1, le=100), _: None = Depends(require_internal)):
    qs = Forecast.all().order_by("-created_at").limit(limit)
    return await ForecastOut.from_queryset(qs)

# ── Real Training — SSE streaming ────────────────────────
@app.post("/train")
async def train_model(inp: TrainIn, _: None = Depends(require_internal)):
    async def event_stream():
        import numpy as np
        import pandas as pd
        from sklearn.preprocessing import StandardScaler
        from joblib import dump

        ART_DIR  = os.getenv("ART_DIR", "services/training_artifacts")
        FEATURES = ["irr", "t_amb", "t_mod", "wind", "hour", "doy_sin", "doy_cos"]
        T, H     = inp.seq_len, 24

        def send(msg: str, level: str = "info"):
            return f"data: {json.dumps({'msg': msg, 'level': level})}\n\n"

        yield send(f"[SolarCast] Training — {inp.location} | {inp.epochs} epochs | T={T} | units={inp.units}", "info")
        await asyncio.sleep(0.05)

        csv_path     = os.path.join(ART_DIR, f"dataset_{inp.location}_{inp.days_back}d.csv")
        fallback_csv = os.path.join(ART_DIR, "dataset_Lahore_180d.csv")

        try:
            if os.path.exists(csv_path):
                yield send(f"[Dataset] Loading: {csv_path}", "ok")
                df = pd.read_csv(csv_path)
            elif os.path.exists(fallback_csv):
                yield send(f"[Dataset] Using fallback: {fallback_csv}", "warn")
                df = pd.read_csv(fallback_csv)
            else:
                yield send("[Dataset] Building synthetic dataset...", "info")
                from services.forecaster_debug_fix import synthetic_history, add_time_feats, geocode_fallback
                from services.solar import solar_elevation_deg
                lat, lon = geocode_fallback(inp.location)
                hist = synthetic_history(hours=inp.days_back * 24)
                hist = add_time_feats(hist)
                hist["ts"] = pd.to_datetime(hist["ts"], utc=True)
                day_mask = hist["ts"].map(
                    lambda t: solar_elevation_deg(lat, lon, t.to_pydatetime()) > 3.0
                ).to_numpy()
                cap = (hist["irr"].values * 2.0 * 0.20 * 0.85) / 1000.0
                y   = cap.astype("float32")
                y[~day_mask] = 0.0
                df  = hist[["ts"] + FEATURES].copy()
                df["target_kwh_per_panel"] = np.clip(y, 0.0, None)
                os.makedirs(ART_DIR, exist_ok=True)
                df.to_csv(csv_path, index=False)

            if "doy_sin" not in df.columns:
                df["ts"]      = pd.to_datetime(df["ts"], utc=True)
                df["doy_sin"] = np.sin(2 * np.pi * df["ts"].dt.dayofyear / 365).astype("float32")
                df["doy_cos"] = np.cos(2 * np.pi * df["ts"].dt.dayofyear / 365).astype("float32")

            yield send(f"[Dataset] {len(df)} rows ready", "ok")
            await asyncio.sleep(0.05)

        except Exception as e:
            yield send(f"[ERROR] Dataset: {e}", "err")
            yield send("DONE", "err")
            return

        try:
            X_raw = np.nan_to_num(df[FEATURES].values.astype("float32"))
            y_raw = np.nan_to_num(df["target_kwh_per_panel"].values.astype("float32"))
            scaler   = StandardScaler()
            X_scaled = scaler.fit_transform(X_raw)
            X_win, y_win = [], []
            for i in range(T, len(X_scaled) - H + 1):
                X_win.append(X_scaled[i-T:i])
                y_win.append(y_raw[i:i+H])
            X_win  = np.array(X_win, dtype="float32")
            y_win  = np.array(y_win, dtype="float32")
            split  = int(len(X_win) * 0.85)
            X_train, X_val = X_win[:split], X_win[split:]
            y_train, y_val = y_win[:split], y_win[split:]
            yield send(f"[Prep] Train: {len(X_train)} | Val: {len(X_val)} | Shape: {X_win.shape}", "")
            await asyncio.sleep(0.05)
        except Exception as e:
            yield send(f"[ERROR] Data prep: {e}", "err")
            yield send("DONE", "err")
            return

        try:
            import tensorflow as tf
            yield send(f"[TF] TensorFlow {tf.__version__}", "")
            await asyncio.sleep(0.05)
            model = tf.keras.Sequential([
                tf.keras.layers.Input(shape=(T, len(FEATURES))),
                tf.keras.layers.LSTM(inp.units, return_sequences=False),
                tf.keras.layers.Dropout(0.1),
                tf.keras.layers.Dense(H, activation='relu'),
            ])
            model.compile(optimizer=tf.keras.optimizers.Adam(learning_rate=0.002), loss='mse', metrics=['mae'])
            yield send(f"[Model] LSTM({inp.units}) — {model.count_params():,} params", "")
            await asyncio.sleep(0.05)
        except Exception as e:
            yield send(f"[ERROR] Model build: {e}", "err")
            yield send("DONE", "err")
            return

        yield send(f"[Train] {inp.epochs} epochs starting...", "info")
        await asyncio.sleep(0.05)

        try:
            best_val, best_weights = float("inf"), None
            for epoch in range(1, inp.epochs + 1):
                h = model.fit(X_train, y_train, validation_data=(X_val, y_val),
                              epochs=1, batch_size=inp.batch_size, verbose=0)
                loss     = float(h.history["loss"][0])
                val_loss = float(h.history["val_loss"][0])
                mae      = float(h.history["mae"][0])
                if val_loss < best_val:
                    best_val, best_weights = val_loss, model.get_weights()
                pct = int(epoch / inp.epochs * 100)
                yield send(json.dumps({"epoch": epoch, "total": inp.epochs,
                    "loss": round(loss, 6), "val_loss": round(val_loss, 6),
                    "mae": round(mae, 6), "pct": pct}), "epoch")
                await asyncio.sleep(0)

            if best_weights:
                model.set_weights(best_weights)
            os.makedirs(ART_DIR, exist_ok=True)
            model.save(os.path.join(ART_DIR, "model.keras"))
            dump(scaler, os.path.join(ART_DIR, "scaler.pkl"))
            meta = {
                "location": inp.location, "T": T, "H": H, "features": FEATURES,
                "units": inp.units, "days_back": inp.days_back, "epochs_run": inp.epochs,
                "best_val_loss": round(best_val, 6), "y_type": "kwh",
                "target": "hourly_kwh_per_panel", "seasonal_encoding": True,
                "created_at": datetime.datetime.utcnow().isoformat(),
            }
            with open(os.path.join(ART_DIR, "meta.json"), "w") as f:
                json.dump(meta, f, indent=2)
            from services.forecaster_debug_fix import load_artifacts
            load_artifacts.cache_clear()
            yield send(f"[Saved] model.keras + scaler.pkl + meta.json", "ok")
            yield send(f"[Done] Best val_loss: {best_val:.6f} — Model live!", "ok")
            yield send("DONE", "ok")
        except Exception as e:
            yield send(f"[ERROR] Training: {e}", "err")
            yield send("DONE", "err")

    return StreamingResponse(event_stream(), media_type="text/event-stream")
