import type { WeatherData } from '@/types/geotag';

const OPENWEATHER_API_KEY = '84aab87013ed9eaed6f6da661c08eb1b';

/**
 * Fetch current weather data from OpenWeatherMap API
 */
export async function fetchWeather(lat: number, lng: number): Promise<WeatherData> {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&units=metric&appid=${OPENWEATHER_API_KEY}`;

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
    }

    const data = await response.json();

    const temperatureC = Math.round(data.main.temp);
    const temperatureF = Math.round(temperatureC * 9 / 5 + 32);
    const weatherCode = data.weather[0].id; // OpenWeather condition code
    const description = data.weather[0].description;
    const iconCode = data.weather[0].icon; // e.g. 01d, 02n

    // Using local PNG files from /public/open_weather_map/
    const iconUrl = `/open_weather_map/${iconCode}.png`;

    return {
        temperatureC,
        temperatureF,
        weatherCode,
        description,
        iconUrl,
    };
}
