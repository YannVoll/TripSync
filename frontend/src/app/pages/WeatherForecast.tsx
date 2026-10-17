import { useEffect, useState } from "react";
import { CloudOff, Droplets, LoaderCircle, Thermometer, Umbrella, Wind } from "lucide-react";
import axios from "axios";
import api from "../../lib/axios";

interface WeatherData {
  city: string;
  country: string;
  temp: number;
  feels_like: number;
  temp_min: number;
  temp_max: number;
  humidity: number;
  description: string;
  icon: string;
  wind_speed: number;
}

interface ForecastDay {
  date: string;
  temp_min: number;
  temp_max: number;
  description: string;
  icon: string;
  humidity: number;
  wind_speed: number;
  rain_chance: number;
}

interface ForecastData {
  city: string;
  forecast: ForecastDay[];
}

interface Props {
  city: string;
}

const iconUrl = (icon: string, size: "2x" | "4x" = "2x") =>
  `https://openweathermap.org/img/wn/${icon}@${size}.png`;

function formatDay(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

export default function WeatherForecast({ city }: Props) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const encoded = encodeURIComponent(city);

    setLoading(true);
    setError(null);
    Promise.all([
      api.get<WeatherData>(`/weather/${encoded}`),
      api.get<ForecastData>(`/weather/forecast/${encoded}`, { params: { days: 5 } }),
    ])
      .then(([weatherRes, forecastRes]) => {
        if (cancelled) return;
        setWeather(weatherRes.data);
        setForecast(forecastRes.data);
      })
      .catch((err) => {
        if (cancelled) return;
        setWeather(null);
        setForecast(null);
        setError(
          axios.isAxiosError<{ error?: string }>(err)
            ? err.response?.data?.error ?? "Erro ao carregar clima"
            : "Erro ao carregar clima"
        );
      })
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [city]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-gray-100 bg-white p-10 text-sm text-gray-500 shadow-sm">
        <LoaderCircle className="h-5 w-5 animate-spin text-blue-600" />
        Carregando clima de {city}...
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-gray-100 bg-white p-10 text-center shadow-sm">
        <CloudOff className="h-8 w-8 text-gray-300" />
        <p className="font-medium text-gray-900">Não foi possível carregar o clima de {city}</p>
        <p className="text-sm text-gray-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-gray-100 bg-gradient-to-br from-sky-50 to-blue-50 p-5 shadow-sm sm:p-6">
        <p className="text-sm font-medium text-blue-700">
          Agora em {weather.city}, {weather.country}
        </p>
        <div className="mt-2 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <img src={iconUrl(weather.icon, "4x")} alt="" className="-my-3 h-20 w-20" />
            <div>
              <p className="text-5xl font-bold tracking-tight text-gray-900">
                {Math.round(weather.temp)}°
              </p>
              <p className="capitalize text-gray-600">{weather.description}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:min-w-80">
            <div className="rounded-xl bg-white/80 p-3">
              <Thermometer className="h-4 w-4 text-orange-500" />
              <p className="mt-1 text-sm font-semibold text-gray-900">
                {Math.round(weather.feels_like)}°
              </p>
              <p className="text-xs text-gray-500">sensação</p>
            </div>
            <div className="rounded-xl bg-white/80 p-3">
              <Droplets className="h-4 w-4 text-blue-500" />
              <p className="mt-1 text-sm font-semibold text-gray-900">{weather.humidity}%</p>
              <p className="text-xs text-gray-500">umidade</p>
            </div>
            <div className="rounded-xl bg-white/80 p-3">
              <Wind className="h-4 w-4 text-teal-500" />
              <p className="mt-1 text-sm font-semibold text-gray-900">{weather.wind_speed} km/h</p>
              <p className="text-xs text-gray-500">vento</p>
            </div>
          </div>
        </div>
      </div>

      {forecast && forecast.forecast.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
          <h3 className="font-semibold text-gray-900">Próximos dias</h3>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {forecast.forecast.map((day) => (
              <div
                key={day.date}
                className="flex flex-col items-center rounded-xl border border-gray-100 p-3 text-center"
              >
                <p className="text-sm font-semibold capitalize text-gray-900">
                  {formatDay(day.date)}
                </p>
                <img src={iconUrl(day.icon)} alt="" className="h-14 w-14" />
                <p className="text-sm">
                  <span className="font-semibold text-gray-900">{Math.round(day.temp_max)}°</span>{" "}
                  <span className="text-gray-400">{Math.round(day.temp_min)}°</span>
                </p>
                <p className="mt-1 text-xs capitalize text-gray-500">{day.description}</p>
                <p className="mt-2 flex items-center gap-1 text-xs text-blue-600">
                  <Umbrella className="h-3.5 w-3.5" />
                  {day.rain_chance}%
                </p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-gray-400">
            A previsão cobre só os próximos 5 dias — confira de novo perto da viagem.
          </p>
        </div>
      )}
    </div>
  );
}
