USE studentos_db;

-- Store the student's social links in the existing profile table.
ALTER TABLE student_profiles
    ADD COLUMN github_url VARCHAR(2048) NULL,
    ADD COLUMN linkedin_url VARCHAR(2048) NULL,
    ADD COLUMN portfolio_url VARCHAR(2048) NULL,
    ADD COLUMN kaggle_url VARCHAR(2048) NULL;

-- Store document metadata separately from the actual files.
CREATE TABLE student_documents (
    document_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    student_id BIGINT UNSIGNED NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    storage_filename VARCHAR(255) NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    file_size BIGINT UNSIGNED NOT NULL,
    verification_status ENUM('pending', 'verified', 'rejected')
        NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_student_documents_student
        FOREIGN KEY (student_id)
        REFERENCES students(student_id)
        ON DELETE CASCADE
) ENGINE=InnoDB;