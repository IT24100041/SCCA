const Package = require("../model/Package");
const UserAccount = require("../model/UserAccount");
const Subscription = require("../model/Subscription");
const PerformanceMetric = require("../model/PerformanceMetric");

const { GoogleGenerativeAI } = require("@google/generative-ai");

const parseRecommendationJson = (rawText) => {
  const text = String(rawText || "").trim();
  if (!text) {
    throw new Error("Empty model response");
  }

  try {
    return JSON.parse(text);
  } catch (directError) {
    // Continue with fallback extraction.
  }

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) {
    return JSON.parse(fenced[1]);
  }

  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    return JSON.parse(text.slice(first, last + 1));
  }

  throw new Error("No JSON found in response");
};

const toBudgetNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
};

const createFallbackRecommendation = ({ packages, clientData, metrics }) => {
  const budget = toBudgetNumber(clientData?.budget);

  let selected = packages[0];
  if (budget !== null) {
    const withinBudget = packages.filter((pkg) => Number(pkg.price) <= budget);
    selected = withinBudget.length > 0 ? withinBudget[withinBudget.length - 1] : packages[0];
  }

  if (metrics && Number(metrics.leads) < 20 && packages.length > 1) {
    const index = packages.findIndex((pkg) => String(pkg._id) === String(selected._id));
    const nextIndex = Math.min(index + 1, packages.length - 1);
    selected = packages[nextIndex];
  }

  const alternatives = packages
    .filter((pkg) => String(pkg._id) !== String(selected._id))
    .slice(0, 2)
    .map((pkg) => pkg.name);

  return {
    recommendedPackage: selected.name,
    reasoning:
      "Generated with fallback logic because AI output was not valid JSON. Recommendation is based on budget and available package tiers.",
    alternativePackages: alternatives,
    expectedBenefit:
      "This package should balance cost and expected campaign growth while keeping options open for scale.",
  };
};

const getPackageRecommendation = async (req, res) => {
  try {
    const apiKey = String(process.env.GEMINI_API_KEY || "").trim();
    const geminiModel = String(process.env.GEMINI_MODEL || "gemini-2.5-flash").trim();

    if (!apiKey) {
      return res.status(500).json({ message: "GEMINI_API_KEY is missing in backend .env" });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const { clientName, clientData } = req.body;

    if (!clientName) {
      return res.status(400).json({ message: "Client name is required" });
    }

    // Fetch all packages for reference
    const packages = await Package.find().sort({ price: 1 });
    if (packages.length === 0) {
      return res.status(400).json({ message: "No packages available for recommendation" });
    }

    // Build context for AI
    const clientContext = {
      name: clientName,
      ...clientData,
    };

    // Fetch client's current subscription if exists
    let currentSubscription = null;
    try {
      currentSubscription = await Subscription.findOne({ clientName }).select("packageId status");
    } catch (e) {
      // Ignore if subscription not found
    }

    // Fetch performance metrics for this client
    let metrics = null;
    try {
      metrics = await PerformanceMetric.findOne({ campaignName: clientName }).sort({
        recordedAt: -1,
      });
    } catch (e) {
      // Ignore if metrics not found
    }

    // Create prompt for OpenAI
    const prompt = `
You are an AI package recommendation expert for a digital marketing agency. Analyze the following client information and recommend the best package.

Available Packages:
${packages
  .map(
    (p) => `
- ${p.name}: $${p.price}/month
  Description: ${p.description || "Professional digital marketing package"}
  Features: ${p.features?.join(", ") || "Standard features"}
`
  )
  .join("\n")}

Client Information:
- Name: ${clientContext.name}
- Company: ${clientContext.company || "Not specified"}
- Budget: ${clientContext.budget ? "$" + clientContext.budget : "Not specified"}
- Company Size: ${clientContext.size || "Not specified"}
- Current Subscription: ${currentSubscription?.packageId ? "Yes - " + currentSubscription.packageId : "None"}
- Current Status: ${currentSubscription?.status || "Not subscribed"}
- Performance Metrics: ${
      metrics
        ? `Impressions: ${metrics.impressions}, Engagement: ${metrics.engagement}, Leads: ${metrics.leads}`
        : "No data available"
    }

Based on this information, provide a JSON response with:
1. recommendedPackage: The best package name (Silver, Gold, Platinum, or Diamond)
2. reasoning: 2-3 sentences explaining why this package is recommended
3. alternativePackages: An array of 2 alternative packages to consider
4. expectedBenefit: A brief statement about expected benefits

Respond ONLY with valid JSON, no additional text.
`;

    // Call Gemini
    const model = genAI.getGenerativeModel({ model: geminiModel });
    const completion = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 500,
        responseMimeType: "application/json",
      },
    });

    // Parse response
    let recommendation = {};
    try {
      const responseText = completion.response.text();
      recommendation = parseRecommendationJson(responseText);
    } catch (parseError) {
      recommendation = createFallbackRecommendation({
        packages,
        clientData,
        metrics,
      });
    }

    // Validate recommendation
    if (!recommendation.recommendedPackage) {
      return res.status(500).json({ message: "AI recommendation is incomplete" });
    }

    // Get full package details
    const recommendedPackageName = String(recommendation.recommendedPackage || "")
      .toLowerCase()
      .trim();
    const recommendedPackageDoc = packages.find((p) => p.name.toLowerCase() === recommendedPackageName);

    if (!recommendedPackageDoc) {
      return res.status(500).json({ message: "Recommended package not found" });
    }

    return res.json({
      client: clientName,
      recommendation: {
        packageId: recommendedPackageDoc._id,
        packageName: recommendedPackageDoc.name,
        price: recommendedPackageDoc.price,
        description: recommendedPackageDoc.description,
        features: recommendedPackageDoc.features,
        reasoning: recommendation.reasoning,
        alternativePackages: recommendation.alternativePackages || [],
        expectedBenefit: recommendation.expectedBenefit,
      },
    });
  } catch (error) {
    console.error("Recommendation error:", error);
    return res.status(500).json({
      message: error.message || "Failed to generate recommendation",
    });
  }
};

module.exports = {
  getPackageRecommendation,
};
