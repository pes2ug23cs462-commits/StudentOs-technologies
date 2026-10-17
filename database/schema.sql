-- StudentOS: Student Profile Database
-- MySQL 8.0+

CREATE DATABASE IF NOT EXISTS studentos_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_0900_ai_ci;

USE studentos_db;

CREATE TABLE IF NOT EXISTS students (
    student_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS student_profiles (
    student_id BIGINT UNSIGNED PRIMARY KEY,
    field_of_study VARCHAR(100),
    academic_year VARCHAR(30),
    goals JSON,
    preferences JSON,
    profile_completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_profile_student
        FOREIGN KEY (student_id)
        REFERENCES students(student_id)
        ON DELETE CASCADE
) ENGINE=InnoDB;
