const PerformanceMetric = require("../model/PerformanceMetric");

const createMetric = async (req, res) => {
  try {
    const item = await PerformanceMetric.create(req.body);
    res.status(201).json(item);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getMetrics = async (req, res) => {
  try {
    const items = await PerformanceMetric.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMetricById = async (req, res) => {
  try {
    const item = await PerformanceMetric.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: "Metric not found" });
    }
    res.json(item);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const updateMetric = async (req, res) => {
  try {
    const item = await PerformanceMetric.findByIdAndUpdate(req.params.id, req.body, {
      returnDocument: "after",
      runValidators: true,
    });
    if (!item) {
      return res.status(404).json({ message: "Metric not found" });
    }
    res.json(item);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteMetric = async (req, res) => {
  try {
    const item = await PerformanceMetric.findByIdAndDelete(req.params.id);
    if (!item) {
      return res.status(404).json({ message: "Metric not found" });
    }
    res.json({ message: "Metric deleted" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  createMetric,
  getMetrics,
  getMetricById,
  updateMetric,
  deleteMetric,
};
