# SolarCast Pro — Installation Guide

## Zaroorat ki cheezein (Prerequisites)

Yeh sab install hona chahiye pehle se:

| Software | Version | Download |
|----------|---------|----------|
| Python | 3.10+ | https://python.org |
| Node.js | 18+ | https://nodejs.org |
| PostgreSQL | 14+ | https://postgresql.org |

---

## Step 1 — PostgreSQL Setup

1. PostgreSQL install karo aur start karo
2. pgAdmin ya terminal mein yeh command chalao:

```sql
CREATE DATABASE solar_forecast;
```

3. Default user `postgres` ka password `sana` hona chahiye  
   (ya `auth-proxy/.env` aur `solar-forecast-backend/.env` mein apna password update karo)

---

## Step 2 — Python Backend Setup

Terminal kholo aur yeh chalao:

```bash
cd F:\Finalyear\solar-forecast-backend
python -m venv venv
venv\Scripts\activate
pip install fastapi uvicorn tortoise-orm asyncpg python-dotenv tensorflow keras scikit-learn pandas numpy requests httpx joblib
```

### .env check karo

`solar-forecast-backend/.env` file mein:

```
DATABASE_URL=postgres://postgres:YOUR_PASSWORD@localhost:5432/solar_forecast
OWM_KEY=your_openweathermap_api_key
```

---

## Step 3 — Node.js Auth Proxy Setup

```bash
cd F:\Finalyear\auth-proxy
npm install
```

### .env check karo

`auth-proxy/.env` file mein:

```
PORT=4000
BACKEND_URL=http://localhost:8000
DATABASE_URL=postgres://postgres:YOUR_PASSWORD@localhost:5432/solar_forecast
JWT_SECRET=koi_bhi_secret_string_likho
```

---

## Step 4 — OWM API Key (Optional but Recommended)

1. https://openweathermap.org par free account banao
2. API Keys section mein jaao
3. Key copy karo
4. `solar-forecast-backend/.env` mein paste karo:
   ```
   OWM_KEY=tumhari_key_yahan
   ```

---

## Step 5 — Pehli baar run karo

Sab setup hone ke baad:

```
F:\Finalyear\ mein LAUNCH_FYP_FULL.bat double click karo
```

Ya PowerShell mein:

```powershell
cd F:\Finalyear
.\LAUNCH_FYP_FULL.bat
```

---

## Common Errors

### Port 8000 already in use
```
Matlab backend pehle se chal raha hai — koi baat nahi, ignore karo
```

### PostgreSQL connection failed
```
- PostgreSQL service chal raha hai? Check karo: Services → postgresql
- Password sahi hai? .env files check karo
- Database exist karta hai? pgAdmin mein dekho
```

### npm install fail
```
cd F:\Finalyear\auth-proxy
npm install --legacy-peer-deps
```

### Python packages missing
```
cd F:\Finalyear\solar-forecast-backend
venv\Scripts\activate
pip install -r requirements.txt
```

---

## Folder Structure

```
F:\Finalyear\
├── LAUNCH_FYP_FULL.bat        ← Yahan se start karo
├── auth-proxy\
│   ├── server.js              ← Auth + proxy server
│   ├── db.js                  ← Database helpers
│   └── .env                   ← Auth config
└── solar-forecast-backend\
    ├── app.py                 ← FastAPI backend
    ├── models.py              ← Database models
    ├── db.py                  ← DB connection
    ├── solar_app.html         ← Main UI (dark dashboard)
    ├── .env                   ← Backend config + OWM key
    └── services\
        ├── forecaster_debug_fix.py  ← Main ML engine
        ├── owm_fixed.py             ← Weather API
        ├── solar.py                 ← Sun calculations
        └── training_artifacts\
            ├── model.keras          ← Trained LSTM model
            └── scaler.pkl           ← Data scaler
```
