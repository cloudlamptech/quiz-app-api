require("dotenv").config();
const express = require("express");
const questionRoutes = require("./src/routes/questionRoutes");

const app = express();
console.log(process.env.PGHOST);
console.log(process.env.PGPORT);
console.log(process.env.PGDATABASE);
console.log(process.env.PGUSER);
console.log(process.env.PGPASSWORD);
console.log(process.env.PORT);
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Routes
app.get("/", (req, res) => {
  res.send("🚀 Welcome!");
});

// Question routes
app.use("/questions", questionRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
