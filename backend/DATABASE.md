# Database Setup Documentation

## Overview

This document describes the database configuration, schema, and models implemented for the E-Learning Platform backend.

## Database Configuration

### Connection Setup

The database configuration is located in `src/config/database.js` and includes:

- **PostgreSQL Connection**: Configured with Sequelize ORM
- **Connection Pooling**: Optimized pool settings for performance
  - Max connections: 10
  - Min connections: 2
  - Acquire timeout: 30 seconds
  - Idle timeout: 10 seconds
- **SSL Support**: Automatic SSL configuration for production environments
- **Health Check**: Built-in database health monitoring

### Environment Variables

Required environment variables (see `.env.example`):

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=e_learning_db
DB_USER=postgres
DB_PASSWORD=your_password
```

## Database Schema

### Core Tables

1. **users** - User accounts (instructors and students)
2. **semesters** - Academic semesters
3. **courses** - Courses within semesters
4. **groups** - Student groups within courses
5. **students** - Student profile information
6. **group_members** - Many-to-many relationship between groups and students
7. **course_enrollments** - Many-to-many relationship between courses and students

### Content Tables

8. **announcements** - Course announcements with group scoping
9. **assignments** - Course assignments with due dates
10. **assignment_submissions** - Student assignment submissions
11. **questions** - Question bank for quizzes
12. **quizzes** - Quiz definitions
13. **quiz_attempts** - Student quiz attempts and scores
14. **materials** - Course materials (files)

### Communication Tables

15. **forum_threads** - Forum discussion threads
16. **forum_replies** - Replies to forum threads
17. **chat_conversations** - Private chat conversations
18. **chat_messages** - Chat messages
19. **notifications** - User notifications

### Tracking Tables

20. **content_views** - Track content views by students
21. **material_downloads** - Track material downloads

## Migrations

### Running Migrations

All migration files are located in `src/migrations/` and are numbered sequentially.

**Run all migrations:**
```bash
npm run migrate
```

**Rollback all migrations:**
```bash
npm run migrate:rollback
```

**Sync models (development only):**
```bash
npm run db:sync
```

**Reset database (WARNING: deletes all data):**
```bash
npm run db:reset
```

### Migration Files

- `01-create-users.js` - Users table
- `02-create-semesters.js` - Semesters table
- `03-create-courses.js` - Courses table
- `04-create-groups.js` - Groups table
- `05-create-students.js` - Students table
- `06-create-group-members.js` - Group members junction table
- `07-create-course-enrollments.js` - Course enrollments junction table
- `08-create-announcements.js` - Announcements table
- `09-create-assignments.js` - Assignments table
- `10-create-assignment-submissions.js` - Assignment submissions table
- `11-create-questions.js` - Questions table
- `12-create-quizzes.js` - Quizzes table
- `13-create-quiz-attempts.js` - Quiz attempts table
- `14-create-materials.js` - Materials table
- `15-create-forum-threads.js` - Forum threads table
- `16-create-forum-replies.js` - Forum replies table
- `17-create-chat-conversations.js` - Chat conversations table
- `18-create-chat-messages.js` - Chat messages table
- `19-create-notifications.js` - Notifications table
- `20-create-content-views.js` - Content views tracking table
- `21-create-material-downloads.js` - Material downloads tracking table

## Models

All Sequelize models are located in `src/models/` and include:

### Core Models
- `User.js` - User model with role enum (instructor/student)
- `Semester.js` - Semester model with date validation
- `Course.js` - Course model with semester and instructor relationships
- `Group.js` - Group model within courses
- `Student.js` - Student profile model
- `GroupMember.js` - Group membership junction model
- `CourseEnrollment.js` - Course enrollment junction model

### Content Models
- `Announcement.js` - Announcement model with group scoping
- `Assignment.js` - Assignment model with due dates
- `AssignmentSubmission.js` - Submission model with grading
- `Question.js` - Question bank model with multiple types
- `Quiz.js` - Quiz model with question selection
- `QuizAttempt.js` - Quiz attempt model with scoring
- `Material.js` - Material model with file metadata

### Communication Models
- `ForumThread.js` - Forum thread model
- `ForumReply.js` - Forum reply model
- `ChatConversation.js` - Chat conversation model
- `ChatMessage.js` - Chat message model
- `Notification.js` - Notification model

### Tracking Models
- `ContentView.js` - Content view tracking model
- `MaterialDownload.js` - Material download tracking model

### Model Associations

All model associations are defined in `src/models/index.js`:

- **One-to-One**: User ↔ Student
- **One-to-Many**: 
  - Semester → Courses
  - Course → Groups, Announcements, Assignments, Quizzes, Materials, ForumThreads
  - Assignment → Submissions
  - Quiz → Attempts
  - ForumThread → Replies
  - ChatConversation → Messages
- **Many-to-Many**:
  - Course ↔ Students (through CourseEnrollment)
  - Group ↔ Students (through GroupMember)

## Indexes

All tables include appropriate indexes for:
- Primary keys (UUID)
- Foreign keys
- Frequently queried fields (email, code, dates, etc.)
- Composite indexes for common query patterns
- Unique constraints where applicable

## Database Health Check

The health check endpoint is available at:

```
GET /api/health
GET /api/health/db
```

Returns:
- Connection status
- Pool statistics (size, available, using, waiting)
- Timestamp

## Best Practices

1. **Always use migrations** for schema changes in production
2. **Never use `db:reset`** in production (it deletes all data)
3. **Use transactions** for operations that modify multiple tables
4. **Leverage indexes** for query optimization
5. **Use connection pooling** to manage database connections efficiently
6. **Monitor pool statistics** via health check endpoint
7. **Use cascading deletes** carefully (defined in foreign key constraints)

## Cascading Delete Behavior

The following relationships have CASCADE delete:
- Semester deletion → deletes all associated Courses
- Course deletion → deletes all Groups, Announcements, Assignments, Quizzes, Materials, ForumThreads
- Group deletion → removes all GroupMembers
- Assignment deletion → deletes all Submissions
- Quiz deletion → deletes all Attempts
- ForumThread deletion → deletes all Replies
- ChatConversation deletion → deletes all Messages

## Next Steps

After setting up the database:

1. Configure your `.env` file with database credentials
2. Run migrations: `npm run migrate`
3. Seed initial data (if seed script is available)
4. Start the server: `npm run dev`
5. Verify health check: `curl http://localhost:3000/api/health/db`

## Troubleshooting

### Connection Issues

If you encounter connection errors:
1. Verify PostgreSQL is running
2. Check database credentials in `.env`
3. Ensure database exists: `createdb e_learning_db`
4. Check firewall/network settings
5. Review logs for detailed error messages

### Migration Issues

If migrations fail:
1. Check database connection
2. Verify migration files are in correct order
3. Check for existing tables (may need to drop manually)
4. Review migration logs for specific errors

### Performance Issues

If experiencing slow queries:
1. Check pool statistics via health endpoint
2. Review query execution plans
3. Add additional indexes if needed
4. Increase pool size if necessary
5. Monitor database server resources
