const axios = require("axios");

const WEATHER_BASE = "https://api.openweathermap.org/data/2.5";
const CACHE_TTL = 30 * 60 * 1000;
const CACHE = {};

class WeatherError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

const getApiKey = () => {
  const key = process.env.OPENWEATHER_API_KEY || process.env.WEATHER_API_KEY;
  if (!key) throw new WeatherError("OPENWEATHER_API_KEY não configurada no .env", 500);
  return key;
};

const withCache = async (cacheKey, fetcher) => {
  const cached = CACHE[cacheKey];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached.data;

  const data = await fetcher();
  CACHE[cacheKey] = { data, timestamp: Date.now() };
  return data;
};

const toWeatherError = (error, fallback) => {
  if (error instanceof WeatherError) return error;
  const status = error.response?.status;
  console.error(fallback, error.response?.data?.message || error.message);
  if (status === 404) return new WeatherError("Cidade não encontrada", 404);
  if (status === 401) return new WeatherError("Chave da OpenWeather inválida ou ainda não ativada", 502);
  return new WeatherError(fallback, 502);
};

const toKmh = (speed) => Math.round(speed * 3.6);

const getWeatherByCity = async (city) => {
  try {
    return await withCache(`weather_${city.toLowerCase()}`, async () => {
      const { data } = await axios.get(`${WEATHER_BASE}/weather`, {
        params: { q: city, appid: getApiKey(), units: "metric", lang: "pt_br" },
      });

      return {
        city: data.name,
        country: data.sys.country,
        temp: data.main.temp,
        feels_like: data.main.feels_like,
        temp_min: data.main.temp_min,
        temp_max: data.main.temp_max,
        humidity: data.main.humidity,
        description: data.weather[0].description,
        icon: data.weather[0].icon,
        wind_speed: toKmh(data.wind.speed),
      };
    });
  } catch (error) {
    throw toWeatherError(error, "Não foi possível buscar dados de clima");
  }
};

const getWeatherForecast = async (city, days = 5) => {
  const totalDays = Math.min(Math.max(days || 5, 1), 5);
  try {
    return await withCache(`forecast_${city.toLowerCase()}_${totalDays}`, async () => {
      const { data } = await axios.get(`${WEATHER_BASE}/forecast`, {
        params: { q: city, appid: getApiKey(), units: "metric", lang: "pt_br" },
      });

      const byDay = new Map();
      for (const item of data.list) {
        const local = new Date((item.dt + data.city.timezone) * 1000);
        const key = local.toISOString().slice(0, 10);
        if (!byDay.has(key)) byDay.set(key, []);
        byDay.get(key).push({ item, hour: local.getUTCHours() });
      }

      const forecast = [...byDay.entries()].slice(0, totalDays).map(([date, entries]) => {
        const { item: midday } = entries.reduce((best, cur) =>
          Math.abs(cur.hour - 12) < Math.abs(best.hour - 12) ? cur : best
        );
        const temps = entries.map(({ item }) => item.main.temp);
        return {
          date,
          temp_min: Math.min(...temps),
          temp_max: Math.max(...temps),
          description: midday.weather[0].description,
          icon: midday.weather[0].icon,
          humidity: midday.main.humidity,
          wind_speed: toKmh(midday.wind.speed),
          rain_chance: Math.round(Math.max(...entries.map(({ item }) => item.pop || 0)) * 100),
        };
      });

      return { city: data.city.name, country: data.city.country, forecast };
    });
  } catch (error) {
    throw toWeatherError(error, "Não foi possível buscar previsão de clima");
  }
};

module.exports = { getWeatherByCity, getWeatherForecast };
