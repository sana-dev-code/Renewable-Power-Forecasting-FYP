/**
 * Generates a realistic 7-day demo solar forecast for Lahore, Pakistan.
 * Used when backend is unavailable or user wants to explore the UI.
 * 6 × 550W Monocrystalline panels = 3.3 kWp system.
 */
export function generateLahoreDemoData(tariffRate = 55) {
  const daysCount = 7;
  const panelCount = 6;
  const panelType = "Mono";
  const location = "Lahore";
  const confidence = "92%";

  // Realistic daily outputs for a sunny week in Lahore (kWh)
  const baseDailyOutputs = [15.4, 16.8, 14.2, 17.5, 13.9, 16.1, 15.8];

  const dailySummary = [];
  const series = [];
  const today = new Date();

  for (let d = 0; d < daysCount; d++) {
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + d);
    const dateStr = targetDate.toISOString().slice(0, 10);
    const dailyTotal = baseDailyOutputs[d];

    dailySummary.push({ date: dateStr, total_kWh: dailyTotal });

    // Sine-curve distribution peaked at 13:00
    let sumWeights = 0;
    const weights = {};
    for (let h = 0; h < 24; h++) {
      if (h >= 6 && h <= 18) {
        const w = Math.sin(((h - 6) / 12) * Math.PI);
        weights[h] = Math.max(0, w);
        sumWeights += weights[h];
      } else {
        weights[h] = 0;
      }
    }

    for (let h = 0; h < 24; h++) {
      const ts = new Date(targetDate);
      ts.setHours(h, 0, 0, 0);
      const hourlyTotal =
        sumWeights > 0 ? (weights[h] / sumWeights) * dailyTotal : 0;
      series.push({
        ts: ts.toISOString(),
        per_panel_kWh: +(hourlyTotal / panelCount).toFixed(4),
        total_kWh: +hourlyTotal.toFixed(4),
      });
    }
  }

  return {
    range_days: daysCount,
    granularity: "hourly",
    series,
    daily_summary: dailySummary,
    confidence,
    meta: {
      tz: "Asia/Karachi",
      location,
      lat: 31.5204,
      lon: 74.3587,
      panel_type: panelType,
      panel_count: panelCount,
      artifacts: "LSTM Ensemble v2.1",
    },
  };
}
