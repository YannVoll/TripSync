require("dotenv").config();
const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const propertyRoutes = require("./routes/properties");
const bookingRoutes = require("./routes/bookings");
const paymentRoutes = require("./routes/payments");
const reviewRoutes = require("./routes/reviews");
const tripRoutes = require("./routes/trips");

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173", credentials: true }));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/properties", propertyRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/trips", tripRoutes);

app.get("/api/health", (req, res) => res.json({ status: "ok", service: "TripSync API" }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ TripSync API rodando em http://localhost:${PORT}`);
});
