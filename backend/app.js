const express = require("express");
const cors = require("cors");

const userRoutes = require("./route/userRoutes");
const packageRoutes = require("./route/packageRoutes");
const subscriptionRoutes = require("./route/subscriptionRoutes");
const taskRoutes = require("./route/taskRoutes");
const paymentRoutes = require("./route/paymentRoutes");
const metricRoutes = require("./route/metricRoutes");
const recommendationRoutes = require("./route/recommendationRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "SPARKLENZ API is running" });
});

app.use("/api/users", userRoutes);
app.use("/api/packages", packageRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/metrics", metricRoutes);
app.use("/api/recommendations", recommendationRoutes);

module.exports = app;
