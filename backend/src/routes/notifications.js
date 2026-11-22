const router = require("express").Router();
const auth = require("../middleware/auth");
const {
  scheduleNotification,
  getMyNotifications,
  sendTestNotification,
  deleteNotification,
} = require("../controllers/notificationController");

router.post("/schedule", auth, scheduleNotification);
router.post("/test", auth, sendTestNotification);
router.get("/my", auth, getMyNotifications);
router.delete("/:id", auth, deleteNotification);

module.exports = router;
