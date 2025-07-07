const express = require("express");
const router = express.Router();
const subtopicController = require("../controllers/subtopicController");

// Get all subtopics
router.get("/", subtopicController.getAllSubtopics);

// Get subtopics by topic ID
router.get("/topic/:topicId", subtopicController.getSubtopicsByTopicId);

// Get a single subtopic by ID
router.get("/:id", subtopicController.getSubtopicById);

// Create a new subtopic
router.post("/", subtopicController.createSubtopic);

// Update a subtopic
router.put("/:id", subtopicController.updateSubtopic);

// Delete a subtopic
router.delete("/:id", subtopicController.deleteSubtopic);

module.exports = router;
