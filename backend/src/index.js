require("dotenv").config();

if (!process.env.JWT_SECRET) {
  console.error("❌ JWT_SECRET não configurado no backend/.env");
  process.exit(1);
}

const app = require("./app");
const { startNotificationScheduler } = require("./services/notificationScheduler");

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ TripSync API rodando em http://localhost:${PORT}`);
  startNotificationScheduler();
});
