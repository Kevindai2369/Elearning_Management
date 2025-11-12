# CSV Bulk Import API Documentation

## Overview

The CSV Bulk Import feature allows instructors to import multiple students at once from a CSV file. The system provides validation, duplicate detection, and flexible duplicate handling strategies.

## Features

- **CSV Parsing**: Parse CSV files with automatic column detection
- **Validation**: Validate each record against required fields and data types
- **Duplicate Detection**: 
  - Internal duplicates (within the CSV file)
  - Database duplicates (existing records)
- **Smart Import Strategies**:
  - `skip`: Skip duplicate records
  - `update`: Update existing records
  - `suffix`: Create new records with email suffix (e.g., john@example.com → john_1@example.com)
- **Batch Processing**: Process records in batches of 100 for optimal performance

## CSV Format

### Required Columns
- `name`: Student's full name (1-255 characters)
- `email`: Valid email address (unique)
- `student_code`: Student code (1-50 characters, unique)

### Optional Columns
- `phone`: Phone number (max 20 characters)
- `password`: Password (min 8 characters, defaults to "student123")

### Example CSV

```csv
name,email,student_code,phone,password
John Doe,john.doe@example.com,STU001,1234567890,password123
Jane Smith,jane.smith@example.com,STU002,0987654321,password123
Bob Johnson,bob.johnson@example.com,STU003,5551234567,password123
```

## API Endpoints

### 1. Validate CSV (Preview)

**Endpoint**: `POST /api/students/validate-csv`

**Description**: Validates CSV data and returns a preview with validation results and duplicate detection.

**Authentication**: Required (Instructor only)

**Request Body**:
```json
{
  "csvData": "name,email,student_code,phone\nJohn Doe,john@example.com,STU001,1234567890"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalRecords": 5,
      "validRecords": 5,
      "invalidRecords": 0,
      "internalDuplicates": 0,
      "databaseDuplicates": 2
    },
    "validRecords": [
      {
        "rowNumber": 1,
        "data": {
          "name": "John Doe",
          "email": "john@example.com",
          "student_code": "STU001",
          "phone": "1234567890"
        },
        "duplicates": {
          "email": true,
          "student_code": false,
          "hasAnyDuplicate": true
        }
      }
    ],
    "invalidRecords": [],
    "internalDuplicates": []
  },
  "message": "CSV validation completed"
}
```

**Error Responses**:

- **400 Bad Request**: Invalid CSV format or missing required columns
```json
{
  "success": false,
  "error": {
    "code": "CSV_PARSE_ERROR",
    "message": "Missing required columns: student_code"
  }
}
```

### 2. Bulk Import

**Endpoint**: `POST /api/students/bulk-import`

**Description**: Imports students from CSV data with specified duplicate handling strategy.

**Authentication**: Required (Instructor only)

**Request Body**:
```json
{
  "csvData": "name,email,student_code,phone\nJohn Doe,john@example.com,STU001,1234567890",
  "strategy": "skip"
}
```

**Parameters**:
- `csvData` (required): CSV content as string
- `strategy` (optional): Duplicate handling strategy
  - `skip` (default): Skip duplicate records
  - `update`: Update existing records
  - `suffix`: Create new records with email suffix

**Response**:
```json
{
  "success": true,
  "data": {
    "summary": {
      "total": 5,
      "created": 3,
      "updated": 0,
      "skipped": 2,
      "failed": 0,
      "strategy": "skip"
    },
    "details": [
      {
        "rowNumber": 1,
        "status": "created",
        "record": {
          "email": "john@example.com",
          "name": "John Doe",
          "student_code": "STU001",
          "phone": "1234567890"
        },
        "message": "Student created successfully"
      },
      {
        "rowNumber": 2,
        "status": "skipped",
        "record": {
          "email": "jane@example.com",
          "student_code": "STU002"
        },
        "message": "Email already exists"
      }
    ]
  },
  "message": "Bulk import completed: 3 created, 0 updated, 2 skipped, 0 failed"
}
```

**Error Responses**:

- **400 Bad Request**: Invalid CSV or internal duplicates
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_DUPLICATES",
    "message": "CSV contains internal duplicates. Please remove duplicate entries and try again.",
    "details": {
      "duplicates": [
        {
          "rowNumber": 3,
          "field": "email",
          "value": "john@example.com",
          "duplicateOf": 1,
          "message": "Duplicate email found (first occurrence at row 1)"
        }
      ]
    }
  }
}
```

## Duplicate Handling Strategies

### Skip Strategy (Default)

Skips any records that have duplicate email or student code in the database.

**Use Case**: When you want to avoid creating duplicate records.

**Example**:
```json
{
  "csvData": "...",
  "strategy": "skip"
}
```

**Result**: Existing records remain unchanged, new records are created.

### Update Strategy

Updates existing records if both email and student code match the same record.

**Use Case**: When you want to update student information in bulk.

**Example**:
```json
{
  "csvData": "...",
  "strategy": "update"
}
```

**Result**: 
- Matching records are updated (name, phone)
- New records are created
- Mismatched records (email exists but different student code) are skipped

### Suffix Strategy

Creates new records with email suffix if email is duplicate.

**Use Case**: When you want to create new accounts even if email is similar.

**Example**:
```json
{
  "csvData": "...",
  "strategy": "suffix"
}
```

**Result**:
- If email exists: Creates new record with email suffix (e.g., john_1@example.com)
- If student code exists: Skips the record
- New records are created normally

## Validation Rules

### Name
- Required
- 1-255 characters
- Cannot be empty

### Email
- Required
- Must be valid email format
- Must be unique in database

### Student Code
- Required
- 1-50 characters
- Must be unique in database
- Cannot be empty

### Phone
- Optional
- Max 20 characters

### Password
- Optional
- Min 8 characters if provided
- Defaults to "student123" if not provided

## Error Handling

### CSV Parse Errors
- Missing required columns
- Invalid CSV format
- Empty CSV file

### Validation Errors
- Invalid email format
- Empty required fields
- Field length violations

### Internal Duplicates
- Duplicate emails within CSV
- Duplicate student codes within CSV
- Must be resolved before import

### Database Errors
- Connection errors
- Transaction failures
- Constraint violations

## Best Practices

1. **Validate First**: Always use `/validate-csv` endpoint before importing to preview results
2. **Remove Internal Duplicates**: Ensure CSV has no duplicate emails or student codes
3. **Choose Strategy Carefully**: 
   - Use `skip` for safety
   - Use `update` for bulk updates
   - Use `suffix` only when necessary
4. **Batch Size**: System processes 100 records per batch automatically
5. **Password Security**: Provide strong passwords in CSV or change default password after import

## Example Workflow

1. **Prepare CSV file** with student data
2. **Validate CSV**:
   ```bash
   POST /api/students/validate-csv
   {
     "csvData": "name,email,student_code\n..."
   }
   ```
3. **Review validation results**:
   - Check for invalid records
   - Check for duplicates
   - Decide on strategy
4. **Import students**:
   ```bash
   POST /api/students/bulk-import
   {
     "csvData": "name,email,student_code\n...",
     "strategy": "skip"
   }
   ```
5. **Review import results**:
   - Check created count
   - Check skipped/failed records
   - Handle any errors

## Testing

A sample CSV file is provided at `backend/sample-students.csv` for testing purposes.

To test the CSV parsing logic without database:
```bash
node backend/test-csv-import.js
```

## Notes

- All email addresses are stored in lowercase
- Default password is "student123" if not provided
- Student accounts are created with role "student"
- Transactions ensure data consistency
- Failed records don't affect successful imports
