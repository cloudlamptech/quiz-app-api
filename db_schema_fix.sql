-- Option 1: Recommended Schema Changes

-- 1. Drop the foreign key constraint from answers table
ALTER TABLE answers DROP CONSTRAINT IF EXISTS fk_answers_question;

-- 2. Remove question_id column from answers table (no longer needed)
ALTER TABLE answers DROP COLUMN IF EXISTS question_id;

-- 3. Create a junction table for question-answer relationships
CREATE TABLE IF NOT EXISTS question_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES questions(question_id) ON DELETE CASCADE,
    answer_id UUID NOT NULL REFERENCES answers(answer_id) ON DELETE CASCADE,
    is_correct BOOLEAN DEFAULT FALSE,
    answer_order INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(question_id, answer_id)
);

-- 4. Create indexes for better performance
CREATE INDEX idx_question_answers_question_id ON question_answers(question_id);
CREATE INDEX idx_question_answers_answer_id ON question_answers(answer_id);
CREATE INDEX idx_question_answers_correct ON question_answers(is_correct);
CREATE INDEX idx_question_answers_order ON question_answers(answer_order);

-- 5. Remove correct_answer_id from questions table (since it's now in junction table)
ALTER TABLE questions DROP COLUMN IF EXISTS correct_answer_id; 