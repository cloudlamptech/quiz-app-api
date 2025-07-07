const express = require("express");
const router = express.Router();
const topicController = require("../controllers/topicController");

// Get all topics
router.get("/", topicController.getAllTopics);

// Get a single topic by ID
router.get("/:id", topicController.getTopicById);

// Create a new topic
router.post("/", topicController.createTopic);

// Update a topic
router.put("/:id", topicController.updateTopic);

// Delete a topic
router.delete("/:id", topicController.deleteTopic);

module.exports = router;
