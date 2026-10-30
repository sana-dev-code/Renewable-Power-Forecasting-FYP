# Solar Forecast Pro - Frontend

A modern React TypeScript frontend for solar energy forecasting with beautiful UI and real-time data visualization.

## Features

- 🌞 **Solar Energy Forecasting**: Get accurate predictions for your location
- 📊 **Interactive Charts**: Visualize energy production with Chart.js
- 🎨 **Modern UI**: Clean, responsive design with Tailwind CSS
- 🔄 **Real-time API Status**: Live connection status monitoring
- 📱 **Responsive Design**: Works on desktop, tablet, and mobile
- ⚡ **Fast Performance**: Optimized React components with TypeScript

## Tech Stack

- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Chart.js** with react-chartjs-2 for data visualization
- **Lucide React** for icons
- **Axios** for API communication
- **Date-fns** for date formatting

## Getting Started

### Prerequisites

- Node.js 16+ and npm
- Backend API running on port 8000 (see backend README)

### Installation

1. Navigate to the frontend directory:

   ```bash
   cd frontend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the development server:

   ```bash
   npm start
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Build for Production

```bash
npm run build
```

## Environment Variables

Create a `.env` file in the frontend directory:

```env
REACT_APP_API_URL=http://localhost:8000
```

## API Integration

The frontend communicates with the FastAPI backend to:

- Get solar energy forecasts
- Retrieve historical forecast data
- Check API health status

## Components

- **ForecastForm**: Input form for location, panel type, and forecast parameters
- **ForecastResults**: Display forecast results with charts and summary cards
- **ApiService**: Handles all backend API communication

## Features in Detail

### Solar Forecast Form

- Location selection (major Pakistani cities)
- Panel type selection (Mono, Poly, Thin-Film)
- Number of panels configuration
- Forecast days selection (1-30 days)

### Results Display

- Interactive energy production charts
- Daily energy summary table
- Confidence level indicators
- Location and panel information
- Total and per-panel energy metrics

### API Status Monitoring

- Real-time connection status
- Automatic health checks
- Visual status indicators

## Development

### Available Scripts

- `npm start` - Start development server
- `npm test` - Run tests
- `npm run build` - Build for production
- `npm run eject` - Eject from Create React App

### Project Structure

```
frontend/
├── public/
├── src/
│   ├── components/
│   │   ├── ForecastForm.tsx
│   │   └── ForecastResults.tsx
│   ├── services/
│   │   └── api.ts
│   ├── types/
│   │   └── index.ts
│   ├── App.tsx
│   ├── index.tsx
│   └── index.css
├── package.json
└── README.md
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
