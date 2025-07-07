const pool = require("../config/db");

// Get all topics
exports.getAllTopics = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM topics ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get a single topic by ID
exports.getTopicById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT * FROM topics WHERE id = $1", [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Topic not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Create a new topic
exports.createTopic = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Topic name is required" });
    }

    const result = await pool.query(
      "INSERT INTO topics (name, description) VALUES ($1, $2) RETURNING *",
      [name, description]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Update a topic
exports.updateTopic = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Topic name is required" });
    }

    const result = await pool.query(
      "UPDATE topics SET name = $1, description = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *",
      [name, description, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Topic not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Delete a topic
exports.deleteTopic = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "DELETE FROM topics WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Topic not found" });
    }

    res.json({ message: "Topic deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};
