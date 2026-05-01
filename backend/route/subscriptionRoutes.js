const express = require("express");
const {
  createSubscription,
  getSubscriptions,
  getSubscriptionById,
  updateSubscription,
  deleteSubscription,
} = require("../controller/subscriptionController");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

router.use(authenticate);

router.get("/", authorize("admin", "manager", "staff"), getSubscriptions);
router.get("/:id", authorize("admin", "manager", "staff"), getSubscriptionById);
router.post("/", authorize("admin", "manager"), createSubscription);
router.put("/:id", authorize("admin", "manager"), updateSubscription);
router.delete("/:id", authorize("admin"), deleteSubscription);

module.exports = router;
