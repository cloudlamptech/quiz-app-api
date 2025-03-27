const { Pool } = require("pg");

// Set up PostgreSQL connection pool
const pool = new Pool({
  host: process.env.PGHOST || "localhost",
  port: process.env.PGPORT || 5432,
  database: process.env.PGDATABASE || "postgres",
  user: process.env.PGUSER || "postgres",
  password: process.env.PGPASSWORD || "postgres",
});

// Test database connection
pool.on("connect", () => {
  console.log("Connected to PostgreSQL database");
});

pool.on("error", (err) => {
  console.error("PostgreSQL connection error:", err);
});

// const noOfRetries = 5;
// const retryDelay = 5000;

// const connectDBWithRetry = async () => {
//   for (let i = 0; i < noOfRetries; i++) {
//     try {
//       await pool.connect();
//       console.log("Connected to PostgreSQL");
//       return;
//     } catch (error) {
//       console.error(`Attempt ${i + 1} failed:`, error);
//       await new Promise((resolve) => setTimeout(resolve, retryDelay));
//     }
//   }
//   throw new Error("Failed to connect to PostgreSQL");
// };

// connectDBWithRetry();

module.exports = pool;
