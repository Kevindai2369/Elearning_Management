const bcrypt = require('bcrypt');
const { sequelize } = require('../config/database');
const { User, Student } = require('../models');
const { Op } = require('sequelize');

/**
 * Duplicate handling strategies
 */
const DUPLICATE_STRATEGIES = {
  SKIP: 'skip',           // Skip duplicate records
  UPDATE: 'update',       // Update existing records
  SUFFIX: 'suffix'        // Create new record with email suffix
};

/**
 * Batch size for processing records
 */
const BATCH_SIZE = 100;

/**
 * Detect duplicates in database by email
 * @param {Array} records - Array of records to check
 * @returns {Promise<Object>} Map of emails to existing users/students
 */
const detectDatabaseDuplicates = async (records) => {
  const emails = records.map(r => r.email.toLowerCase());
  const studentCodes = records.map(r => r.student_code);

  // Find existing users by email
  const existingUsers = await User.findAll({
    where: {
      email: { [Op.in]: emails }
    },
    include: [
      {
        model: Student,
        as: 'student',
        required: false
      }
    ]
  });

  // Find existing students by student code
  const existingStudents = await Student.findAll({
    where: {
      student_code: { [Op.in]: studentCodes }
    },
    include: [
      {
        model: User,
        as: 'user',
        required: true
      }
    ]
  });

  // Create maps for quick lookup
  const emailMap = new Map();
  existingUsers.forEach(user => {
    emailMap.set(user.email.toLowerCase(), {
      user,
      student: user.student
    });
  });

  const studentCodeMap = new Map();
  existingStudents.forEach(student => {
    studentCodeMap.set(student.student_code, {
      user: student.user,
      student
    });
  });

  return {
    emailMap,
    studentCodeMap
  };
};

/**
 * Generate unique email with suffix
 * @param {string} email - Original email
 * @param {number} suffix - Suffix number
 * @returns {string} Email with suffix
 */
const generateEmailWithSuffix = (email, suffix) => {
  const [localPart, domain] = email.split('@');
  return `${localPart}_${suffix}@${domain}`;
};

/**
 * Find available email with suffix
 * @param {string} originalEmail - Original email
 * @returns {Promise<string>} Available email with suffix
 */
const findAvailableEmail = async (originalEmail) => {
  let suffix = 1;
  let email = generateEmailWithSuffix(originalEmail, suffix);

  while (true) {
    const existing = await User.findOne({
      where: { email }
    });

    if (!existing) {
      return email;
    }

    suffix++;
    email = generateEmailWithSuffix(originalEmail, suffix);

    // Safety limit
    if (suffix > 1000) {
      throw new Error(`Could not find available email for ${originalEmail}`);
    }
  }
};

/**
 * Process a single record based on duplicate strategy
 * @param {Object} record - Record to process
 * @param {Object} duplicateInfo - Duplicate detection info
 * @param {string} strategy - Duplicate handling strategy
 * @param {Object} transaction - Database transaction
 * @returns {Promise<Object>} Processing result
 */
