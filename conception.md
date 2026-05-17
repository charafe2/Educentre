# GLOBAL DATABASE SCHEMA

## School Tutoring Center Management Platform

### Database Engine: PostgreSQL

---

# GLOBAL SYSTEM DESCRIPTION

This database represents a multi-tenant SaaS platform for managing tutoring and educational support centers.

The system includes:

* Multi-center management
* User and authentication management
* Academic management
* Student and parent management
* Payment and invoicing system
* Teacher management and payroll
* Notification and WhatsApp communication
* User preferences and privacy settings
* Class sessions and attendance tracking
* SaaS subscription management

All entities are isolated using `centre_id` to guarantee secure multi-tenant architecture.

---

# MAIN DOMAINS

---

# 1. CORE / ORGANIZATION

Contains the main organizational structure:

* centres
* rooms
* classes
* subscriptions

---

# 2. USERS & AUTHENTICATION

Handles accounts, profiles, and security:

* users
* user_profiles
* user_sessions
* user_2fa
* user_preferences
* user_privacy_settings

---

# 3. ACADEMIC

Handles educational and academic operations:

* students
* parents
* enrollments
* grades
* sessions
* attendance

---

# 4. FINANCE & PAYMENTS

Handles financial operations:

* student_payments
* invoices
* teachers
* teacher_payroll

---

# 5. COMMUNICATION

Handles communication and notifications:

* notifications
* whatsapp_messages
* user_notification_preferences
* user_notification_types
* user_notification_type_preferences

---

# DETAILED TABLE STRUCTURE

---

# TABLE: centres

Represents tutoring centers.

## Columns

* id (PK)
* name
* type
* city
* address
* phone
* whatsapp_number
* is_active
* created_at

## Relationships

One center can have:

* multiple rooms
* multiple classes
* multiple users
* multiple students
* multiple teachers
* multiple enrollments
* multiple payments
* multiple notifications
* multiple subscriptions

---

# TABLE: subscriptions

Handles SaaS subscriptions for each center.

## Columns

* id
* centre_id (FK → centres.id)
* plan
* monthly_price
* start_date
* end_date
* status
* created_at

## Purpose

Manages:

* monthly subscriptions
* expiration dates
* suspension
* upgrades/downgrades

---

# TABLE: rooms

Represents classrooms or physical rooms.

## Columns

* id
* centre_id
* name
* capacity
* is_active
* created_at

## Relationships

A room belongs to a center.

A room can host multiple classes.

---

# TABLE: classes

Represents academic classes.

## Columns

* id
* centre_id
* teacher_id
* room_id
* name
* subject
* level
* max_capacity
* monthly_price
* is_active
* created_at

## Relationships

A class:

* belongs to a center
* has one assigned teacher
* uses one room
* has multiple enrollments
* has multiple grades
* has multiple sessions
* has multiple student payments

---

# TABLE: users

Represents platform user accounts.

## Columns

* id
* centre_id
* first_name
* last_name
* email (UNIQUE)
* phone
* password_hash
* role
* is_active
* created_at

## Possible Roles

Examples:

* admin
* manager
* secretary
* teacher
* accountant

## Relationships

A user:

* belongs to a center
* has one user profile
* can receive notifications
* can have multiple sessions
* can enable 2FA
* owns preference settings

---

# TABLE: user_profiles

Extended user profile information.

## Columns

* id
* user_id
* bio
* phone
* website
* location
* date_of_birth
* profile_visibility
* created_at
* updated_at

## Purpose

Stores detailed profile information.

---

# TABLE: teachers

Stores teacher-specific information.

## Columns

* id
* user_id
* centre_id
* specialty
* payment_mode
* fixed_monthly_salary
* rate_per_student
* min_students_threshold
* iban
* is_active
* created_at

## payment_mode

Possible values:

* fixed
* per_student

## Payroll Logic

Two payroll methods exist:

### Fixed

Teacher receives a fixed monthly salary.

### Per Student

Teacher receives payment based on enrolled student count.

---

# TABLE: teacher_payroll

Stores teacher payroll history.

## Columns

* id
* teacher_id
* centre_id
* period_month
* base_amount
* bonus_amount
* total_amount
* student_count
* status
* paid_at
* payment_ref
* created_at

## status

* pending
* paid
* cancelled

---

# TABLE: students

Represents students.

## Columns

* id
* centre_id
* student_code (UNIQUE)
* first_name
* last_name
* birth_date
* school_level
* current_school
* is_active
* created_at

## Relationships

A student:

* can have multiple parents
* can have multiple enrollments
* can have multiple grades
* can have multiple attendance records
* can have multiple payments

---

# TABLE: parents

Represents parents or guardians.

## Columns

* id
* centre_id
* student_id
* first_name
* last_name
* phone
* whatsapp_phone
* email
* relation
* is_primary
* created_at

## relation

Possible values:

* father
* mother
* guardian
* other

## Purpose

Supports family communication and billing.

---

# TABLE: enrollments

Represents student enrollment in classes.

## Columns

* id
* centre_id
* student_id
* class_id
* enrolled_at
* status
* created_at

## Relationships

Pivot table between:

* students
* classes

## Purpose

