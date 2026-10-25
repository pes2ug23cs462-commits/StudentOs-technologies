CREATE TABLE IF NOT EXISTS student_plans (
    plan_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    student_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(150) NOT NULL,
    goal TEXT NOT NULL,
    duration_weeks INT NOT NULL,
    status ENUM('DRAFT', 'REVIEW', 'APPROVED', 'ACTIVE')
        NOT NULL DEFAULT 'DRAFT',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_student_plans_student
        FOREIGN KEY (student_id)
        REFERENCES students(student_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT chk_student_plans_duration
        CHECK (duration_weeks BETWEEN 1 AND 52),

    INDEX idx_student_plans_student_created
        (student_id, created_at)
) ENGINE=InnoDB;
