
USE studentos_db;

-- Stores each student's phone number and verification status.
CREATE TABLE IF NOT EXISTS student_phone_numbers (
    phone_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    student_id BIGINT UNSIGNED NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    verified_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT uq_student_phone UNIQUE (phone_number),
    CONSTRAINT uq_student_phone_pair UNIQUE (student_id, phone_number),
    CONSTRAINT fk_phone_student
        FOREIGN KEY (student_id)
        REFERENCES students(student_id)
        ON DELETE CASCADE
) ENGINE=InnoDB;

-- Stores temporary OTP challenges, never the plaintext OTP itself.
CREATE TABLE IF NOT EXISTS otp_challenges (
    challenge_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    phone_number VARCHAR(20) NOT NULL,
    purpose ENUM('registration', 'login') NOT NULL,
    otp_hash CHAR(64) NOT NULL,
    expires_at DATETIME NOT NULL,
    attempts INT UNSIGNED NOT NULL DEFAULT 0,
    consumed_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_otp_phone_purpose (phone_number, purpose),
    INDEX idx_otp_expiry (expires_at)
) ENGINE=InnoDB;
