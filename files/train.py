"""
train.py — SolarCast Pro LSTM Model Trainer
Run: python train.py
Or:  TRAIN_LOC=Karachi EPOCHS=100 python train.py
"""
import os, json, time
import numpy as np
import pandas as pd
from datetime import datetime
from sklearn.preprocessing import StandardScaler
from joblib import dump

# ─── CONFIG ───────────────────────────────────────────
LOCATION   = os.getenv("TRAIN_LOC", "Lahore")
DAYS_BACK  = int(os.getenv("DAYS_BACK", "180"))
EPOCHS     = int(os.getenv("EPOCHS", "50"))
T          = int(os.getenv("SEQ_LEN", "72"))   # lookback window hours
H          = int(os.getenv("HORIZON", "24"))   # prediction horizon hours
UNITS      = int(os.getenv("LSTM_UNITS", "64"))
BATCH_SIZE = int(os.getenv("BATCH_SIZE", "32"))
LR         = float(os.getenv("LEARNING_RATE", "0.001"))

ART_DIR    = os.getenv("ART_DIR", "services/training_artifacts")
os.makedirs(ART_DIR, exist_ok=True)

FEATURES   = ["irr", "t_amb", "t_mod", "wind", "hour", "doy_sin", "doy_cos"]
# ──────────────────────────────────────────────────────

print("=" * 56)
print("  ☀  SolarCast Pro — LSTM Training")
print("=" * 56)
print(f"  Location   : {LOCATION}")
print(f"  History    : {DAYS_BACK} days")
print(f"  Epochs     : {EPOCHS}")
print(f"  Seq length : T = {T}")
print(f"  Horizon    : H = {H}")
print(f"  LSTM units : {UNITS}")
print(f"  Batch size : {BATCH_SIZE}")
print("=" * 56)

# ─── 1. LOAD DATASET ──────────────────────────────────
csv_path = os.path.join(ART_DIR, f"dataset_{LOCATION}_{DAYS_BACK}d.csv")
if not os.path.exists(csv_path):
    print(f"\n[ERROR] Dataset not found: {csv_path}")
    print("Run: python make_dataset_only.py first.\n")
    exit(1)

print(f"\n[1/5] Loading dataset: {csv_path}")
df = pd.read_csv(csv_path, parse_dates=["ts"])
df["ts"] = pd.to_datetime(df["ts"], utc=True)
print(f"      Rows: {len(df)}, Cols: {list(df.columns)}")

# ─── 2. FEATURES + TARGET ─────────────────────────────
print("[2/5] Preparing features and targets...")

# Add doy_sin / doy_cos if missing
if "doy_sin" not in df.columns:
    df["doy_sin"] = np.sin(2 * np.pi * df["ts"].dt.dayofyear / 365).astype("float32")
if "doy_cos" not in df.columns:
    df["doy_cos"] = np.cos(2 * np.pi * df["ts"].dt.dayofyear / 365).astype("float32")

# Verify features
missing = [f for f in FEATURES if f not in df.columns]
if missing:
    print(f"[ERROR] Missing features: {missing}")
    exit(1)

X_raw = df[FEATURES].values.astype("float32")
y_raw = df["target_kwh_per_panel"].values.astype("float32")

# NaN / inf cleanup
X_raw = np.nan_to_num(X_raw, nan=0.0, posinf=0.0, neginf=0.0)
y_raw = np.nan_to_num(y_raw, nan=0.0, posinf=0.0, neginf=0.0)
print(f"      X shape: {X_raw.shape}, y range: [{y_raw.min():.4f}, {y_raw.max():.4f}]")

# ─── 3. SCALE + BUILD WINDOWS ─────────────────────────
print("[3/5] Scaling and building sliding windows...")
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X_raw)

X_win, y_win = [], []
for i in range(T, len(X_scaled) - H + 1):
    X_win.append(X_scaled[i-T:i])
    y_win.append(y_raw[i:i+H])

X_win = np.array(X_win, dtype="float32")
y_win = np.array(y_win, dtype="float32")
print(f"      Windows: {len(X_win)}, X: {X_win.shape}, y: {y_win.shape}")

# Train/val split
split = int(len(X_win) * 0.85)
X_train, X_val = X_win[:split], X_win[split:]
y_train, y_val = y_win[:split], y_win[split:]
print(f"      Train: {len(X_train)}, Val: {len(X_val)}")

# ─── 4. BUILD MODEL ───────────────────────────────────
print("[4/5] Building LSTM model...")
try:
    import tensorflow as tf
except ImportError:
    print("[ERROR] TensorFlow not installed. Run: pip install tensorflow")
    exit(1)

print(f"      TensorFlow version: {tf.__version__}")

model = tf.keras.Sequential([
    tf.keras.layers.Input(shape=(T, len(FEATURES))),
    tf.keras.layers.LSTM(UNITS, return_sequences=True),
    tf.keras.layers.Dropout(0.15),
    tf.keras.layers.LSTM(UNITS // 2),
    tf.keras.layers.Dropout(0.1),
    tf.keras.layers.Dense(64, activation='relu'),
    tf.keras.layers.Dense(H, activation='relu'),   # output: kWh per panel per hour
])

model.compile(
    optimizer=tf.keras.optimizers.Adam(learning_rate=LR),
    loss='mse',
    metrics=['mae']
)
model.summary()

# ─── 5. TRAIN ─────────────────────────────────────────
print(f"\n[5/5] Training for {EPOCHS} epochs...")

callbacks = [
    tf.keras.callbacks.EarlyStopping(patience=10, restore_best_weights=True, verbose=1),
    tf.keras.callbacks.ReduceLROnPlateau(patience=5, factor=0.5, verbose=1),
    tf.keras.callbacks.ModelCheckpoint(
        os.path.join(ART_DIR, "model_best.keras"), save_best_only=True, verbose=0
    ),
]

t0 = time.time()
history = model.fit(
    X_train, y_train,
    validation_data=(X_val, y_val),
    epochs=EPOCHS,
    batch_size=BATCH_SIZE,
    callbacks=callbacks,
    verbose=1,
)
elapsed = time.time() - t0
print(f"\n  Training completed in {elapsed:.1f}s")

# ─── SAVE ─────────────────────────────────────────────
model_path  = os.path.join(ART_DIR, "model.keras")
scaler_path = os.path.join(ART_DIR, "scaler.pkl")
meta_path   = os.path.join(ART_DIR, "meta.json")

model.save(model_path)
dump(scaler, scaler_path)

best_val = min(history.history.get("val_loss", [9999]))
meta = {
    "features": FEATURES,
    "T": T,
    "H": H,
    "units": UNITS,
    "location": LOCATION,
    "days_back": DAYS_BACK,
    "epochs_run": len(history.history["loss"]),
    "best_val_loss": round(float(best_val), 6),
    "y_type": "kwh",
    "trained_at": datetime.utcnow().isoformat(),
}
with open(meta_path, "w") as f:
    json.dump(meta, f, indent=2)

print("\n" + "=" * 56)
print("  ✅ Training Complete!")
print("=" * 56)
print(f"  Model   : {model_path}")
print(f"  Scaler  : {scaler_path}")
print(f"  Meta    : {meta_path}")
print(f"  Val MSE : {best_val:.6f}")
print(f"  Time    : {elapsed:.1f}s")
print("=" * 56)
print("\nYour model is ready. Restart the API server to load it.")
print("The /forecast/auto endpoint will now use the ML model.\n")
