const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const propertyRoutes = require("./routes/properties");
const bookingRoutes = require("./routes/bookings");
const paymentRoutes = require("./routes/payments");
const reviewRoutes = require("./routes/reviews");
const tripRoutes = require("./routes/trips");
const recommendationRoutes = require("./routes/recommendations");
const notificationRoutes = require("./routes/notifications");
const weatherRoutes = require("./routes/weather");
const uploadRoutes = require("./routes/uploads");
const { UPLOAD_DIR } = require("./lib/uploads");

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173", credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use("/uploads", express.static(UPLOAD_DIR, { maxAge: "7d" }));

app.use("/api/auth", authRoutes);
app.use("/api/properties", propertyRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/weather", weatherRoutes);
app.use("/api/uploads", uploadRoutes);

app.get("/api/health", (req, res) => res.json({ status: "ok", service: "TripSync API" }));

app.use("/api", (req, res) => res.status(404).json({ error: "Rota não encontrada." }));

app.use((error, req, res, next) => {
  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ error: "JSON inválido." });
  }
  if (error.type === "entity.too.large") {
    return res.status(413).json({ error: "Requisição muito grande." });
  }
  console.error(error);
  res.status(500).json({ error: "Erro interno." });
});

module.exports = app;
