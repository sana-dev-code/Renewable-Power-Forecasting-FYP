import os, json, numpy as np
from datetime import datetime
import pandas as pd

from joblib import dump
from sklearn.preprocessing import StandardScaler

import tensorflow as tf
import keras
from keras import layers, models

from services.forecaster_debug_fix import build_history, add_time_feats, geocode_fallback

from services.solar import solar_elevation_deg

# ------------------- CONFIG -------------------
ART_DIR = os.getenv("ART_DIR", "services/training_artifacts")
os.makedirs(ART_DIR, exist_ok=True)

LOCATION  = os.getenv("TRAIN_LOC", "Lahore")
DAYS_BACK = int(os.getenv("DAYS_BACK", "180"))

T = 72      # input hours
H = 24      # predict next 24 hours

# ------------------- DATA PREP -------------------
print("📥 Building historical data...")
lat, lon = geocode_fallback(LOCATION)
hist = build_history(lat, lon, days_back=DAYS_BACK)
hist = add_time_feats(hist)

# Time & daylight mask
ts_utc = pd.to_datetime(hist["ts"], utc=True)
day_mask = ts_utc.map(
    lambda t: solar_elevation_deg(lat, lon, t.to_pydatetime()) > 3.0
).to_numpy()

# ------------------- TARGET (PER PANEL, HOURLY kWh) -------------------
# Physics-based estimate (1 panel)
cap = (hist["irr"].values * 2.0 * 0.20 * 0.85) / 1000.0
y_all = cap.astype("float32")

# Night = zero
y_all[~day_mask] = 0.0
y_all = np.clip(y_all, 0.0, None)

# ------------------- SEASONAL FEATURES -------------------
hist["doy_sin"] = np.sin(2*np.pi*hist["doy"]/365)
hist["doy_cos"] = np.cos(2*np.pi*hist["doy"]/365)

FEATURES = [
    "irr", "t_amb", "t_mod",
    "wind", "hour",
    "doy_sin", "doy_cos"
]

# ------------------- SCALE INPUTS -------------------
X_all = hist[FEATURES].values.astype("float32")
scaler = StandardScaler()
X_all = scaler.fit_transform(X_all)

# ------------------- SEQUENCE BUILD -------------------
Xs, Ys = [], []
for i in range(T, len(hist) - H):
    Xs.append(X_all[i - T:i])
    Ys.append(y_all[i:i + H])

X = np.asarray(Xs, dtype="float32")
Y = np.asarray(Ys, dtype="float32")

# Train / Validation split
split = int(len(X) * 0.9)
Xtr, Ytr = X[:split], Y[:split]
Xval, Yval = X[split:], Y[split:]

print("✅ Dataset ready")
print("Train samples:", Xtr.shape[0])
print("Val samples:", Xval.shape[0])

# ------------------- MODEL -------------------
def build_lstm_model(units1=64, units2=32, lr=0.001):
    model = models.Sequential([
        layers.Input(shape=(T, X.shape[-1])),
        layers.LSTM(units1, return_sequences=True),
        layers.LSTM(units2),
        layers.Dense(H, activation="relu")
    ])
    opt = keras.optimizers.Adam(learning_rate=lr)
    model.compile(optimizer=opt, loss="mse")
    return model

model = build_lstm_model()

# ------------------- TRAIN -------------------
print("🚀 Training model...")
model.fit(
    Xtr, Ytr,
    validation_data=(Xval, Yval),
    epochs=15,
    batch_size=64,
    verbose=1
)

# ------------------- SAVE ARTIFACTS -------------------
model_path = os.path.join(ART_DIR, "model.keras")
scaler_path = os.path.join(ART_DIR, "scaler.pkl")
meta_path = os.path.join(ART_DIR, "meta.json")

model.save(model_path)
dump(scaler, scaler_path)

with open(meta_path, "w") as f:
    json.dump({
        "location": LOCATION,
        "T": T,
        "H": H,
        "features": FEATURES,
        "target": "hourly_kwh_per_panel",
        "seasonal_encoding": True,
        "created_at": datetime.utcnow().isoformat()
    }, f, indent=2)

print("🎉 TRAINING COMPLETE")
print("Saved files:")
print(" -", model_path)
print(" -", scaler_path)
print(" -", meta_path)
