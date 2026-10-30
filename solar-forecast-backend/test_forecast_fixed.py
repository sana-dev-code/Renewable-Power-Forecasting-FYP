from services.forecaster import forecast_main
import asyncio

async def test_forecast():
    try:
        result = await forecast_main(
            location='Lahore',
            panel_type='Mono',
            number_of_panels=6,
            forecast_days=3,
            tz='Asia/Karachi'
        )
        print('Forecast successful!')
        print(f'Days: {result["range_days"]}')
        print(f'Confidence: {result["confidence"]}')
        print(f'Model used: {result["meta"]["artifacts"]}')
        print(f'Daily summary: {result["daily_summary"]}')
        print(f'Number of hourly records: {len(result["series"])}')
    except Exception as e:
        print(f'Forecast failed: {e}')
        import traceback
        traceback.print_exc()

asyncio.run(test_forecast())
