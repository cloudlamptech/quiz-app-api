-- Production Enhancements for Quiz App Database

-- 1. Additional Indexes for Better Performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_questions_topic_subtopic ON questions(topic_id, subtopic_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_questions_created_at ON questions(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_answers_text ON answers(answer_text);

-- 2. Add Constraints for Data Integrity
ALTER TABLE questions ADD CONSTRAINT chk_difficulty CHECK (difficulty IN ('easy', 'medium', 'hard'));
ALTER TABLE question_answers ADD CONSTRAINT chk_answer_order CHECK (answer_order > 0);
ALTER TABLE answers ADD CONSTRAINT chk_answer_text_length CHECK (LENGTH(answer_text) >= 1 AND LENGTH(answer_text) <= 255);

-- 3. Add Soft Delete Support (Optional)
ALTER TABLE questions ADD COLUMN deleted_at TIMESTAMP NULL;
ALTER TABLE answers ADD COLUMN deleted_at TIMESTAMP NULL;
ALTER TABLE question_answers ADD COLUMN deleted_at TIMESTAMP NULL;

-- 4. Add Audit Trail (Optional)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(50) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL, -- INSERT, UPDATE, DELETE
    old_values JSONB,
    new_values JSONB,
    user_id UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- 5. Add Rate Limiting Table (Optional)
CREATE TABLE api_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address INET NOT NULL,
    endpoint VARCHAR(100) NOT NULL,
    request_count INTEGER DEFAULT 1,
    window_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(ip_address, endpoint, window_start)
);

-- 6. Add Caching Table for Frequently Accessed Data (Optional)
CREATE TABLE question_cache (
    cache_key VARCHAR(255) PRIMARY KEY,
    cache_value JSONB NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_question_cache_expires ON question_cache(expires_at);

-- 7. Add Statistics Tables for Analytics (Optional)
CREATE TABLE question_statistics (
    question_id UUID PRIMARY KEY REFERENCES questions(question_id),
    total_attempts INTEGER DEFAULT 0,
    correct_attempts INTEGER DEFAULT 0,
    average_time_seconds DECIMAL(10,2),
    difficulty_rating DECIMAL(3,2),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_question_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    question_id UUID NOT NULL REFERENCES questions(question_id),
    selected_answer_id UUID REFERENCES answers(answer_id),
    is_correct BOOLEAN NOT NULL,
    time_taken_seconds INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_attempts_user_question ON user_question_attempts(user_id, question_id);
CREATE INDEX idx_user_attempts_created_at ON user_question_attempts(created_at DESC); 