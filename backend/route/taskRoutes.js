const express = require("express");
const {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
} = require("../controller/taskController");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

router.use(authenticate);

router.get("/", authorize("admin", "manager", "staff"), getTasks);
router.get("/:id", authorize("admin", "manager", "staff"), getTaskById);
router.post("/", authorize("admin", "manager", "staff"), createTask);
router.put("/:id", authorize("admin", "manager", "staff"), updateTask);
router.delete("/:id", authorize("admin", "manager"), deleteTask);

module.exports = router;
