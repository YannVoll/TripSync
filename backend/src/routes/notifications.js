const router = require("express").Router();
const auth = require("../middleware/auth");
const {
  scheduleNotification,
  getMyNotifications,
  sendTestNotification,
} = require("../controllers/notificationController");

router.post("/schedule", auth, scheduleNotification);
router.post("/test", auth, sendTestNotification);
router.get("/my", auth, getMyNotifications);

module.exports = router;
