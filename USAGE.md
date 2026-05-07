# SolarCast Pro — Usage Guide

## App Kaise Start Karein

1. **PostgreSQL** chal raha ho (Services mein check karo)
2. `LAUNCH_FYP_FULL.bat` double click karo
3. 2 black terminals khulenge — wait karo jab tak dono ready hon
4. Browser automatically `http://localhost:4000` open karega

---

## Login / Signup

App khulne par login screen aayegi:

- **Pehli baar?** → "No account? Signup here" click karo
- **Email** — valid email address likho (e.g. `test@gmail.com`)
- **Password rules:**
  - Kam az kam 8 characters
  - Ek capital letter (A-Z)
  - Ek number (0-9)
  - Ek symbol (`@`, `!`, `#`, etc.)
  - Example: `Solar@123`

Login hone ke baad dark dashboard dikhega.

---

## Dashboard

Login ke baad yeh sections dikhenge sidebar mein:

| Section | Kaam |
|---------|------|
| **Dashboard** | Overview — total forecasts, last output, model status |
| **Forecast** | Naya forecast run karo |
| **Analytics** | Charts aur analysis |
| **History** | Purane forecasts dekho |
| **Model Training** | ML model train karo |
| **Dataset Builder** | Training data banao |
| **Settings** | App settings |

---

## Forecast Kaise Chalayein

1. Sidebar mein **"Forecast"** click karo (ya header mein "⚡ New Forecast")
2. Yeh fields fill karo:

| Field | Description | Example |
|-------|-------------|---------|
| **Location** | Apna shehar | Lahore |
| **No. of Panels** | Kitne solar panels hain | 6 |
| **Days (1-30)** | Kitne din ka forecast chahiye | 7 |
| **Panel Technology** | Panel ka type | Mono (sabse zyada efficient) |

3. **"⚡ Generate Forecast"** button dabao
4. Loading overlay aayega — 10-30 seconds wait karo
5. Results right side mein dikhenge

---

## Results Samajhna

Forecast run hone ke baad yeh data milega:

### Stat Cards (upar)
- **Total kWh** — poore period mein total energy
- **Avg Daily** — roz ka average
- **Peak Day** — sabse zyada production wala din
- **Confidence** — `high` (1-7 din), `medium` (8-15 din), `low` (15+ din)

### Charts
- **Hourly chart** — har ghante ki production
- **Daily chart** — roz ki production

### Daily Table
- Har din ki total kWh production

---

## Savings Calculator

Forecast ke saath savings bhi calculate hoti hain:

- **Tariff** — bijli ka rate (Rs/kWh) — default 55
- **Emission Factor** — CO₂ per kWh — auto-set hota hai city ke hisaab se

Yeh values form mein change kar sakte ho apne actual rate ke hisaab se.

---

## History

- Sidebar mein **"History"** click karo
- Purane sare forecasts list mein dikhenge
- Kisi bhi forecast pe click karo details dekhne ke liye

---

## Model Training (Advanced)

Agar ML model retrain karna ho:

1. Sidebar mein **"Model Training"** click karo
2. Location aur settings set karo
3. **"Start Training"** click karo
4. Progress bar mein training dekho

> **Note:** Training mein 5-15 minute lag sakte hain

---

## Dataset Builder (Advanced)

1. Sidebar mein **"Dataset Builder"** click karo
2. Location aur date range set karo
3. **"Build Dataset"** click karo
4. CSV download ho jaayegi

---

## App Band Karna

- Jo 2 black terminals khule hain unhe band karo (X button)
- Ya `Ctrl+C` dono terminals mein

---

## Ports Reference

| Service | Port | URL |
|---------|------|-----|
| Main App (Auth Proxy) | 4000 | http://localhost:4000 |
| Python Backend | 8000 | http://localhost:8000 |
| API Docs | 8000 | http://localhost:8000/docs |

---

## Password Reset

1. Login screen pe **"Forgot Password?"** click karo
2. Email enter karo
3. Agar SMTP configure hai → email aayegi code ke saath
4. Agar SMTP nahi → code auth-proxy terminal mein print hoga (`[DEV] Reset code for...`)
5. Code enter karo → naya password set karo
