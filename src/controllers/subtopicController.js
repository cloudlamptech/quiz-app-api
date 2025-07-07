const pool = require("../config/db");

// Get all subtopics
exports.getAllSubtopics = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM subtopics ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get subtopics by topic ID
exports.getSubtopicsByTopicId = async (req, res) => {
  try {
    const { topicId } = req.params;
    const result = await pool.query(
      "SELECT * FROM subtopics WHERE topic_id = $1 ORDER BY created_at DESC",
      [topicId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get a single subtopic by ID
exports.getSubtopicById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT * FROM subtopics WHERE id = $1", [
      id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Subtopic not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Create a new subtopic
exports.createSubtopic = async (req, res) => {
  try {
    const { name, description, topic_id } = req.body;

    if (!name || !topic_id) {
      return res
        .status(400)
        .json({ error: "Subtopic name and topic_id are required" });
    }

    // Check if topic exists
    const topicExists = await pool.query(
      "SELECT id FROM topics WHERE id = $1",
      [topic_id]
    );
    if (topicExists.rows.length === 0) {
      return res.status(404).json({ error: "Topic not found" });
    }

    const result = await pool.query(
      "INSERT INTO subtopics (name, description, topic_id) VALUES ($1, $2, $3) RETURNING *",
      [name, description, topic_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Update a subtopic
exports.updateSubtopic = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, topic_id } = req.body;

    if (!name || !topic_id) {
      return res
        .status(400)
        .json({ error: "Subtopic name and topic_id are required" });
    }

    // Check if topic exists
    const topicExists = await pool.query(
      "SELECT id FROM topics WHERE id = $1",
      [topic_id]
    );
    if (topicExists.rows.length === 0) {
      return res.status(404).json({ error: "Topic not found" });
    }

    const result = await pool.query(
      "UPDATE subtopics SET name = $1, description = $2, topic_id = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *",
      [name, description, topic_id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Subtopic not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Delete a subtopic
exports.deleteSubtopic = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "DELETE FROM subtopics WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Subtopic not found" });
    }

    res.json({ message: "Subtopic deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};
