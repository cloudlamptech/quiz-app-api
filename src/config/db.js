const { Pool } = require("pg");

const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "postgres",
  database: process.env.DB_NAME || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  port: process.env.DB_PORT || 5433,
});

// Test database connection
pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error(
      "************************************* Database connection error:",
      err
    );
  } else {
    console.log(
      "################################# Connected to PostgreSQL:",
      res.rows
    );
  }
});

module.exports = pool;
