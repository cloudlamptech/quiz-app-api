const { Pool } = require("pg");

const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "postgres",
  password: process.env.DB_PASSWORD || "postgres123",
  port: process.env.DB_PORT || 5433,
});

const noOfRetries = 5;
const retryDelay = 5000;

const connectDBWithRetry = async () => {
  for (let i = 0; i < noOfRetries; i++) {
    try {
      await pool.connect();
      console.log("Connected to PostgreSQL");
      return;
    } catch (error) {
      console.error(`Attempt ${i + 1} failed:`, error);
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }
  throw new Error("Failed to connect to PostgreSQL");
};

connectDBWithRetry();

module.exports = pool;
