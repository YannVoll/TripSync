const router = require("express").Router();
const auth = require("../middleware/auth");
const { getRecommendations } = require("../controllers/recommendationController");

router.get("/suggest", auth, getRecommendations);

module.exports = router;
