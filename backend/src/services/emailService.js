const nodemailer = require('nodemailer');

/**
 * Create email transporter
 */
const createTransporter = () => {
  // Check if email is configured
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('Email service not configured. Email notifications will be skipped.');
    return null;
  }

  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

/**
 * Send notification email
 * @param {String} to - Recipient email
 * @param {String} name - Recipient name
 * @param {String} title - Notification title
 * @param {String} body - Notification body
 * @param {Object} data - Additional data
 * @returns {Promise<Object>} Email send result
 */
const sendNotificationEmail = async (to, name, title, body, data = {}) => {
  try {
    const transporter = createTransporter();
    
    if (!transporter) {
      console.log('Email service not configured, skipping email notification');
      return null;
    }

    // Build email HTML
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background-color: #4CAF50;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 5px 5px 0 0;
          }
          .content {
            background-color: #f9f9f9;
            padding: 20px;
            border: 1px solid #ddd;
            border-radius: 0 0 5px 5px;
          }
          .button {
            display: inline-block;
            padding: 10px 20px;
            background-color: #4CAF50;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin-top: 15px;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            color: #777;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>E-Learning Platform</h2>
          </div>
          <div class="content">
            <p>Hi ${name},</p>
            <h3>${title}</h3>
            <p>${body}</p>
            ${data.link ? `<a href="${data.link}" class="button">View Details</a>` : ''}
          </div>
          <div class="footer">
            <p>This is an automated email from E-Learning Platform. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email
    const info = await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME || 'E-Learning Platform'}" <${process.env.EMAIL_USER}>`,
      to,
      subject: title,
      html
    });

    console.log('Email sent successfully:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

/**
 * Send assignment notification email
 * @param {String} to - Recipient email
 * @param {String} name - Recipient name
 * @param {String} assignmentTitle - Assignment title
 * @param {Date} dueDate - Assignment due date
 * @param {String} courseTitle - Course title
 * @returns {Promise<Object>} Email send result
 */
const sendAssignmentNotification = async (to, name, assignmentTitle, dueDate, courseTitle) => {
  const title = 'New Assignment Posted';
  const body = `A new assignment "${assignmentTitle}" has been posted in ${courseTitle}. Due date: ${new Date(dueDate).toLocaleDateString()}.`;
  
  return sendNotificationEmail(to, name, title, body);
};

/**
 * Send grade notification email
 * @param {String} to - Recipient email
 * @param {String} name - Recipient name
 * @param {String} assignmentTitle - Assignment title
 * @param {Number} grade - Grade received
 * @param {Number} maxGrade - Maximum grade
 * @returns {Promise<Object>} Email send result
 */
const sendGradeNotification = async (to, name, assignmentTitle, grade, maxGrade) => {
  const title = 'Assignment Graded';
  const body = `Your assignment "${assignmentTitle}" has been graded. You received ${grade} out of ${maxGrade} points.`;
  
  return sendNotificationEmail(to, name, title, body);
};

/**
 * Send announcement notification email
 * @param {String} to - Recipient email
 * @param {String} name - Recipient name
 * @param {String} announcementTitle - Announcement title
 * @param {String} courseTitle - Course title
 * @returns {Promise<Object>} Email send result
 */
const sendAnnouncementNotification = async (to, name, announcementTitle, courseTitle) => {
  const title = 'New Announcement';
  const body = `A new announcement "${announcementTitle}" has been posted in ${courseTitle}.`;
  
  return sendNotificationEmail(to, name, title, body);
};

/**
 * Send quiz notification email
 * @param {String} to - Recipient email
 * @param {String} name - Recipient name
 * @param {String} quizTitle - Quiz title
 * @param {String} courseTitle - Course title
 * @returns {Promise<Object>} Email send result
 */
const sendQuizNotification = async (to, name, quizTitle, courseTitle) => {
  const title = 'New Quiz Available';
  const body = `A new quiz "${quizTitle}" is now available in ${courseTitle}.`;
  
  return sendNotificationEmail(to, name, title, body);
};

module.exports = {
  sendNotificationEmail,
  sendAssignmentNotification,
  sendGradeNotification,
  sendAnnouncementNotification,
  sendQuizNotification
};
