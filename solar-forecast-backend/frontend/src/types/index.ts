export interface HourlyData {
  ts: string;
  per_panel_kWh: number;
  total_kWh: number;
}

export interface DailyData {
  date: string;
  total_kWh: number;
}

export interface ForecastInput {
  location: string;
  panel_type: string;
  number_of_panels: number;
  forecast_days: number;
}

export interface ForecastResult {
  range_days: number;
  granularity: string;
  series: HourlyData[];
  daily_summary: DailyData[];
  confidence: string;
  meta: {
    tz: string;
    location: string;
    lat: number;
    lon: number;
    panel_type: string;
    panel_count: number;
    artifacts: string;
  };
  // ...existing exports (ForecastInput, ForecastResult, etc.)

}


export interface HistoricalForecast {
  id: number;
  location: string;
  panel_type: string;
  panel_count: number;
  forecast_days: number;
  confidence: string;
  daily_json: DailyData[];
  lat: number;
  lon: number;
  artifacts: string;
  created_at: string;
}

export const PANEL_TYPES = [
  { value: 'Mono', label: 'Monocrystalline', efficiency: 'High' },
  { value: 'Poly', label: 'Polycrystalline', efficiency: 'Medium' },
  { value: 'Thin-Film', label: 'Thin Film', efficiency: 'Low' },
];

export const CITIES = [
  'Lahore',
  'Karachi',
  'Islamabad',
  'Rawalpindi',
  'Faisalabad',
  'Multan',
  'Peshawar',
  'Quetta',
  'Sialkot',
  'Gujranwala',
];
// ...existing exports (ForecastInput, ForecastResult, etc.)

export interface UiExtras {
  /** Electricity price in PKR per kWh, e.g. 55 */
  tariff: number;
  /** Grid emission factor in kg CO₂ per kWh, e.g. 0.45 */
  emissionFactor: number;
}
