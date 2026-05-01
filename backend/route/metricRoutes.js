const express = require("express");
const {
  createMetric,
  getMetrics,
  getMetricById,
  updateMetric,
  deleteMetric,
} = require("../controller/metricController");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

router.use(authenticate);

router.get("/", authorize("admin", "manager", "staff"), getMetrics);
router.get("/:id", authorize("admin", "manager", "staff"), getMetricById);
router.post("/", authorize("admin", "manager"), createMetric);
router.put("/:id", authorize("admin", "manager"), updateMetric);
router.delete("/:id", authorize("admin"), deleteMetric);

module.exports = router;
