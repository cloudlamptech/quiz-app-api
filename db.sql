-- =============================
-- 🚀 Quiz App Database Schema for PostgreSQL (Updated for Scalability & Security)
-- =============================

-- Drop existing tables if they exist (for fresh setup)
DROP TABLE IF EXISTS user_responses, user_quiz_sessions, answers, questions, child_subtopics, subtopics, topics, users CASCADE;

-- =============================
-- 1️⃣ Users Table (with Mobile Number for OTP Login & Rate Limiting)
-- =============================
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE,
    mobile_number VARCHAR(15) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    otp_code VARCHAR(6),
    otp_expires_at TIMESTAMPTZ,
    otp_attempts INT DEFAULT 0,
    last_otp_sent_at TIMESTAMPTZ,
    account_locked_until TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================
-- 2️⃣ Topics Table (Level 1)
-- =============================
CREATE TABLE topics (
    topic_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_name VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================
-- 3️⃣ Subtopics Table (Level 2)
-- =============================
CREATE TABLE subtopics (
    subtopic_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id UUID NOT NULL,
    subtopic_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_subtopics_topic FOREIGN KEY (topic_id) 
        REFERENCES topics(topic_id) ON DELETE CASCADE
);

-- =============================
-- 4️⃣ Child Subtopics Table (Level 3)
-- =============================
CREATE TABLE child_subtopics (
    child_subtopic_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subtopic_id UUID NOT NULL,
    child_subtopic_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_child_subtopics_subtopic FOREIGN KEY (subtopic_id) 
        REFERENCES subtopics(subtopic_id) ON DELETE CASCADE
);

-- =============================
-- 5️⃣ Questions Table (Optimized with Indexing)
-- =============================
CREATE TABLE questions (
    question_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id UUID NOT NULL,
    subtopic_id UUID NOT NULL,
    child_subtopic_id UUID NOT NULL,
    question_text TEXT NOT NULL,
    difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
    correct_answer_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    search_vector TSVECTOR GENERATED ALWAYS AS (to_tsvector('english', question_text)) STORED,
    CONSTRAINT fk_questions_topic FOREIGN KEY (topic_id) 
        REFERENCES topics(topic_id) ON DELETE CASCADE,
    CONSTRAINT fk_questions_subtopic FOREIGN KEY (subtopic_id) 
        REFERENCES subtopics(subtopic_id) ON DELETE CASCADE,
    CONSTRAINT fk_questions_child_subtopic FOREIGN KEY (child_subtopic_id) 
        REFERENCES child_subtopics(child_subtopic_id) ON DELETE CASCADE
);

-- =============================
-- 6️⃣ Answers Table (Secure Answer Storage)
-- =============================
CREATE TABLE answers (
    answer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL,
    answer_text VARCHAR(255) NOT NULL,
    CONSTRAINT fk_answers_question FOREIGN KEY (question_id) 
        REFERENCES questions(question_id) ON DELETE CASCADE
);

-- =============================
-- 7️⃣ User Quiz Sessions Table (Tracking Progress)
-- =============================
CREATE TABLE user_quiz_sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    topic_id UUID NOT NULL,
    subtopic_id UUID NOT NULL,
    child_subtopic_id UUID NOT NULL,
    difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
    total_questions INT DEFAULT 0,
    questions_answered INT DEFAULT 0,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ NULL,
    CONSTRAINT fk_quiz_user FOREIGN KEY (user_id) 
        REFERENCES users(user_id) ON DELETE CASCADE
);

-- =============================
-- 8️⃣ User Responses Table
-- =============================
CREATE TABLE user_responses (
    response_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL,
    question_id UUID NOT NULL,
    selected_answer_id UUID NOT NULL,
    is_correct BOOLEAN DEFAULT FALSE,
    answered_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_response_session FOREIGN KEY (session_id) 
        REFERENCES user_quiz_sessions(session_id) ON DELETE CASCADE,
    CONSTRAINT fk_response_question FOREIGN KEY (question_id) 
        REFERENCES questions(question_id) ON DELETE CASCADE,
    CONSTRAINT fk_response_answer FOREIGN KEY (selected_answer_id) 
        REFERENCES answers(answer_id) ON DELETE CASCADE
);

-- =============================
-- ✅ Indexes for Performance Optimization
-- =============================
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_mobile ON users(mobile_number);
CREATE INDEX idx_questions_topic_difficulty ON questions(topic_id, difficulty);
CREATE INDEX idx_questions_search ON questions USING GIN(search_vector);
CREATE INDEX idx_subtopics_topic_id ON subtopics(topic_id);
CREATE INDEX idx_child_subtopics_subtopic_id ON child_subtopics(subtopic_id);
CREATE INDEX idx_sessions_user_id ON user_quiz_sessions(user_id);
CREATE INDEX idx_responses_session ON user_responses(session_id);

-- =============================
-- 🔹 Sample Data Insertion (Updated for UUIDs)
-- =============================
-- Insert Users
INSERT INTO users (username, email, mobile_number, password_hash) VALUES 
('john_doe', 'john@example.com', '+1234567890', 'hashed_password_123'),
('jane_smith', 'jane@example.com', '+1987654321', 'hashed_password_456');

-- Insert Topics
INSERT INTO topics (topic_name) VALUES 
('Mathematics'),
('Science');

-- Insert Subtopics
INSERT INTO subtopics (topic_id, subtopic_name) VALUES 
((SELECT topic_id FROM topics WHERE topic_name='Mathematics'), 'Algebra'),
((SELECT topic_id FROM topics WHERE topic_name='Science'), 'Physics');

-- Insert Child Subtopics
INSERT INTO child_subtopics (subtopic_id, child_subtopic_name) VALUES 
((SELECT subtopic_id FROM subtopics WHERE subtopic_name='Algebra'), 'Linear Equations');

-- Insert Questions
INSERT INTO questions (topic_id, subtopic_id, child_subtopic_id, question_text, difficulty, correct_answer_id) VALUES 
((SELECT topic_id FROM topics WHERE topic_name='Mathematics'), 
 (SELECT subtopic_id FROM subtopics WHERE subtopic_name='Algebra'), 
 (SELECT child_subtopic_id FROM child_subtopics WHERE child_subtopic_name='Linear Equations'), 
 'What is the value of x in 2x + 3 = 7?', 'easy', 
 (SELECT answer_id FROM answers WHERE answer_text='x = 2'));
