-- StudentOS: Safe Transaction Handling
-- MySQL 8.0+

USE studentos_db;

DROP PROCEDURE IF EXISTS register_student_safely;

DELIMITER //

CREATE PROCEDURE register_student_safely(
    IN p_full_name VARCHAR(100),
    IN p_email VARCHAR(255),
    IN p_field_of_study VARCHAR(100),
    IN p_academic_year VARCHAR(30)
)
BEGIN
    DECLARE v_student_id BIGINT UNSIGNED;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    INSERT INTO students (full_name, email)
    VALUES (p_full_name, p_email);

    SET v_student_id = LAST_INSERT_ID();

    INSERT INTO student_profiles (
        student_id,
        field_of_study,
        academic_year,
        goals,
        preferences,
        profile_completed
    )
    VALUES (
        v_student_id,
        p_field_of_study,
        p_academic_year,
        JSON_ARRAY(),
        JSON_OBJECT(),
        FALSE
    );

    COMMIT;
END //

DELIMITER ;
