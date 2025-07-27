const pool = require("../config/db");

// Get all questions
const getAllQuestions = async (req, res) => {
  try {
    // const result = await pool.query(`
    //   SELECT q.*, t.topic_name, s.subtopic_name, cs.child_subtopic_name, a.answer_text as correct_answer
    //   FROM questions q
    //   JOIN topics t ON q.topic_id = t.topic_id
    //   JOIN subtopics s ON q.subtopic_id = s.subtopic_id
    //   JOIN child_subtopics cs ON q.child_subtopic_id = cs.child_subtopic_id
    //   JOIN answers a ON q.correct_answer_id = a.answer_id
    //   ORDER BY q.created_at DESC;
    // `);
    // const client = await pool.connect();
    const result = await pool.query(`
      SELECT *
      FROM users;
    `);
    res.json(result.rows);
  } catch (error) {
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

// Get questions by subtopic ID
const getQuestionsBySubtopicId = async (req, res) => {
  try {
    const { subtopicId } = req.params;
    const result = await pool.query(
      `SELECT q.*, t.topic_name, s.subtopic_name, cs.child_subtopic_name, a.answer_text as correct_answer
       FROM questions q
       JOIN topics t ON q.topic_id = t.topic_id
       JOIN subtopics s ON q.subtopic_id = s.subtopic_id
       JOIN child_subtopics cs ON q.child_subtopic_id = cs.child_subtopic_id
       JOIN answers a ON q.correct_answer_id = a.answer_id
       WHERE q.subtopic_id = $1
       ORDER BY q.created_at DESC`,
      [subtopicId]
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "No questions found for this subtopic" });
    }
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching questions by subtopic:", error);
    res.status(500).json({ error: "Error fetching questions by subtopic" });
  }
};

// Get questions by topic ID
const getQuestionsByTopicId = async (req, res) => {
  try {
    const { topicId } = req.params;
    const result = await pool.query(
      `SELECT q.*, t.topic_name, s.subtopic_name, cs.child_subtopic_name, a.answer_text as correct_answer
       FROM questions q
       JOIN topics t ON q.topic_id = t.topic_id
       JOIN subtopics s ON q.subtopic_id = s.subtopic_id
       JOIN child_subtopics cs ON q.child_subtopic_id = cs.child_subtopic_id
       JOIN answers a ON q.correct_answer_id = a.answer_id
       WHERE q.topic_id = $1
       ORDER BY q.created_at DESC`,
      [topicId]
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "No questions found for this topic" });
    }
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching questions by topic:", error);
    res.status(500).json({ error: "Error fetching questions by topic" });
  }
};

// Get questions by topic ID and subtopic ID
const getQuestionsByTopicSubtopicIds = async (req, res) => {
  try {
    const { topicId, subtopicId } = req.params;
    const result = await pool.query(
      `SELECT q.*, t.topic_name, s.subtopic_name, cs.child_subtopic_name, a.answer_text as correct_answer
       FROM questions q
       JOIN topics t ON q.topic_id = t.topic_id
       JOIN subtopics s ON q.subtopic_id = s.subtopic_id
       JOIN child_subtopics cs ON q.child_subtopic_id = cs.child_subtopic_id
       JOIN answers a ON q.correct_answer_id = a.answer_id
       WHERE q.topic_id = $1 AND q.subtopic_id = $2
       ORDER BY q.created_at DESC`,
      [topicId, subtopicId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "No questions found for this topic and subtopic combination",
      });
    }
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching questions by topic and subtopic:", error);
    res
      .status(500)
      .json({ error: "Error fetching questions by topic and subtopic" });
  }
};

module.exports = {
  getAllQuestions,
  getQuestionById,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  getQuestionsBySubtopicId,
  getQuestionsByTopicId,
  getQuestionsByTopicSubtopicIds,
};