const processRecord = async (record, duplicateInfo, strategy, transaction) => {
  const { emailMap, studentCodeMap } = duplicateInfo;
  const email = record.email.toLowerCase();
  const studentCode = record.student_code;

  const existingByEmail = emailMap.get(email);
  const existingByCode = studentCodeMap.get(studentCode);

  // Check if record is a duplicate
  const isDuplicateEmail = !!existingByEmail;
  const isDuplicateCode = !!existingByCode;

  try {
    // Case 1: No duplicates - create new record
    if (!isDuplicateEmail && !isDuplicateCode) {
      const password = record.password || 'student123';
      const password_hash = await bcrypt.hash(password, 10);

      const user = await User.create({
        email: record.email,
        name: record.name,
        password_hash,
        role: 'student'
      }, { transaction });

      const student = await Student.create({
        user_id: user.id,
        student_code: record.student_code,
        phone: record.phone || null
      }, { transaction });

      return {
        status: 'created',
        record: {
          email: user.email,
          name: user.name,
          student_code: student.student_code,
          phone: student.phone
        },
        message: 'Student created successfully'
      };
    }

    // Case 2: Duplicate found - apply strategy
    if (isDuplicateEmail || isDuplicateCode) {
      switch (strategy) {
        case DUPLICATE_STRATEGIES.SKIP:
          return {
            status: 'skipped',
            record: {
              email: record.email,
              student_code: record.student_code
            },
            message: isDuplicateEmail 
              ? 'Email already exists' 
              : 'Student code already exists'
          };

        case DUPLICATE_STRATEGIES.UPDATE:
          // Only update if both email and student code match the same record
          if (isDuplicateEmail && existingByEmail.student) {
            const user = existingByEmail.user;
            const student = existingByEmail.student;

            // Update user fields
            await user.update({
              name: record.name
            }, { transaction });

            // Update student fields
            await student.update({
              phone: record.phone || student.phone
            }, { transaction });

            return {
              status: 'updated',
              record: {
                email: user.email,
                name: user.name,
                student_code: student.student_code,
                phone: student.phone
              },
              message: 'Student updated successfully'
            };
          } else {
            // Cannot update if email and student code don't match
            return {
              status: 'skipped',
              record: {
                email: record.email,
                student_code: record.student_code
              },
              message: 'Email and student code mismatch - cannot update'
            };
          }

        case DUPLICATE_STRATEGIES.SUFFIX:
          // Only apply suffix to email if email is duplicate
          if (isDuplicateEmail) {
            const newEmail = await findAvailableEmail(record.email);
            const password = record.password || 'student123';
            const password_hash = await bcrypt.hash(password, 10);

            const user = await User.create({
              email: newEmail,
              name: record.name,
              password_hash,
              role: 'student'
            }, { transaction });

            // For student code, if duplicate, skip this record
            if (isDuplicateCode) {
              // Rollback user creation
              await user.destroy({ transaction });
              return {
                status: 'skipped',
                record: {
                  email: record.email,
                  student_code: record.student_code
                },
                message: 'Student code already exists - cannot create with suffix'
              };
            }

            const student = await Student.create({
              user_id: user.id,
              student_code: record.student_code,
              phone: record.phone || null
            }, { transaction });

            return {
              status: 'created_with_suffix',
              record: {
                email: user.email,
                original_email: record.email,
                name: user.name,
                student_code: student.student_code,
                phone: student.phone
              },
              message: `Student created with email suffix: ${newEmail}`
            };
          } else if (isDuplicateCode) {
            // Student code is duplicate but email is not
            return {
              status: 'skipped',
              record: {
                email: record.email,
                student_code: record.student_code
              },
              message: 'Student code already exists'
            };
          }
          break;

        default:
          return {
            status: 'error',
            record: {
              email: record.email,
              student_code: record.student_code
            },
            message: 'Invalid duplicate strategy'
          };
      }
    }
  } catch (error) {
    return {
      status: 'error',
      record: {
        email: record.email,
        student_code: record.student_code
      },
      message: error.message
    };
  }
};

/**
 * Process records in batches
 * @param {Array} records - Array of records to process
 * @param {string} strategy - Duplicate handling strategy
 * @returns {Promise<Object>} Import results
 */
const processBulkImport = async (records, strategy = DUPLICATE_STRATEGIES.SKIP) => {
  const results = {
    total: records.length,
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    details: []
  };

  // Validate strategy
  if (!Object.values(DUPLICATE_STRATEGIES).includes(strategy)) {
    throw new Error(`Invalid strategy: ${strategy}. Must be one of: ${Object.values(DUPLICATE_STRATEGIES).join(', ')}`);
  }

  // Process in batches
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    
    // Detect duplicates for this batch at the start
    let duplicateInfo = await detectDatabaseDuplicates(batch);

    // Process each record in the batch
    for (let j = 0; j < batch.length; j++) {
      const record = batch[j];
      const transaction = await sequelize.transaction();

      try {
        const result = await processRecord(record, duplicateInfo, strategy, transaction);
        
        await transaction.commit();

        // Update counters
        if (result.status === 'created' || result.status === 'created_with_suffix') {
          results.created++;
          
          // Refresh duplicate info to include newly created record
          // This ensures subsequent records in the batch can detect the newly created record as a duplicate
          const remainingRecords = batch.slice(j + 1);
          if (remainingRecords.length > 0) {
            duplicateInfo = await detectDatabaseDuplicates(remainingRecords);
          }
        } else if (result.status === 'updated') {
          results.updated++;
        } else if (result.status === 'skipped') {
          results.skipped++;
        } else if (result.status === 'error') {
          results.failed++;
        }

        results.details.push({
          rowNumber: record._rowNumber,
          ...result
        });
      } catch (error) {
        await transaction.rollback();
        
        results.failed++;
        results.details.push({
          rowNumber: record._rowNumber,
          status: 'error',
          record: {
            email: record.email,
            student_code: record.student_code
          },
          message: error.message
        });
      }
    }
  }

  return results;
};

module.exports = {
  DUPLICATE_STRATEGIES,
  BATCH_SIZE,
  detectDatabaseDuplicates,
  processRecord,
  processBulkImport,
  generateEmailWithSuffix,
  findAvailableEmail
};
