const express = require("express");
const {
  createPayment,
  getPayments,
  getPaymentById,
  updatePayment,
  deletePayment,
} = require("../controller/paymentController");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

router.use(authenticate);

router.get("/", authorize("admin", "manager", "staff"), getPayments);
router.get("/:id", authorize("admin", "manager", "staff"), getPaymentById);
router.post("/", authorize("admin", "manager"), createPayment);
router.put("/:id", authorize("admin", "manager"), updatePayment);
router.delete("/:id", authorize("admin"), deletePayment);

module.exports = router;
