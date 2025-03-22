require("dotenv").config();
const express = require("express");
const questionRoutes = require("./src/routes/questionRoutes");

const app = express();
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
