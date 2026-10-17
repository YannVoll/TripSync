const { getWeatherByCity, getWeatherForecast } = require('../services/weatherService');

const getWeather = async (req, res) => {
  try {
    const { city } = req.params;
    const weather = await getWeatherByCity(city);
    res.json(weather);
  } catch (e) {
    res.status(e.status || 400).json({ error: e.message });
  }
};

const getForecast = async (req, res) => {
  try {
    const { city } = req.params;
    const { days = 5 } = req.query;
    const forecast = await getWeatherForecast(city, parseInt(days));
    res.json(forecast);
  } catch (e) {
    res.status(e.status || 400).json({ error: e.message });
  }
};

module.exports = { getWeather, getForecast };
