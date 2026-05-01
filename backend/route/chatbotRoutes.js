const express = require("express");
const { sendMessage } = require("../controller/chatbotController");

const router = express.Router();

router.post("/message", sendMessage);

module.exports = router;
