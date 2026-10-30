from services.forecaster import forecast_main

# Test the main forecasting function
print('Testing main forecast function...')

try:
    result = forecast_main(
        location='Lahore',
        panel_type='Mono',
        number_of_panels=6,
        forecast_days=7,
        tz='Asia/Karachi'
    )

    print('Forecast successful!')
    print(f'Range: {result["range_days"]} days')
    print(f'Confidence: {result["confidence"]}')
    print(f'Model used: {result["meta"]["artifacts"]}')
    print(f'Data points: {len(result["series"])}')
    print(f'Daily summary entries: {len(result["daily_summary"])}')

    # Show sample data
    print('\nSample hourly data:')
    for i, point in enumerate(result['series'][:3]):
        print(f'  Hour {i+1}: {point["total_kWh"]:.3f} kWh total')

    print('\nSample daily summary:')
    for i, day in enumerate(result['daily_summary'][:3]):
        print(f'  Day {i+1}: {day["total_kWh"]:.2f} kWh')

except Exception as e:
    print(f'Forecast error: {e}')
    import traceback
    traceback.print_exc()
