import os
import json
import numpy as np
import pandas as pd
from joblib import load
import tensorflow as tf
from datetime import timedelta

# ------------------- Config -------------------
ART_DIR = "services/training_artifacts"
MODEL_PATH = os.path.join(ART_DIR, "model.keras")
SCALER_PATH = os.path.join(ART_DIR, "scaler.pkl")
FEATURES = ["irr", "t_amb", "t_mod", "wind", "hour", "doy"]
T = 72  # time steps (same as training)
H = 24  # prediction horizon

# ------------------- Load Artifacts -------------------
model = tf.keras.models.load_model(MODEL_PATH)
scaler = load(SCALER_PATH)

# ------------------- Prediction Function -------------------
MAX_CAPACITY_PER_HOUR = 0.34  # ≈ Lahore noon peak per panel

def predict_per_panel_lstm(hist, future):
    # Add time feats (must match training)
    full = pd.concat([hist, future], ignore_index=True)
    full["ts"] = pd.to_datetime(full["ts"], utc=True)

    full["hour"] = full["ts"].dt.hour.astype("int16")
    full["doy"]  = full["ts"].dt.dayofyear.astype("int16")
    full["doy_sin"] = np.sin(2*np.pi*full["doy"]/365)
    full["doy_cos"] = np.cos(2*np.pi*full["doy"]/365)

    FEATURES = ["irr","t_amb","t_mod","wind","hour","doy_sin","doy_cos"]

    X_all = scaler.transform(full[FEATURES].values.astype("float32"))
    X_input = X_all[-T:].reshape(1, T, len(FEATURES))

    pred = model.predict(X_input, verbose=0)[0]   # kWh per panel per hour
    pred = np.clip(pred, 0.0, None)

    return [round(float(x), 4) for x in pred]


# ------------------- Format Response -------------------
def format_response(per_panel, days=1):
    start = pd.Timestamp.now('UTC').floor("H") + pd.Timedelta(hours=1)
    idx = pd.date_range(start=start, periods=len(per_panel), freq="H")
    
    hourly = [{"ts": idx[i].isoformat(), "per_panel_kWh": per_panel[i], "total_kWh": per_panel[i]} 
              for i in range(len(per_panel))]
    
    df = pd.DataFrame({"ts": idx, "total": per_panel})
    daily = df.groupby(df["ts"].dt.date)["total"].sum().reset_index()
    daily = [{"date": str(r["ts"]), "total_kWh": round(float(r["total"]), 2)} for _, r in daily.iterrows()]
    
    conf = "high" if days<=7 else ("medium" if days<=15 else "low")
    
    return {
        "range_days": days,
        "granularity": "hourly",
        "series": hourly,
        "daily_summary": daily,
        "confidence": conf
    }

# ------------------- Example Usage -------------------
if __name__ == "__main__":
    # Load some historical data
    hist = pd.read_csv("data/history.csv")  # past data with FEATURES
    future = pd.read_csv("data/future.csv")  # next H hours with same FEATURES
    
    per_panel = predict_per_panel_lstm(hist, future)
    response = format_response(per_panel, days=len(per_panel)//24)
    
    print(json.dumps(response, indent=2))
