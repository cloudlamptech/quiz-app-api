const pool = require("../config/db");

// Get all questions
const getAllQuestions = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        q.*,
        t.topic_name,
        s.subtopic_name,
        cs.child_subtopic_name,
        json_agg(
          json_build_object(
            'answer_id', a.answer_id,
            'answer_text', a.answer_text,
            'is_correct', qa.is_correct,
            'answer_order', qa.answer_order
          ) ORDER BY qa.answer_order
        ) as answers
      FROM questions q
      JOIN topics t ON q.topic_id = t.topic_id
      JOIN subtopics s ON q.subtopic_id = s.subtopic_id
      LEFT JOIN child_subtopics cs ON q.child_subtopic_id = cs.child_subtopic_id
      LEFT JOIN question_answers qa ON q.question_id = qa.question_id
      LEFT JOIN answers a ON qa.answer_id = a.answer_id
      GROUP BY q.question_id, t.topic_name, s.subtopic_name, cs.child_subtopic_name
      ORDER BY q.created_at DESC
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
      `SELECT 
        q.*,
        t.topic_name,
        s.subtopic_name,
        cs.child_subtopic_name,
        json_agg(
          json_build_object(
            'answer_id', a.answer_id,
            'answer_text', a.answer_text,
            'is_correct', qa.is_correct,
            'answer_order', qa.answer_order
          ) ORDER BY qa.answer_order
        ) as answers
      FROM questions q
      JOIN topics t ON q.topic_id = t.topic_id
      JOIN subtopics s ON q.subtopic_id = s.subtopic_id
      LEFT JOIN child_subtopics cs ON q.child_subtopic_id = cs.child_subtopic_id
      LEFT JOIN question_answers qa ON q.question_id = qa.question_id
      LEFT JOIN answers a ON qa.answer_id = a.answer_id
      WHERE q.question_id = $1
      GROUP BY q.question_id, t.topic_name, s.subtopic_name, cs.child_subtopic_name`,
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
      child_subtopic_id = null,
      question_text,
      difficulty,
      answers,
      correct_answer_index,
    } = req.body;

    // Validate difficulty
    if (!["easy", "medium", "hard"].includes(difficulty)) {
      throw new Error("Invalid difficulty level");
    }

    // Validate topic exists
    const topicExists = await client.query(
      "SELECT id FROM topics WHERE id = $1",
      [topic_id]
    );
    if (topicExists.rows.length === 0) {
      throw new Error("Topic not found");
    }

    // Validate subtopic exists and belongs to the topic
    const subtopicExists = await client.query(
      "SELECT id FROM subtopics WHERE id = $1 AND topic_id = $2",
      [subtopic_id, topic_id]
    );
    if (subtopicExists.rows.length === 0) {
      throw new Error(
        "Subtopic not found or does not belong to the specified topic"
      );
    }

    // Validate child_subtopic exists and belongs to the subtopic (if provided)
    if (child_subtopic_id) {
      const childSubtopicExists = await client.query(
        "SELECT id FROM child_subtopics WHERE id = $1 AND subtopic_id = $2",
        [child_subtopic_id, subtopic_id]
      );
      if (childSubtopicExists.rows.length === 0) {
        throw new Error(
          "Child subtopic not found or does not belong to the specified subtopic"
        );
      }
    }

    // Step 1: Insert question first
    const questionResult = await client.query(
      `INSERT INTO questions (
        topic_id, subtopic_id, child_subtopic_id, 
        question_text, difficulty
      ) VALUES ($1, $2, $3, $4, $5) 
      RETURNING *`,
      [topic_id, subtopic_id, child_subtopic_id, question_text, difficulty]
    );

    const questionId = questionResult.rows[0].question_id;

    // Step 2: Insert answers
    const answerIds = [];
    for (const answerText of answers) {
      const answerResult = await client.query(
        "INSERT INTO answers (answer_text) VALUES ($1) RETURNING answer_id",
        [answerText]
      );
      answerIds.push(answerResult.rows[0].answer_id);
    }

    // Step 3: Create question-answer relationships in junction table
    for (let i = 0; i < answerIds.length; i++) {
      const isCorrect = i === correct_answer_index;
      await client.query(
        `INSERT INTO question_answers (question_id, answer_id, is_correct, answer_order) 
         VALUES ($1, $2, $3, $4)`,
        [questionId, answerIds[i], isCorrect, i + 1]
      );
    }

    await client.query("COMMIT");

    // Get the complete question with answers
    const completeQuestionResult = await client.query(
      `SELECT 
        q.*,
        json_agg(
          json_build_object(
            'answer_id', a.answer_id,
            'answer_text', a.answer_text,
            'is_correct', qa.is_correct,
            'answer_order', qa.answer_order
          ) ORDER BY qa.answer_order
        ) as answers
      FROM questions q
      LEFT JOIN question_answers qa ON q.question_id = qa.question_id
      LEFT JOIN answers a ON qa.answer_id = a.answer_id
      WHERE q.question_id = $1
      GROUP BY q.question_id`,
      [questionId]
    );

    res.status(201).json({
      message: "Question created successfully",
      question: completeQuestionResult.rows[0],
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
      child_subtopic_id = null,
      question_text,
      difficulty,
      answers,
      correct_answer_index,
    } = req.body;

    // Validate difficulty
    if (!["easy", "medium", "hard"].includes(difficulty)) {
      throw new Error("Invalid difficulty level");
    }

    // Validate topic exists
    const topicExists = await client.query(
      "SELECT id FROM topics WHERE id = $1",
      [topic_id]
    );
    if (topicExists.rows.length === 0) {
      throw new Error("Topic not found");
    }

    // Validate subtopic exists and belongs to the topic
    const subtopicExists = await client.query(
      "SELECT id FROM subtopics WHERE id = $1 AND topic_id = $2",
      [subtopic_id, topic_id]
    );
    if (subtopicExists.rows.length === 0) {
      throw new Error(
        "Subtopic not found or does not belong to the specified topic"
      );
    }

    // Validate child_subtopic exists and belongs to the subtopic (if provided)
    if (child_subtopic_id) {
      const childSubtopicExists = await client.query(
        "SELECT id FROM child_subtopics WHERE id = $1 AND subtopic_id = $2",
        [child_subtopic_id, subtopic_id]
      );
      if (childSubtopicExists.rows.length === 0) {
        throw new Error(
          "Child subtopic not found or does not belong to the specified subtopic"
        );
      }
    }

    // Check if question exists
    const questionExists = await client.query(
      "SELECT question_id FROM questions WHERE question_id = $1",
      [id]
    );
    if (questionExists.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Question not found" });
    }

    // Delete existing question-answer relationships
    await client.query("DELETE FROM question_answers WHERE question_id = $1", [
      id,
    ]);

    // Get existing answers for this question to delete them
    const existingAnswers = await client.query(
      "SELECT answer_id FROM question_answers WHERE question_id = $1",
      [id]
    );

    // Delete existing answers
    for (const answer of existingAnswers.rows) {
      await client.query("DELETE FROM answers WHERE answer_id = $1", [
        answer.answer_id,
      ]);
    }

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
          question_text = $4, difficulty = $5
      WHERE question_id = $6
      RETURNING *`,
      [topic_id, subtopic_id, child_subtopic_id, question_text, difficulty, id]
    );

    // Create new question-answer relationships
    for (let i = 0; i < answerIds.length; i++) {
      const isCorrect = i === correct_answer_index;
      await client.query(
        `INSERT INTO question_answers (question_id, answer_id, is_correct, answer_order) 
         VALUES ($1, $2, $3, $4)`,
        [id, answerIds[i], isCorrect, i + 1]
      );
    }

    // Get the complete updated question with answers
    const completeQuestionResult = await client.query(
      `SELECT 
        q.*,
        json_agg(
          json_build_object(
            'answer_id', a.answer_id,
            'answer_text', a.answer_text,
            'is_correct', qa.is_correct,
            'answer_order', qa.answer_order
          ) ORDER BY qa.answer_order
        ) as answers
      FROM questions q
      LEFT JOIN question_answers qa ON q.question_id = qa.question_id
      LEFT JOIN answers a ON qa.answer_id = a.answer_id
      WHERE q.question_id = $1
      GROUP BY q.question_id`,
      [id]
    );

    await client.query("COMMIT");
    res.json({
      message: "Question updated successfully",
      question: completeQuestionResult.rows[0],
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
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { id } = req.params;

    // Check if question exists
    const questionExists = await client.query(
      "SELECT question_id FROM questions WHERE question_id = $1",
      [id]
    );
    if (questionExists.rows.length === 0) {
      return res.status(404).json({ error: "Question not found" });
    }

    // Get answer IDs for this question
    const answerIds = await client.query(
      "SELECT answer_id FROM question_answers WHERE question_id = $1",
      [id]
    );

    // Delete question-answer relationships
    await client.query("DELETE FROM question_answers WHERE question_id = $1", [
      id,
    ]);

    // Delete the answers
    for (const answer of answerIds.rows) {
      await client.query("DELETE FROM answers WHERE answer_id = $1", [
        answer.answer_id,
      ]);
    }

    // Delete the question
    await client.query("DELETE FROM questions WHERE question_id = $1", [id]);

    await client.query("COMMIT");
    res.json({ message: "Question deleted successfully" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error deleting question:", error);
    res.status(500).json({ error: "Error deleting question" });
  } finally {
    client.release();
  }
};

// Get questions by subtopic ID
const getQuestionsBySubtopicId = async (req, res) => {
  try {
    const { subtopicId } = req.params;
    const result = await pool.query(
      `SELECT 
        q.*,
        t.topic_name,
        s.subtopic_name,
        cs.child_subtopic_name,
        json_agg(
          json_build_object(
            'answer_id', a.answer_id,
            'answer_text', a.answer_text,
            'is_correct', qa.is_correct,
            'answer_order', qa.answer_order
          ) ORDER BY qa.answer_order
        ) as answers
       FROM questions q
       JOIN topics t ON q.topic_id = t.topic_id
       JOIN subtopics s ON q.subtopic_id = s.subtopic_id
       LEFT JOIN child_subtopics cs ON q.child_subtopic_id = cs.child_subtopic_id
       LEFT JOIN question_answers qa ON q.question_id = qa.question_id
       LEFT JOIN answers a ON qa.answer_id = a.answer_id
       WHERE q.subtopic_id = $1
       GROUP BY q.question_id, t.topic_name, s.subtopic_name, cs.child_subtopic_name
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
      `SELECT 
        q.*,
        t.topic_name,
        s.subtopic_name,
        cs.child_subtopic_name,
        json_agg(
          json_build_object(
            'answer_id', a.answer_id,
            'answer_text', a.answer_text,
            'is_correct', qa.is_correct,
            'answer_order', qa.answer_order
          ) ORDER BY qa.answer_order
        ) as answers
       FROM questions q
       JOIN topics t ON q.topic_id = t.topic_id
       JOIN subtopics s ON q.subtopic_id = s.subtopic_id
       LEFT JOIN child_subtopics cs ON q.child_subtopic_id = cs.child_subtopic_id
       LEFT JOIN question_answers qa ON q.question_id = qa.question_id
       LEFT JOIN answers a ON qa.answer_id = a.answer_id
       WHERE q.topic_id = $1
       GROUP BY q.question_id, t.topic_name, s.subtopic_name, cs.child_subtopic_name
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
      `SELECT 
        q.*,
        t.topic_name,
        s.subtopic_name,
        cs.child_subtopic_name,
        json_agg(
          json_build_object(
            'answer_id', a.answer_id,
            'answer_text', a.answer_text,
            'is_correct', qa.is_correct,
            'answer_order', qa.answer_order
          ) ORDER BY qa.answer_order
        ) as answers
       FROM questions q
       JOIN topics t ON q.topic_id = t.topic_id
       JOIN subtopics s ON q.subtopic_id = s.subtopic_id
       LEFT JOIN child_subtopics cs ON q.child_subtopic_id = cs.child_subtopic_id
       LEFT JOIN question_answers qa ON q.question_id = qa.question_id
       LEFT JOIN answers a ON qa.answer_id = a.answer_id
       WHERE q.topic_id = $1 AND q.subtopic_id = $2
       GROUP BY q.question_id, t.topic_name, s.subtopic_name, cs.child_subtopic_name
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

// Get answers by question ID
const getAnswersByQuestionId = async (req, res) => {
  try {
    const { questionId } = req.params;

    // Check if question exists
    const questionExists = await pool.query(
      "SELECT question_id FROM questions WHERE question_id = $1",
      [questionId]
    );
    if (questionExists.rows.length === 0) {
      return res.status(404).json({ error: "Question not found" });
    }

    const result = await pool.query(
      `SELECT 
        a.answer_id,
        a.answer_text,
        qa.is_correct,
        qa.answer_order
      FROM answers a
      JOIN question_answers qa ON a.answer_id = qa.answer_id
      WHERE qa.question_id = $1
      ORDER BY qa.answer_order`,
      [questionId]
    );

    res.json({
      question_id: questionId,
      answers: result.rows,
    });
  } catch (error) {
    console.error("Error fetching answers by question:", error);
    res.status(500).json({ error: "Error fetching answers by question" });
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
  getAnswersByQuestionId,
};
