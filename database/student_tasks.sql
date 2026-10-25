USE studentos_db;

CREATE TABLE IF NOT EXISTS student_tasks (
    task_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    student_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    due_date DATETIME NULL,
    priority ENUM('low', 'medium', 'high')
        NOT NULL DEFAULT 'medium',
    status ENUM('pending', 'in_progress', 'completed')
        NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_task_student
        FOREIGN KEY (student_id)
        REFERENCES students(student_id)
        ON DELETE CASCADE,
    INDEX idx_student_tasks_student_status (student_id, status),
    INDEX idx_student_tasks_due_date (due_date)
) ENGINE=InnoDB;
