# StudentOS Database

## Overview

This folder contains the SQL schema and transaction examples for the StudentOS student profile database. The project uses MySQL 8.0+ and InnoDB.

## Files

- `schema.sql` — Creates the database and student/profile tables.
- `transactions.sql` — Demonstrates transaction commit and rollback.
- `transaction_safety.sql` — Creates a stored procedure that registers a student and profile in a transaction, with SQL exception handling.

## Database Design

### students

- `student_id` — Auto-incrementing primary key.
- `full_name` — Required student name.
- `email` — Unique student email.
- `created_at` — Record creation timestamp.
- `updated_at` — Automatically updated timestamp.

### student_profiles

- `student_id` — Primary key and foreign key referencing `students.student_id`.
- `field_of_study` — Student's field of study.
- `academic_year` — Student's academic year.
- `goals` — JSON field for student goals.
- `preferences` — JSON field for student preferences.
- `profile_completed` — Profile completion status.
- `created_at` and `updated_at` — Record timestamps.

The foreign key uses `ON DELETE CASCADE`, which removes the associated profile when its student record is deleted.

## Transaction Handling

The `register_student_safely` procedure:

1. Starts a transaction.
2. Inserts the student record.
3. Retrieves the generated student ID.
4. Inserts the associated profile.
5. Commits when both inserts succeed.
6. Rolls back and rethrows the error if an SQL exception occurs.

## Test Results

- Table definitions, primary keys, unique email constraint, and foreign key were verified.
- Successful registration created both a student and profile.
- Duplicate email registration was rejected.
- A deliberately invalid profile insert caused a foreign-key error, and rollback left no student record from that transaction.
- Basic `COMMIT` and `ROLLBACK` examples were executed successfully.

## Setup

Run the SQL files using the MySQL command-line client. Replace the example paths with your actual project path.

```sql
SOURCE /path/to/database/schema.sql;
SOURCE /path/to/database/transactions.sql;
SOURCE /path/to/database/transaction_safety.sql;
```

Check existing sample records before rerunning transaction examples because email addresses must be unique.

## Before Production

Confirm the required profile fields with the StudentOS team, especially fields used by AI recommendations. Use a dedicated application database account with appropriate permissions rather than the MySQL root account in a deployed environment.