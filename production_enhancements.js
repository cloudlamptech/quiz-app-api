// Production Enhancements for Quiz App

// 1. Add Input Validation Middleware
const validateQuestionInput = (req, res, next) => {
  const {
    topic_id,
    subtopic_id,
    question_text,
    difficulty,
    answers,
    correct_answer_index,
  } = req.body;

  const errors = [];

  if (!topic_id) errors.push("topic_id is required");
  if (!subtopic_id) errors.push("subtopic_id is required");
  if (!question_text || question_text.trim().length < 5)
    errors.push("question_text must be at least 5 characters");
  if (!["easy", "medium", "hard"].includes(difficulty))
    errors.push("difficulty must be easy, medium, or hard");
  if (!Array.isArray(answers) || answers.length < 2)
    errors.push("at least 2 answers are required");
  if (correct_answer_index < 0 || correct_answer_index >= answers.length)
    errors.push("invalid correct_answer_index");

  if (errors.length > 0) {
    return res.status(400).json({
      error: "Validation failed",
      details: errors,
    });
  }

  next();
};

// 2. Add Rate Limiting Middleware
const rateLimit = require("express-rate-limit");

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 3. Add Caching Middleware
const cache = new Map();

const cacheMiddleware =
  (duration = 300) =>
  (req, res, next) => {
    const key = req.originalUrl;
    const cached = cache.get(key);

    if (cached && Date.now() - cached.timestamp < duration * 1000) {
      return res.json(cached.data);
    }

    const originalSend = res.json;
    res.json = function (data) {
      cache.set(key, {
        data,
        timestamp: Date.now(),
      });
      originalSend.call(this, data);
    };

    next();
  };

// 4. Add Error Handling Middleware
const errorHandler = (err, req, res, next) => {
  console.error("Error:", err);

  if (err.name === "ValidationError") {
    return res.status(400).json({
      error: "Validation Error",
      details: err.message,
    });
  }

  if (err.name === "DatabaseError") {
    return res.status(500).json({
      error: "Database Error",
      message: "An error occurred while processing your request",
    });
  }

  res.status(500).json({
    error: "Internal Server Error",
    message: "Something went wrong",
  });
};

// 5. Add Request Logging Middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(
      `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`
    );
  });

  next();
};

// 6. Add Database Connection Pool Configuration
const poolConfig = {
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  max: 20, // maximum number of clients in the pool
  idleTimeoutMillis: 30000, // close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // return an error after 2 seconds if connection could not be established
  maxUses: 7500, // close (and replace) a connection after it has been used 7500 times
};

// 7. Add Health Check Endpoint
const healthCheck = (req, res) => {
  pool.query("SELECT 1", (err, result) => {
    if (err) {
      return res.status(503).json({
        status: "unhealthy",
        database: "disconnected",
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      status: "healthy",
      database: "connected",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });
};

// 8. Add Metrics Collection
const metrics = {
  requests: 0,
  errors: 0,
  startTime: Date.now(),
};

const metricsMiddleware = (req, res, next) => {
  metrics.requests++;
  next();
};

const getMetrics = (req, res) => {
  const uptime = Date.now() - metrics.startTime;
  const requestsPerSecond = metrics.requests / (uptime / 1000);

  res.json({
    requests: metrics.requests,
    errors: metrics.errors,
    uptime: uptime,
    requestsPerSecond: requestsPerSecond.toFixed(2),
  });
};

module.exports = {
  validateQuestionInput,
  apiLimiter,
  cacheMiddleware,
  errorHandler,
  requestLogger,
  poolConfig,
  healthCheck,
  metricsMiddleware,
  getMetrics,
};
