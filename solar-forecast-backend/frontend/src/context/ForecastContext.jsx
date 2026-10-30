import React, { createContext, useContext, useState, useCallback } from "react";
import { apiService } from "../services/api";
import { generateLahoreDemoData } from "../data/demoForecast";

const ForecastContext = createContext(null);

export function ForecastProvider({ children }) {
  const [forecastResult, setForecastResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastInput, setLastInput] = useState(null);
  const [isDemo, setIsDemo] = useState(false);
  const [totalForecastCount, setTotalForecastCount] = useState(0);
  const [extras, setExtras] = useState(() => {
    const tariff = parseFloat(localStorage.getItem("setting_pkr_rate") || "55");
    const emissionFactor = parseFloat(localStorage.getItem("setting_co2_factor") || "0.55");
    return {
      tariff: isNaN(tariff) ? 55 : tariff,
      emissionFactor: isNaN(emissionFactor) ? 0.55 : emissionFactor,
    };
  });

  const runForecast = useCallback(async (input) => {
    setLoading(true);
    setError(null);
    setLastInput(input);
    setIsDemo(false);
    try {
      const result = await apiService.getForecast(input);
      setForecastResult(result);
      setTotalForecastCount((c) => c + 1);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to fetch forecast";
      setError(msg);
      setForecastResult(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDemo = useCallback(() => {
    const demo = generateLahoreDemoData(extras.tariff);
    setForecastResult(demo);
    setIsDemo(true);
    setError(null);
  }, [extras.tariff]);

  const clearForecast = useCallback(() => {
    setForecastResult(null);
    setIsDemo(false);
    setError(null);
  }, []);

  const retryLastForecast = useCallback(() => {
    if (lastInput) runForecast(lastInput);
  }, [lastInput, runForecast]);

  return (
    <ForecastContext.Provider
      value={{
        forecastResult,
        loading,
        error,
        lastInput,
        isDemo,
        totalForecastCount,
        extras,
        setExtras,
        runForecast,
        loadDemo,
        clearForecast,
        retryLastForecast,
      }}
    >
      {children}
    </ForecastContext.Provider>
  );
}

export function useForecast() {
  const ctx = useContext(ForecastContext);
  if (!ctx) throw new Error("useForecast must be used within ForecastProvider");
  return ctx;
}

export default ForecastContext;
