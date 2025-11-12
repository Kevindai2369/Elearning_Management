const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticate } = require('../middleware/auth');
const { authorizeInstructor } = require('../middleware/authorize');
const {
  createAnnouncement,
  getAnnouncements,
  updateAnnouncement,
  deleteAnnouncement,
  createAssignment,
  getAssignments,
  submitAssignment,
  getAssignmentSubmissions,
  gradeAssignment,
  createMaterial,
  getMaterials,
  downloadMaterial,
  deleteMaterial,
  recordContentView,
  getContentTracking
} = require('../controllers/contentController');

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// ==================== ANNOUNCEMENT ROUTES ====================

// Create announcement (Instructor only)
router.post('/courses/:courseId/announcements', authenticate, authorizeInstructor, createAnnouncement);

// Get announcements (filtered by student groups)
router.get('/courses/:courseId/announcements', authenticate, getAnnouncements);

// Update announcement (Instructor only)
router.put('/announcements/:id', authenticate, authorizeInstructor, updateAnnouncement);

// Delete announcement (Instructor only)
router.delete('/announcements/:id', authenticate, authorizeInstructor, deleteAnnouncement);

// ==================== ASSIGNMENT ROUTES ====================

// Create assignment (Instructor only)
router.post('/courses/:courseId/assignments', authenticate, authorizeInstructor, createAssignment);

// Get assignments (filtered by student groups)
router.get('/courses/:courseId/assignments', authenticate, getAssignments);

// Submit assignment (Student only)
router.post('/assignments/:id/submit', authenticate, submitAssignment);

// Get assignment submissions (Instructor only)
router.get('/assignments/:id/submissions', authenticate, authorizeInstructor, getAssignmentSubmissions);

// Grade assignment submission (Instructor only)
router.put('/assignments/:id/grade', authenticate, authorizeInstructor, gradeAssignment);

// ==================== MATERIAL ROUTES ====================

// Create material with file upload (Instructor only)
router.post('/courses/:courseId/materials', authenticate, authorizeInstructor, upload.single('file'), createMaterial);

// Get materials
router.get('/courses/:courseId/materials', authenticate, getMaterials);

// Download material with tracking
router.get('/materials/:id/download', authenticate, downloadMaterial);

// Delete material (Instructor only)
router.delete('/materials/:id', authenticate, authorizeInstructor, deleteMaterial);

// ==================== TRACKING ROUTES ====================

// Record content view (Student only)
router.post('/content/:contentId/view', authenticate, recordContentView);

// Get content tracking analytics (Instructor only)
router.get('/content/:contentId/tracking', authenticate, authorizeInstructor, getContentTracking);

module.exports = router;
