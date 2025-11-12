const csv = require('csv-parser');
const { Readable } = require('stream');
const Joi = require('joi');

/**
 * CSV Student Record Schema
 * Validates each row in the CSV file
 */
const csvStudentSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).required().messages({
    'string.empty': 'Name is required',
    'string.max': 'Name must not exceed 255 characters',
    'any.required': 'Name is required'
  }),
  email: Joi.string().email().required().messages({
    'string.email': 'Email must be a valid email address',
    'any.required': 'Email is required'
  }),
  student_code: Joi.string().trim().min(1).max(50).required().messages({
    'string.empty': 'Student code is required',
    'string.max': 'Student code must not exceed 50 characters',
    'any.required': 'Student code is required'
  }),
  phone: Joi.string().trim().max(20).allow('', null).optional(),
  password: Joi.string().min(8).optional().messages({
    'string.min': 'Password must be at least 8 characters'
  })
});

/**
 * Required CSV columns
 */
const REQUIRED_COLUMNS = ['name', 'email', 'student_code'];

/**
 * Optional CSV columns
 */
const OPTIONAL_COLUMNS = ['phone', 'password'];

/**
 * All valid CSV columns
 */
const ALL_COLUMNS = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS];

/**
 * Parse CSV content from buffer or string
 * @param {Buffer|string} csvContent - CSV file content
 * @returns {Promise<Array>} Array of parsed records
 */
const parseCSV = (csvContent) => {
  return new Promise((resolve, reject) => {
    const results = [];
    const errors = [];
    let rowNumber = 0;

    // Convert buffer to string if needed
    const csvString = Buffer.isBuffer(csvContent) 
      ? csvContent.toString('utf-8') 
      : csvContent;

    // Create readable stream from string
    const stream = Readable.from([csvString]);

    stream
      .pipe(csv({
        mapHeaders: ({ header }) => header.trim().toLowerCase(),
        skipLines: 0,
        strict: true
      }))
      .on('headers', (headers) => {
        // Validate that all required columns are present
        const missingColumns = REQUIRED_COLUMNS.filter(
          col => !headers.includes(col)
        );

        if (missingColumns.length > 0) {
          reject(new Error(
            `Missing required columns: ${missingColumns.join(', ')}`
          ));
        }

        // Check for unknown columns
        const unknownColumns = headers.filter(
          header => !ALL_COLUMNS.includes(header)
        );

        if (unknownColumns.length > 0) {
          console.warn(`Warning: Unknown columns will be ignored: ${unknownColumns.join(', ')}`);
        }
      })
      .on('data', (row) => {
        rowNumber++;
        
        // Filter out unknown columns
        const filteredRow = {};
        ALL_COLUMNS.forEach(col => {
          if (row[col] !== undefined) {
            filteredRow[col] = row[col];
          }
        });

        // Add row number for tracking
        filteredRow._rowNumber = rowNumber;
        
        results.push(filteredRow);
      })
      .on('error', (error) => {
        reject(new Error(`CSV parsing error: ${error.message}`));
      })
      .on('end', () => {
        if (results.length === 0) {
          reject(new Error('CSV file is empty or contains no valid data'));
        } else {
          resolve(results);
        }
      });
  });
};

/**
 * Validate a single CSV record
 * @param {Object} record - CSV record to validate
 * @param {number} rowNumber - Row number in CSV file
 * @returns {Object} Validation result with isValid flag and errors
 */
const validateRecord = (record, rowNumber) => {
  const { error, value } = csvStudentSchema.validate(record, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path[0],
      message: detail.message
    }));

    return {
      isValid: false,
      errors,
      rowNumber,
      data: record
    };
  }

  return {
    isValid: true,
    errors: [],
    rowNumber,
    data: value
  };
};

/**
 * Validate all CSV records
 * @param {Array} records - Array of CSV records
 * @returns {Object} Validation results with valid and invalid records
 */
const validateRecords = (records) => {
  const validRecords = [];
  const invalidRecords = [];

  records.forEach((record) => {
    const rowNumber = record._rowNumber || 0;
    
    // Remove internal fields before validation
    const { _rowNumber, ...cleanRecord } = record;
    
    const validationResult = validateRecord(cleanRecord, rowNumber);

    if (validationResult.isValid) {
      validRecords.push({
        ...validationResult.data,
        _rowNumber: rowNumber
      });
    } else {
      invalidRecords.push(validationResult);
    }
  });

  return {
    validRecords,
    invalidRecords,
    totalRecords: records.length,
    validCount: validRecords.length,
    invalidCount: invalidRecords.length
  };
};

/**
 * Parse and validate CSV file
 * @param {Buffer|string} csvContent - CSV file content
 * @returns {Promise<Object>} Parsed and validated records
 */
const parseAndValidateCSV = async (csvContent) => {
  try {
    // Parse CSV
    const records = await parseCSV(csvContent);

    // Validate all records
    const validationResults = validateRecords(records);

    return {
      success: true,
      ...validationResults
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      validRecords: [],
      invalidRecords: [],
      totalRecords: 0,
      validCount: 0,
      invalidCount: 0
    };
  }
};

/**
 * Check for duplicate emails within the CSV file
 * @param {Array} records - Array of valid records
 * @returns {Object} Duplicate detection results
 */
const detectInternalDuplicates = (records) => {
  const emailMap = new Map();
  const studentCodeMap = new Map();
  const duplicates = [];

  records.forEach((record) => {
    const email = record.email.toLowerCase();
    const studentCode = record.student_code;
    const rowNumber = record._rowNumber;

    // Check for duplicate email
    if (emailMap.has(email)) {
      duplicates.push({
        rowNumber,
        field: 'email',
        value: record.email,
        duplicateOf: emailMap.get(email),
        message: `Duplicate email found (first occurrence at row ${emailMap.get(email)})`
      });
    } else {
      emailMap.set(email, rowNumber);
    }

    // Check for duplicate student code
    if (studentCodeMap.has(studentCode)) {
      duplicates.push({
        rowNumber,
        field: 'student_code',
        value: studentCode,
        duplicateOf: studentCodeMap.get(studentCode),
        message: `Duplicate student code found (first occurrence at row ${studentCodeMap.get(studentCode)})`
      });
    } else {
      studentCodeMap.set(studentCode, rowNumber);
    }
  });

  return {
    hasDuplicates: duplicates.length > 0,
    duplicates,
    duplicateCount: duplicates.length
  };
};

module.exports = {
  parseCSV,
  validateRecord,
  validateRecords,
  parseAndValidateCSV,
  detectInternalDuplicates,
  REQUIRED_COLUMNS,
  OPTIONAL_COLUMNS,
  ALL_COLUMNS
};
