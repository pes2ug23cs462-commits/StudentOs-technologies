USE studentos_db;

CREATE TABLE IF NOT EXISTS student_goals (
    goal_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    student_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'personal',
    progress TINYINT UNSIGNED NOT NULL DEFAULT 0,
    status ENUM('not_started', 'in_progress', 'completed')
        NOT NULL DEFAULT 'not_started',
    target_date DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_goal_student
        FOREIGN KEY (student_id)
        REFERENCES students(student_id)
        ON DELETE CASCADE,
    INDEX idx_student_goals_student_status (student_id, status)
) ENGINE=InnoDB;
