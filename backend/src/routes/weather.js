const router = require("express").Router();
const { getWeather, getForecast } = require("../controllers/weatherController");

router.get("/:city", getWeather);
router.get("/forecast/:city", getForecast);

module.exports = router;
