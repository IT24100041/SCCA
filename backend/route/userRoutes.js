const express = require("express");
const {
  registerUser,
  loginUser,
  getMe,
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
} = require("../controller/userController");
const { authenticate, authorize } = require("../middleware/auth");
const { validateRegistration, validateLogin } = require("../middleware/validate");

const router = express.Router();

router.post("/register", validateRegistration, registerUser);
router.post("/login", validateLogin, loginUser);

router.use(authenticate);

router.get("/me", getMe);

router.post("/", authorize("admin"), createUser);
router.get("/", authorize("admin", "manager"), getUsers);
router.get("/:id", authorize("admin", "manager"), getUserById);
router.put("/:id", authorize("admin"), updateUser);
router.delete("/:id", authorize("admin"), deleteUser);

module.exports = router;
