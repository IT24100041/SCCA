const Subscription = require("../model/Subscription");

const createSubscription = async (req, res) => {
  try {
    const item = await Subscription.create(req.body);
    res.status(201).json(item);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getSubscriptions = async (req, res) => {
  try {
    const items = await Subscription.find()
      .populate("packageId", "name price")
      .sort({ createdAt: -1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getSubscriptionById = async (req, res) => {
  try {
    const item = await Subscription.findById(req.params.id).populate(
      "packageId",
      "name price"
    );
    if (!item) {
      return res.status(404).json({ message: "Subscription not found" });
    }
    res.json(item);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const updateSubscription = async (req, res) => {
  try {
    const item = await Subscription.findByIdAndUpdate(req.params.id, req.body, {
      returnDocument: "after",
      runValidators: true,
    });
    if (!item) {
      return res.status(404).json({ message: "Subscription not found" });
    }
    res.json(item);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteSubscription = async (req, res) => {
  try {
    const item = await Subscription.findByIdAndDelete(req.params.id);
    if (!item) {
      return res.status(404).json({ message: "Subscription not found" });
    }
    res.json({ message: "Subscription deleted" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  createSubscription,
  getSubscriptions,
  getSubscriptionById,
  updateSubscription,
  deleteSubscription,
};
