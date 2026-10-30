import axios from 'axios';

// Auth proxy handles JWT verification + forwards /api/* to FastAPI backend
const AUTH_BASE   = process.env.REACT_APP_PROXY_URL || 'http://localhost:4000';
const API_BASE    = process.env.REACT_APP_API_URL   || 'http://localhost:4000/api';

// Axios instance — routes through auth proxy
const api = axios.create({ baseURL: API_BASE });

// Attach Bearer token on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Types ────────────────────────────────────────────────
export interface ForecastInput {
  location: string;
  panel_type: string;
  number_of_panels: number;
  forecast_days: number;
}

export interface ForecastResult {
  range_days: number;
  granularity: string;
  series: Array<{ ts: string; per_panel_kWh: number; total_kWh: number }>;
  daily_summary: Array<{ date: string; total_kWh: number }>;
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
}

export interface HistoricalForecast {
  id: number;
  location: string;
  panel_type: string;
  panel_count: number;
  forecast_days: number;
  confidence: string;
  daily_json: Array<{ date: string; total_kWh: number }>;
  lat: number;
  lon: number;
  artifacts: string;
  created_at: string;
}

// ── Service ──────────────────────────────────────────────
class ApiService {
  async login(username: string, password: string): Promise<boolean> {
    try {
      const res = await axios.post(`${AUTH_BASE}/login`, { username, password });
      if (res.data?.token) {
        localStorage.setItem('auth_token', res.data.token);
        return true;
      }
      return false;
    } catch { return false; }
  }

  async signup(username: string, password: string): Promise<boolean> {
    try {
      const res = await axios.post(`${AUTH_BASE}/signup`, { username, password });
      if (res.data?.token) {
        localStorage.setItem('auth_token', res.data.token);
        return true;
      }
      return false;
    } catch { return false; }
  }

  async requestPasswordReset(username: string): Promise<boolean> {
    try {
      await axios.post(`${AUTH_BASE}/request-reset`, { username });
      return true;
    } catch { return false; }
  }

  async confirmPasswordReset(username: string, code: string, newPassword: string): Promise<boolean> {
    try {
      const res = await axios.post(`${AUTH_BASE}/confirm-reset`, {
        username, code, new_password: newPassword,
      });
      return !!res.data?.ok;
    } catch { return false; }
  }

  async getForecast(input: ForecastInput): Promise<ForecastResult> {
    const res = await api.post<ForecastResult>('/forecast/auto', input);
    return res.data;
  }

  async getHistoricalForecasts(limit = 10): Promise<HistoricalForecast[]> {
    const res = await api.get<HistoricalForecast[]>(`/forecasts?limit=${limit}`);
    return res.data;
  }

  async ping(): Promise<boolean> {
    try {
      const res = await axios.get(`${AUTH_BASE}/api/ping`);
      return !!res.data;
    } catch { return false; }
  }
}

export const apiService = new ApiService();
