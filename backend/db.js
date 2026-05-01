const mongoose = require("mongoose");
const dns = require("dns");

const connectDB = async () => {
  const usePublicDNS = (process.env.MONGO_USE_PUBLIC_DNS || "true").toLowerCase() === "true";

  if (usePublicDNS) {
    dns.setServers(["8.8.8.8", "1.1.1.1"]);
  }

  try {
    await mongoose.connect(process.env.MONGO_URL, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log("MongoDB connected");
  } catch (error) {
    if (error?.message?.includes("whitelist") || error?.message?.includes("IP")) {
      error.message =
        `${error.message} | Atlas Network Access likely needs your current IP.`;
    }

    throw error;
  }
};

module.exports = connectDB;