Allows students to enroll in multiple classes.

---

# TABLE: grades

Stores student grades and evaluations.

## Columns

* id
* centre_id
* student_id
* class_id
* evaluation_title
* score
* max_score
* note
* evaluated_at
* created_at

## Purpose

Stores:

* exams
* quizzes
* assignments
* teacher remarks

---

# TABLE: sessions

Represents class sessions.

## Columns

* id
* centre_id
* class_id
* start_at
* end_at
* is_cancelled
* cancel_reason
* created_at

## Purpose

Handles class scheduling.

---

# TABLE: attendance

Stores student attendance records.

## Columns

* id
* centre_id
* session_id
* student_id
* status
* note
* recorded_at

## status values

* present
* absent
* late
* excused

---

# TABLE: student_payments

Handles student payment records.

## Columns

* id
* centre_id
* student_id
* class_id
* period_month
* amount
* status
* payment_method
* receipt_ref
* paid_at
* note
* created_at

## status

* pending
* paid
* overdue
* cancelled

## payment_method

* cash
* bank
* mobile
* card

## Purpose

Tracks monthly student payments.

---

# TABLE: invoices

Stores generated invoices.

## Columns

* id
* centre_id
* student_payment_id
* invoice_number
* pdf_path
* sent_via_whatsapp
* generated_at
* created_at

## Purpose

Automatic invoice generation and tracking.

---

# TABLE: notifications

System notifications.

## Columns

* id
* centre_id
* recipient_user_id
* title
* body
* channel
* type
* is_read
* sent_at
* created_at

## channel

* in_app
* email
* whatsapp

## type

* info
* reminder
* alert
* promotion

---

# TABLE: whatsapp_messages

Stores WhatsApp communication logs.

## Columns

* id
* centre_id
* parent_id
* template_type
* message_body
* status
* provider_message_id
* sent_at
* created_at

## status

* queued
* sent
* delivered
* failed

## Purpose

Tracks WhatsApp communications with parents.

---

# TABLE: user_sessions

Stores active login sessions.

## Columns

* id
* user_id
* refresh_token
* user_agent
* ip_address
* expires_at
* created_at

## Purpose

Session management and security tracking.

---

# TABLE: user_2fa

Two-factor authentication configuration.

## Columns

* id
* user_id
* secret
* is_enabled
* created_at

## Purpose

Enhances account security using 2FA.

---

# TABLE: user_preferences

Stores user interface preferences.

## Columns

* id
* user_id
* language
* timezone
* theme
* items_per_page
* density
* sidebar_collapsed
* created_at
* updated_at

## Purpose

Personalized dashboard and UI settings.

---

# TABLE: user_privacy_settings

Stores privacy configuration.

## Columns

* id
* user_id
* profile_visibility
* show_email
* show_last_seen
* allow_messages
* created_at
* updated_at

## Purpose

Controls user privacy preferences.

---

# TABLE: user_notification_preferences

Stores notification preferences.

## Columns

* id
* user_id
* channel
* enabled
* frequency
* quiet_start
* quiet_end
* created_at
* updated_at

## Purpose

Controls how users receive notifications.

---

# TABLE: user_notification_types

Master table for notification types.

## Columns

* id
* code
* name
* description
* category
* is_active

## Purpose

Defines notification categories available in the system.

---

# TABLE: user_notification_type_preferences

Stores per-user notification type preferences.

## Columns

* id
* user_id
* notification_type_id
* enabled
* created_at
* updated_at

## Purpose

Allows users to enable or disable specific notification types.

---

# BUSINESS RULES

---

## Multi-Tenant Isolation

Every major entity contains `centre_id`.

No center can access another center’s data.

---

## Enrollment Rules

* One student can enroll in multiple classes.
* One class can contain multiple students.

---

## Teacher Payment Logic

Teachers can be paid:

* fixed monthly salary
* based on student count

---

## Payment & Invoice Logic

* Student payments are monthly.
* Every successful payment may generate an invoice.
* Invoices can be sent through WhatsApp.

---

## Attendance Logic

Attendance is linked to:

* session
* student

Each session can track attendance for all enrolled students.

---

# RECOMMENDED INDEXES

Recommended performance indexes:

* users.email UNIQUE
* users.phone
* students.student_code UNIQUE
* enrollments(student_id, class_id)
* student_payments(student_id, period_month, status)
* sessions(class_id, start_at)
* attendance(session_id, student_id)
* notifications(recipient_user_id, is_read)
* user_sessions(user_id, expires_at)

---

# ARCHITECTURE NOTES

## Database Type

* PostgreSQL relational database

## Architecture Style

* SaaS multi-tenant architecture
* Modular domain separation
* Role-based access architecture
* Event and notification ready
* Scalable academic management system

---

# SYSTEM MODULES SUMMARY

The platform includes:

1. Center Management
2. User & Authentication Management
3. Teacher Management
4. Student Management
5. Parent Management
6. Class & Room Scheduling
7. Enrollment Management
8. Attendance Tracking
9. Academic Evaluation
10. Payment Management
11. Invoice System
12. WhatsApp Communication
13. Notification System
14. User Preferences & Privacy
15. SaaS Subscription Billing
