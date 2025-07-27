const express = require("express");
const router = express.Router();
const {
  getAllQuestions,
  getQuestionById,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  getQuestionsBySubtopicId,
  getQuestionsByTopicId,
  getQuestionsByTopicSubtopicIds,
} = require("../controllers/questionController");

// Question routes
router.get("/", getAllQuestions);
router.get("/subtopic/:subtopicId", getQuestionsBySubtopicId);
router.get("/topic/:topicId", getQuestionsByTopicId);
router.get(
  "/topic/:topicId/subtopic/:subtopicId",
  getQuestionsByTopicSubtopicIds
);
router.get("/:id", getQuestionById);
router.post("/", createQuestion);
router.put("/:id", updateQuestion);
router.delete("/:id", deleteQuestion);

module.exports = router;
