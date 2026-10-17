-- StudentOS: Database Transaction Examples
-- MySQL 8.0+ / InnoDB

USE studentos_db;

-- Example 1: Insert a student and profile in one transaction.
START TRANSACTION;

INSERT INTO students (full_name, email)
VALUES ('Transaction Test', 'transaction.test@example.com');

SET @new_student_id = LAST_INSERT_ID();

INSERT INTO student_profiles (
    student_id,
    field_of_study,
    academic_year,
    goals,
    preferences,
    profile_completed
)
VALUES (
    @new_student_id,
    'Computer Science',
    '2nd Year',
    JSON_ARRAY('Improve coding', 'Prepare for exams'),
    JSON_OBJECT('study_mode', 'visual', 'daily_hours', 2),
    TRUE
);

COMMIT;

-- Verify the committed data.
SELECT
    s.student_id,
    s.full_name,
    s.email,
    p.field_of_study,
    p.academic_year
FROM students AS s
JOIN student_profiles AS p
    ON s.student_id = p.student_id
WHERE s.email = 'transaction.test@example.com';

-- Example 2: Insert a temporary row, then roll it back.
START TRANSACTION;

INSERT INTO students (full_name, email)
VALUES ('Rollback Test', 'rollback.demo@example.com');

ROLLBACK;

-- Expected result: zero rows.
SELECT *
FROM students
WHERE email = 'rollback.demo@example.com';
