const cannedReplies = [
  {
    keywords: ["hello", "hi", "hey"],
    reply: "Hello. I can help with package, subscription, task, and payment questions.",
  },
  {
    keywords: ["package", "plan", "pricing"],
    reply: "You can review and assign Silver, Gold, Platinum, and Diamond packages from the Packages section.",
  },
  {
    keywords: ["task", "deadline", "kanban"],
    reply: "Tasks can be created, assigned, and tracked by status in table or kanban view.",
  },
  {
    keywords: ["payment", "invoice", "revenue"],
    reply: "Payments are tracked with amount, method, status, and monthly revenue summaries.",
  },
  {
    keywords: ["report", "metric", "performance"],
    reply: "Performance metrics support filtering by campaign, month, and year with CSV export.",
  },
];

const sendMessage = async (req, res) => {
  const message = String(req.body.message || "").trim();

  if (!message) {
    return res.status(400).json({ message: "Message is required" });
  }

  const lower = message.toLowerCase();

  const matched = cannedReplies.find((item) =>
    item.keywords.some((keyword) => lower.includes(keyword))
  );

  const fallback =
    "I am a basic assistant. Try asking about packages, tasks, payments, subscriptions, or performance reports.";

  return res.json({
    reply: matched ? matched.reply : fallback,
    askedBy: req.user?.name || "User",
    timestamp: new Date().toISOString(),
  });
};

module.exports = {
  sendMessage,
};
