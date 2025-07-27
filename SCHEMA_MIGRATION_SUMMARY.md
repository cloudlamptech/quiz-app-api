# Database Schema Migration Summary

## Overview

Successfully migrated from a circular dependency design to a clean junction table approach for managing question-answer relationships.

## Database Schema Changes

### 1. Modified `answers` table

- Removed foreign key constraint `fk_answers_question`
- Made `question_id` column nullable
- Answers are now independent entities

### 2. Created `question_answers` junction table

```sql
CREATE TABLE question_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES questions(question_id) ON DELETE CASCADE,
    answer_id UUID NOT NULL REFERENCES answers(answer_id) ON DELETE CASCADE,
    is_correct BOOLEAN DEFAULT FALSE,
    answer_order INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(question_id, answer_id)
);
```

### 3. Removed `correct_answer_id` from `questions` table

- Correct answer information is now stored in the junction table

## Controller Updates

### 1. `createQuestion` Function

- **Step 1**: Insert question first (without correct_answer_id)
- **Step 2**: Insert answers independently
- **Step 3**: Create relationships in junction table with correct answer flag
- **Step 4**: Return complete question with answers

### 2. `updateQuestion` Function

- **Step 1**: Validate question exists
- **Step 2**: Delete existing relationships and answers
- **Step 3**: Insert new answers
- **Step 4**: Update question details
- **Step 5**: Create new relationships
- **Step 6**: Return complete updated question

### 3. `deleteQuestion` Function

- **Step 1**: Check if question exists
- **Step 2**: Get all answer IDs for the question
- **Step 3**: Delete relationships from junction table
- **Step 4**: Delete all answers
- **Step 5**: Delete the question

### 4. Query Functions Updated

All query functions now use the new schema:

- `getAllQuestions`
- `getQuestionById`
- `getQuestionsBySubtopicId`
- `getQuestionsByTopicId`
- `getQuestionsByTopicSubtopicIds`

### 5. New Function Added

- `getAnswersByQuestionId`: Get all answers for a specific question

## New API Endpoints

### Get Answers by Question ID

```
GET /api/questions/:id/answers
```

**Response:**

```json
{
  "question_id": "uuid",
  "answers": [
    {
      "answer_id": "uuid",
      "answer_text": "Answer text",
      "is_correct": true,
      "answer_order": 1
    }
  ]
}
```

## Benefits of New Design

1. **No Circular Dependencies**: Clean separation between questions and answers
2. **Flexibility**: Answers can be reused across multiple questions
3. **Scalability**: Better performance for complex queries
4. **Maintainability**: Easier to manage and extend
5. **Data Integrity**: Proper foreign key relationships
6. **Ordering**: Answer order is preserved in the junction table

## Migration Steps Required

1. Run the SQL commands in `db_schema_fix.sql`
2. The controller code is already updated to work with the new schema
3. Test all endpoints to ensure they work correctly

## Example Usage

### Creating a Question

```json
POST /api/questions
{
  "topic_id": 1,
  "subtopic_id": 5,
  "child_subtopic_id": null,
  "question_text": "What is the capital of France?",
  "difficulty": "easy",
  "answers": ["London", "Paris", "Berlin", "Madrid"],
  "correct_answer_index": 1
}
```

### Getting Question with Answers

```json
GET /api/questions/:id
{
  "question_id": "uuid",
  "question_text": "What is the capital of France?",
  "difficulty": "easy",
  "answers": [
    {
      "answer_id": "uuid1",
      "answer_text": "London",
      "is_correct": false,
      "answer_order": 1
    },
    {
      "answer_id": "uuid2",
      "answer_text": "Paris",
      "is_correct": true,
      "answer_order": 2
    }
  ]
}
```

## Notes

- All existing functionality is preserved
- The API responses now include complete answer information
- Error handling is improved with proper transaction management
- The design supports future enhancements like answer reuse and analytics
