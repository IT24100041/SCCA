const PaymentRecord = require("../model/PaymentRecord");

const createPayment = async (req, res) => {
  try {
    const item = await PaymentRecord.create(req.body);
    res.status(201).json(item);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getPayments = async (req, res) => {
  try {
    const items = await PaymentRecord.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getPaymentById = async (req, res) => {
  try {
    const item = await PaymentRecord.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: "Payment record not found" });
    }
    res.json(item);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const updatePayment = async (req, res) => {
  try {
    const item = await PaymentRecord.findByIdAndUpdate(req.params.id, req.body, {
      returnDocument: "after",
      runValidators: true,
    });
    if (!item) {
      return res.status(404).json({ message: "Payment record not found" });
    }
    res.json(item);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deletePayment = async (req, res) => {
  try {
    const item = await PaymentRecord.findByIdAndDelete(req.params.id);
    if (!item) {
      return res.status(404).json({ message: "Payment record not found" });
    }
    res.json({ message: "Payment record deleted" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  createPayment,
  getPayments,
  getPaymentById,
  updatePayment,
  deletePayment,
};
