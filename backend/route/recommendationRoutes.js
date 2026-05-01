const express = require("express");
const { getPackageRecommendation } = require("../controller/recommendationController");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

// Protect all recommendation endpoints with authentication
router.use(authenticate);

router.get("/", (req, res) => {
	res.json({
		message: "Use POST /api/recommendations with { clientName, clientData }",
	});
});

// POST /api/recommendations
// Request body: { clientName: string, clientData: { company, budget, size, ... } }
router.post("/", getPackageRecommendation);

module.exports = router;
