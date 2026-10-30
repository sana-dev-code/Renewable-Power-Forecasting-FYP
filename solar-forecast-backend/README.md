# Solar Forecast Pro 🌞

A complete solar energy forecasting system with machine learning predictions, weather API integration, and a modern web interface.

## 🌟 Features

- **Accurate Solar Predictions**: Machine learning models trained on historical weather data
- **Multi-Source Weather Data**: OpenWeatherMap API with NASA POWER fallback
- **Real-time Forecasting**: Hourly predictions up to 30 days ahead
- **Modern Web Interface**: Beautiful React TypeScript frontend
- **RESTful API**: FastAPI backend with automatic documentation
- **Database Integration**: Persistent forecast storage with Tortoise ORM
- **Responsive Design**: Works on all devices
- **Production Ready**: Robust error handling and fallback systems

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Frontend│◄──►│  FastAPI Backend│◄──►│  Weather APIs   │
│   (TypeScript)  │    │   (Python)      │    │  (OWM/NASA)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   PostgreSQL    │
                       │   Database      │
                       └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Python 3.8+
- Node.js 16+
- PostgreSQL (or SQLite for development)

### 1. Clone and Setup

```bash
git clone <your-repo-url>
cd solar-forecast-backend
```

### 2. Backend Setup

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Setup database (choose one):
# Option A: PostgreSQL
createdb solar_forecast

# Option B: SQLite (default)
# No setup needed - uses SQLite automatically

# Start backend server
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

### 3. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm start
```

### 4. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## 📊 API Endpoints

### Core Endpoints

- `POST /forecast/auto` - Generate solar forecast
- `GET /forecasts` - List historical forecasts
- `GET /ping` - Health check

### Request Example

```json
{
  "location": "Lahore",
  "panel_type": "Mono",
  "number_of_panels": 6,
  "forecast_days": 7
}
```

### Response Example

```json
{
  "range_days": 7,
  "confidence": "high",
  "series": [...],
  "daily_summary": [...],
  "meta": {
    "location": "Lahore",
    "lat": 31.5204,
    "lon": 74.3587,
    "artifacts": "ml"
  }
}
```

## 🛠️ Development

### Backend Development

```bash
# Install development dependencies
pip install -r requirements-dev.txt

# Run tests
pytest

# Format code
black .
isort .

# Type checking
mypy .
```

### Frontend Development

```bash
# Run tests
npm test

# Build for production
npm run build

# Run linter
npm run lint
```

## 🔧 Configuration

### Environment Variables

#### Backend (.env)

```env
DATABASE_URL=postgres://user:pass@localhost:5432/solar_forecast
OWM_KEY=your_openweathermap_api_key
ART_DIR=training_artifacts
```

#### Frontend (.env)

```env
REACT_APP_API_URL=http://localhost:8000
```

## 📈 Machine Learning

The system includes a trained LSTM model for solar energy prediction:

- **Model**: LSTM Neural Network
- **Features**: Irradiance, temperature, wind speed, time features
- **Training Data**: Historical weather patterns
- **Fallback**: Rule-based baseline when ML fails

### Training the Model

```bash
# Train with default settings
python train_minimal.py

# Train with custom location and parameters
TRAIN_LOC=Lahore DAYS_BACK=180 python train_minimal.py
```

## 🌐 Deployment

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build manually
docker build -t solar-forecast .
docker run -p 8000:8000 solar-forecast
```

### Production Deployment

1. Set environment variables
2. Use production WSGI server (Gunicorn)
3. Configure reverse proxy (Nginx)
4. Set up SSL certificates
5. Configure monitoring and logging

## 📱 Screenshots

_Add screenshots of the web interface here_

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- OpenWeatherMap for weather data
- NASA POWER for historical data
- TensorFlow/Keras for ML capabilities
- FastAPI for the robust backend framework

## 📞 Support

For support, please open an issue on GitHub or contact the development team.

---

**Made with ❤️ for sustainable energy forecasting**
