const Package = require("../model/Package");

const createPackage = async (req, res) => {
  try {
    const item = await Package.create(req.body);
    res.status(201).json(item);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getPackages = async (req, res) => {
  try {
    const items = await Package.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getPackageById = async (req, res) => {
  try {
    const item = await Package.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: "Package not found" });
    }
    res.json(item);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const updatePackage = async (req, res) => {
  try {
    const item = await Package.findByIdAndUpdate(req.params.id, req.body, {
      returnDocument: "after",
      runValidators: true,
    });
    if (!item) {
      return res.status(404).json({ message: "Package not found" });
    }
    res.json(item);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deletePackage = async (req, res) => {
  try {
    const item = await Package.findByIdAndDelete(req.params.id);
    if (!item) {
      return res.status(404).json({ message: "Package not found" });
    }
    res.json({ message: "Package deleted" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  createPackage,
  getPackages,
  getPackageById,
  updatePackage,
  deletePackage,
};
