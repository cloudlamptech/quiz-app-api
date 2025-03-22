const pool = require("../config/db");

// Get all questions
const getAllQuestions = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT q.*, t.topic_name, s.subtopic_name, cs.child_subtopic_name, a.answer_text as correct_answer
      FROM questions q
      JOIN topics t ON q.topic_id = t.topic_id
      JOIN subtopics s ON q.subtopic_id = s.subtopic_id
      JOIN child_subtopics cs ON q.child_subtopic_id = cs.child_subtopic_id
      JOIN answers a ON q.correct_answer_id = a.answer_id
      ORDER BY q.created_at DESC;
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching questions:", error);
    res.status(500).json({ error: "Error fetching questions" });
  }
};

// Get question by ID
const getQuestionById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `
      SELECT q.*, t.topic_name, s.subtopic_name, cs.child_subtopic_name, a.answer_text as correct_answer
      FROM questions q
      JOIN topics t ON q.topic_id = t.topic_id
      JOIN subtopics s ON q.subtopic_id = s.subtopic_id
      JOIN child_subtopics cs ON q.child_subtopic_id = cs.child_subtopic_id
      JOIN answers a ON q.correct_answer_id = a.answer_id
      WHERE q.question_id = $1;
    `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Question not found" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching question:", error);
    res.status(500).json({ error: "Error fetching question" });
  }
};

// Create new question
const createQuestion = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const {
      topic_id,
      subtopic_id,
      child_subtopic_id,
      question_text,
      difficulty,
      answers,
      correct_answer_index,
    } = req.body;

    // Validate difficulty
    if (!["easy", "medium", "hard"].includes(difficulty)) {
      throw new Error("Invalid difficulty level");
    }

    // Insert answers first
    const answerIds = [];
    for (const answerText of answers) {
      const answerResult = await client.query(
        "INSERT INTO answers (answer_text) VALUES ($1) RETURNING answer_id",
        [answerText]
      );
      answerIds.push(answerResult.rows[0].answer_id);
    }

    // Insert question
    const questionResult = await client.query(
      `INSERT INTO questions (
        topic_id, subtopic_id, child_subtopic_id, 
        question_text, difficulty, correct_answer_id
      ) VALUES ($1, $2, $3, $4, $5, $6) 
      RETURNING *`,
      [
        topic_id,
        subtopic_id,
        child_subtopic_id,
        question_text,
        difficulty,
        answerIds[correct_answer_index],
      ]
    );

    await client.query("COMMIT");

    res.status(201).json({
      message: "Question created successfully",
      question: questionResult.rows[0],
      answers: answerIds,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error creating question:", error);
    res.status(500).json({ error: "Error creating question" });
  } finally {
    client.release();
  }
};

// Update question
const updateQuestion = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { id } = req.params;
    const {
      topic_id,
      subtopic_id,
      child_subtopic_id,
      question_text,
      difficulty,
      answers,
      correct_answer_index,
    } = req.body;

    // Validate difficulty
    if (!["easy", "medium", "hard"].includes(difficulty)) {
      throw new Error("Invalid difficulty level");
    }

    // Delete existing answers
    await client.query("DELETE FROM answers WHERE question_id = $1", [id]);

    // Insert new answers
    const answerIds = [];
    for (const answerText of answers) {
      const answerResult = await client.query(
        "INSERT INTO answers (answer_text) VALUES ($1) RETURNING answer_id",
        [answerText]
      );
      answerIds.push(answerResult.rows[0].answer_id);
    }

    // Update question
    const result = await client.query(
      `UPDATE questions 
      SET topic_id = $1, subtopic_id = $2, child_subtopic_id = $3,
          question_text = $4, difficulty = $5, correct_answer_id = $6
      WHERE question_id = $7
      RETURNING *`,
      [
        topic_id,
        subtopic_id,
        child_subtopic_id,
        question_text,
        difficulty,
        answerIds[correct_answer_index],
        id,
      ]
    );

    if (result.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Question not found" });
    }

    await client.query("COMMIT");
    res.json({
      message: "Question updated successfully",
      question: result.rows[0],
      answers: answerIds,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error updating question:", error);
    res.status(500).json({ error: "Error updating question" });
  } finally {
    client.release();
  }
};

// Delete question
const deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "DELETE FROM questions WHERE question_id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Question not found" });
    }
    res.json({ message: "Question deleted successfully" });
  } catch (error) {
    console.error("Error deleting question:", error);
    res.status(500).json({ error: "Error deleting question" });
  }
};

module.exports = {
  getAllQuestions,
  getQuestionById,
  createQuestion,
  updateQuestion,
  deleteQuestion,
};
