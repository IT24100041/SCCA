const express = require("express");
const {
  createPackage,
  getPackages,
  getPackageById,
  updatePackage,
  deletePackage,
} = require("../controller/packageController");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

router.use(authenticate);

router.get("/", authorize("admin", "manager", "staff"), getPackages);
router.get("/:id", authorize("admin", "manager", "staff"), getPackageById);
router.post("/", authorize("admin", "manager"), createPackage);
router.put("/:id", authorize("admin", "manager"), updatePackage);
router.delete("/:id", authorize("admin"), deletePackage);

module.exports = router;
