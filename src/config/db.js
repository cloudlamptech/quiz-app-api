const { Pool } = require("pg");

const pool = new Pool({
  user: "postgres",
  host: "postgresql",
  // host: "13.201.82.137",
  database: "postgres",
  password: "post123",
  port: 5432,
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
