const notFoundHandler = (req, res) => {
  res.status(404).json({
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};

const errorHandler = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  if (error && error.name === "ValidationError") {
    return res.status(400).json({ message: error.message });
  }

  if (error && error.name === "CastError") {
    return res.status(400).json({ message: "Invalid resource identifier" });
  }

  return res.status(500).json({
    message: error?.message || "Unexpected server error",
  });
};

module.exports = {
  notFoundHandler,
  errorHandler,
};
