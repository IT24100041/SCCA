const UserAccount = require("../model/UserAccount");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const signToken = (user) => {
  return jwt.sign(
    {
      id: user._id.toString(),
      role: user.role,
    },
    process.env.JWT_SECRET || "sparklenz-dev-secret",
    { expiresIn: "7d" }
  );
};

const sanitizeUser = (user) => {
  const payload = user.toObject ? user.toObject() : user;
  delete payload.password;
  return payload;
};

const registerUser = async (req, res) => {
  try {
    const { name, email, password, role, isActive } = req.body;

    const normalizedEmail = String(email || "").trim().toLowerCase();
    const existing = await UserAccount.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: "Email already in use" });
    }

    const user = await UserAccount.create({
      name: String(name || "").trim(),
      email: normalizedEmail,
      password: String(password),
      role: role || "staff",
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    });

    const token = signToken(user);

    return res.status(201).json({
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const loginUser = async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    const user = await UserAccount.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "Account is inactive" });
    }

    const token = signToken(user);

    return res.json({
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await UserAccount.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.json(user);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const createUser = async (req, res) => {
  try {
    const payload = {
      ...req.body,
      email: String(req.body.email || "").trim().toLowerCase(),
    };
    const existing = await UserAccount.findOne({ email: payload.email });
    if (existing) {
      return res.status(409).json({ message: "Email already in use" });
    }
    const user = await UserAccount.create(payload);
    return res.status(201).json(sanitizeUser(user));
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const getUsers = async (req, res) => {
  try {
    const users = await UserAccount.find().select("-password").sort({ createdAt: -1 });
    return res.json(users);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await UserAccount.findById(req.params.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.json(user);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const payload = { ...req.body };

    if (payload.email) {
      payload.email = String(payload.email).trim().toLowerCase();
      const existing = await UserAccount.findOne({
        email: payload.email,
        _id: { $ne: req.params.id },
      });

      if (existing) {
        return res.status(409).json({ message: "Email already in use" });
      }
    }

    if (payload.password) {
      payload.password = await bcrypt.hash(String(payload.password), 10);
    }

    const user = await UserAccount.findByIdAndUpdate(req.params.id, payload, {
      returnDocument: "after",
      runValidators: true,
    }).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.json(user);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const user = await UserAccount.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.json({ message: "User deleted" });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
};
