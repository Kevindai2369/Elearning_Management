const { sequelize } = require('../config/database');

// Import all models
const User = require('./User');
const Semester = require('./Semester');
const Course = require('./Course');
const Group = require('./Group');
const Student = require('./Student');
const GroupMember = require('./GroupMember');
const CourseEnrollment = require('./CourseEnrollment');
const Announcement = require('./Announcement');
const Assignment = require('./Assignment');
const AssignmentSubmission = require('./AssignmentSubmission');
const Question = require('./Question');
const Quiz = require('./Quiz');
const QuizAttempt = require('./QuizAttempt');
const Material = require('./Material');
const ForumThread = require('./ForumThread');
const ForumReply = require('./ForumReply');
const ChatConversation = require('./ChatConversation');
const ChatMessage = require('./ChatMessage');
const Notification = require('./Notification');
const ContentView = require('./ContentView');
const MaterialDownload = require('./MaterialDownload');

// Define associations

// User associations
User.hasOne(Student, { foreignKey: 'user_id', as: 'studentProfile' });
User.hasMany(Course, { foreignKey: 'instructor_id', as: 'courses' });
User.hasMany(Question, { foreignKey: 'instructor_id', as: 'questions' });
User.hasMany(ForumThread, { foreignKey: 'author_id', as: 'forumThreads' });
User.hasMany(ForumReply, { foreignKey: 'author_id', as: 'forumReplies' });
User.hasMany(ChatMessage, { foreignKey: 'sender_id', as: 'sentMessages' });
User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });

// Semester associations
Semester.hasMany(Course, { foreignKey: 'semester_id', as: 'courses', onDelete: 'CASCADE' });

// Course associations
Course.belongsTo(Semester, { foreignKey: 'semester_id', as: 'semester' });
Course.belongsTo(User, { foreignKey: 'instructor_id', as: 'instructor' });
Course.hasMany(Group, { foreignKey: 'course_id', as: 'groups', onDelete: 'CASCADE' });
Course.hasMany(Announcement, { foreignKey: 'course_id', as: 'announcements', onDelete: 'CASCADE' });
Course.hasMany(Assignment, { foreignKey: 'course_id', as: 'assignments', onDelete: 'CASCADE' });
Course.hasMany(Quiz, { foreignKey: 'course_id', as: 'quizzes', onDelete: 'CASCADE' });
Course.hasMany(Material, { foreignKey: 'course_id', as: 'materials', onDelete: 'CASCADE' });
Course.hasMany(ForumThread, { foreignKey: 'course_id', as: 'forumThreads', onDelete: 'CASCADE' });
Course.belongsToMany(Student, { 
  through: CourseEnrollment, 
  foreignKey: 'course_id', 
  otherKey: 'student_id',
  as: 'enrolledStudents' 
});

// Group associations
Group.belongsTo(Course, { foreignKey: 'course_id', as: 'course' });
Group.belongsToMany(Student, { 
  through: GroupMember, 
  foreignKey: 'group_id', 
  otherKey: 'student_id',
  as: 'members' 
});

// GroupMember associations
GroupMember.belongsTo(Group, { foreignKey: 'group_id', as: 'group' });
GroupMember.belongsTo(Student, { foreignKey: 'student_id', as: 'student' });

// Student associations
Student.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Student.belongsToMany(Course, { 
  through: CourseEnrollment, 
  foreignKey: 'student_id', 
  otherKey: 'course_id',
  as: 'enrolledCourses' 
});
Student.belongsToMany(Group, { 
  through: GroupMember, 
  foreignKey: 'student_id', 
  otherKey: 'group_id',
  as: 'groups' 
});
Student.hasMany(AssignmentSubmission, { foreignKey: 'student_id', as: 'submissions' });
Student.hasMany(QuizAttempt, { foreignKey: 'student_id', as: 'quizAttempts' });

// Announcement associations
Announcement.belongsTo(Course, { foreignKey: 'course_id', as: 'course' });

// Assignment associations
Assignment.belongsTo(Course, { foreignKey: 'course_id', as: 'course' });
Assignment.hasMany(AssignmentSubmission, { 
  foreignKey: 'assignment_id', 
  as: 'submissions', 
  onDelete: 'CASCADE' 
});

// AssignmentSubmission associations
AssignmentSubmission.belongsTo(Assignment, { foreignKey: 'assignment_id', as: 'assignment' });
AssignmentSubmission.belongsTo(Student, { foreignKey: 'student_id', as: 'student' });

// Question associations
Question.belongsTo(User, { foreignKey: 'instructor_id', as: 'instructor' });

// Quiz associations
Quiz.belongsTo(Course, { foreignKey: 'course_id', as: 'course' });
Quiz.hasMany(QuizAttempt, { foreignKey: 'quiz_id', as: 'attempts', onDelete: 'CASCADE' });

// QuizAttempt associations
QuizAttempt.belongsTo(Quiz, { foreignKey: 'quiz_id', as: 'quiz' });
QuizAttempt.belongsTo(Student, { foreignKey: 'student_id', as: 'student' });

// Material associations
Material.belongsTo(Course, { foreignKey: 'course_id', as: 'course' });
Material.hasMany(MaterialDownload, { 
  foreignKey: 'material_id', 
  as: 'downloads', 
  onDelete: 'CASCADE' 
});

// ForumThread associations
ForumThread.belongsTo(Course, { foreignKey: 'course_id', as: 'course' });
ForumThread.belongsTo(User, { foreignKey: 'author_id', as: 'author' });
ForumThread.hasMany(ForumReply, { 
  foreignKey: 'thread_id', 
  as: 'replies', 
  onDelete: 'CASCADE' 
});

// ForumReply associations
ForumReply.belongsTo(ForumThread, { foreignKey: 'thread_id', as: 'thread' });
ForumReply.belongsTo(User, { foreignKey: 'author_id', as: 'author' });

// ChatConversation associations
ChatConversation.belongsTo(User, { foreignKey: 'student_id', as: 'student' });
ChatConversation.belongsTo(User, { foreignKey: 'instructor_id', as: 'instructor' });
ChatConversation.hasMany(ChatMessage, { 
  foreignKey: 'conversation_id', 
  as: 'messages', 
  onDelete: 'CASCADE' 
});

// ChatMessage associations
ChatMessage.belongsTo(ChatConversation, { foreignKey: 'conversation_id', as: 'conversation' });
ChatMessage.belongsTo(User, { foreignKey: 'sender_id', as: 'sender' });

// Notification associations
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// ContentView associations
ContentView.belongsTo(User, { foreignKey: 'student_id', as: 'student' });

// MaterialDownload associations
MaterialDownload.belongsTo(Material, { foreignKey: 'material_id', as: 'material' });
MaterialDownload.belongsTo(User, { foreignKey: 'student_id', as: 'student' });

// Export all models
module.exports = {
  sequelize,
  User,
  Semester,
  Course,
  Group,
  Student,
  GroupMember,
  CourseEnrollment,
  Announcement,
  Assignment,
  AssignmentSubmission,
  Question,
  Quiz,
  QuizAttempt,
  Material,
  ForumThread,
  ForumReply,
  ChatConversation,
  ChatMessage,
  Notification,
  ContentView,
  MaterialDownload
};
