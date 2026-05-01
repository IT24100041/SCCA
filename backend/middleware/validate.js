const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validateRegistration = (req, res, next) => {
  const { name, email, password, role } = req.body;

  if (!name || String(name).trim().length < 2) {
    return res.status(400).json({ message: "Name must be at least 2 characters" });
  }

  if (!email || !emailPattern.test(String(email).trim().toLowerCase())) {
    return res.status(400).json({ message: "A valid email is required" });
  }

  if (!password || String(password).length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters" });
  }

  if (role && !["admin", "manager", "staff"].includes(role)) {
    return res.status(400).json({ message: "Role must be admin, manager, or staff" });
  }

  return next();
};

const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  if (!emailPattern.test(String(email).trim().toLowerCase())) {
    return res.status(400).json({ message: "A valid email is required" });
  }

  return next();
};

module.exports = {
  validateRegistration,
  validateLogin,
};
