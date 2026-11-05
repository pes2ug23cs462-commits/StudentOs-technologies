-- StudentOS: RAG Study Materials Schema
-- Dedicated storage and metadata tracking for student study documents (PDF, DOCX, TXT)
-- Completely isolated from profile-verification documents (student_documents)

USE studentos_db;

CREATE TABLE IF NOT EXISTS student_study_materials (
    material_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    student_id BIGINT UNSIGNED NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    storage_filename VARCHAR(255) NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    file_size BIGINT UNSIGNED NOT NULL,
    file_hash_sha256 CHAR(64) NOT NULL,
    parsing_status ENUM('PENDING', 'PARSED', 'FAILED', 'DELETING')
        NOT NULL DEFAULT 'PENDING',
    total_chunks INT UNSIGNED NOT NULL DEFAULT 0,
    error_message VARCHAR(500) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    -- Foreign Key: References existing students(student_id).
    -- ON DELETE RESTRICT prevents silent database cascades from leaving orphaned
    -- vector embeddings in ChromaDB and orphaned files in storage. Deletion of a
    -- student account must be orchestrated through the application deletion service.
    CONSTRAINT fk_study_materials_student
        FOREIGN KEY (student_id)
        REFERENCES students(student_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    -- Optimized for active RAG retrieval (Tier 1 filtering)
    INDEX idx_study_student_status (student_id, parsing_status),

    -- Optimized for fast duplicate detection per student
    INDEX idx_study_student_hash (student_id, file_hash_sha256)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
