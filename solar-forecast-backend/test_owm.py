import httpx
import asyncio

async def test_owm():
    OWM_KEY = 'cc449135ddb3753fa555ce6526cac3fc'
    lat, lon = 31.5204, 74.3587  # Lahore coordinates
    params = {
        'lat': f'{lat:.4f}', 'lon': f'{lon:.4f}',
        'appid': OWM_KEY, 'units': 'metric', 'exclude': 'minutely,alerts'
    }
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            r = await client.get('https://api.openweathermap.org/data/2.5/onecall', params=params)
        print(f'Status Code: {r.status_code}')
        if r.status_code != 200:
            print(f'Error Response: {r.text}')
        else:
            js = r.json()
            print(f'Success! Got {len(js.get("hourly", []))} hourly records')
            if js.get('hourly'):
                print(f'First hourly record: {js["hourly"][0]}')
    except Exception as e:
        print(f'Exception: {e}')

asyncio.run(test_owm())
