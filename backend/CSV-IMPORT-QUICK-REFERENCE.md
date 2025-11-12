# CSV Bulk Import - Quick Reference

## CSV Format

```csv
name,email,student_code,phone,password
John Doe,john@example.com,STU001,1234567890,password123
Jane Smith,jane@example.com,STU002,0987654321,password123
```

**Required**: name, email, student_code  
**Optional**: phone, password (defaults to "student123")

## API Endpoints

### Validate CSV (Preview)
```
POST /api/students/validate-csv
```
```json
{
  "csvData": "name,email,student_code\n..."
}
```

### Bulk Import
```
POST /api/students/bulk-import
```
```json
{
  "csvData": "name,email,student_code\n...",
  "strategy": "skip"
}
```

## Strategies

| Strategy | Description | Use Case |
|----------|-------------|----------|
| `skip` | Skip duplicates (default) | Safe import, avoid duplicates |
| `update` | Update existing records | Bulk update student info |
| `suffix` | Add email suffix (_1, _2) | Create similar accounts |

## Response Statuses

- `created` - New student created
- `updated` - Existing student updated
- `skipped` - Duplicate found, skipped
- `created_with_suffix` - Created with email suffix
- `error` - Failed to process
- `failed` - Processing error

## Validation Rules

- **Name**: 1-255 chars, required
- **Email**: Valid format, unique, required
- **Student Code**: 1-50 chars, unique, required
- **Phone**: Max 20 chars, optional
- **Password**: Min 8 chars, optional

## Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| Missing required columns | CSV missing name/email/student_code | Add missing columns |
| Internal duplicates | Duplicate emails/codes in CSV | Remove duplicates from CSV |
| Email already exists | Email in database | Use update or suffix strategy |
| Student code already exists | Code in database | Use update strategy or change code |

## Example Workflow

1. **Prepare CSV** → Create CSV with required columns
2. **Validate** → POST to `/validate-csv` to preview
3. **Review** → Check validation results and duplicates
4. **Import** → POST to `/bulk-import` with chosen strategy
5. **Verify** → Check import summary and details

## Quick Test

```bash
# Validate
curl -X POST http://localhost:3000/api/students/validate-csv \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"csvData":"name,email,student_code\nJohn,john@test.com,STU001"}'

# Import
curl -X POST http://localhost:3000/api/students/bulk-import \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"csvData":"name,email,student_code\nJohn,john@test.com,STU001","strategy":"skip"}'
```

## Files

- **Sample CSV**: `backend/sample-students.csv`
- **Full Documentation**: `backend/CSV-IMPORT-API.md`
- **Implementation Summary**: `backend/TASK-8-SUMMARY.md`
