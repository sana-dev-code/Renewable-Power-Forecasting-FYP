import httpx
import asyncio

async def test_owm_api():
    OWM_KEY = 'cc449135ddb3753fa555ce6526cac3fc'
    lat, lon = 31.5204, 74.3587  # Lahore coordinates

    print(f'Testing API key: {OWM_KEY[:10]}...')

    # Test current weather endpoint first
    params_current = {
        'lat': f'{lat:.4f}', 'lon': f'{lon:.4f}',
        'appid': OWM_KEY, 'units': 'metric'
    }

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            print('Testing current weather endpoint...')
            r = await client.get('https://api.openweathermap.org/data/2.5/weather', params=params_current)
            print(f'Current Weather Status Code: {r.status_code}')
            if r.status_code != 200:
                print(f'Current Weather Error: {r.text}')
            else:
                js = r.json()
                print(f'Current Weather Success! Location: {js.get("name")}')

            # Test onecall endpoint
            params_onecall = {
                'lat': f'{lat:.4f}', 'lon': f'{lon:.4f}',
                'appid': OWM_KEY, 'units': 'metric', 'exclude': 'minutely,alerts'
            }

            print('Testing onecall endpoint...')
            r2 = await client.get('https://api.openweathermap.org/data/2.5/onecall', params=params_onecall)
            print(f'Onecall Status Code: {r2.status_code}')
            if r2.status_code != 200:
                print(f'Onecall Error: {r2.text}')
            else:
                js2 = r2.json()
                print(f'Onecall Success! Got {len(js2.get("hourly", []))} hourly records')

    except Exception as e:
        print(f'Exception: {e}')

asyncio.run(test_owm_api())
