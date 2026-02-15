# DynamoDB Integration Guide

## Overview

The system uses Amazon DynamoDB as the database with the following features:

- **Two Tables**: Loans and Borrowers
- **Serverless**: Pay-per-request billing (no capacity planning needed)
- **Encrypted**: Server-side encryption enabled
- **Backup**: Point-in-time recovery enabled
- **Indexed**: Global Secondary Indexes for efficient queries

## Table Structure

### Loans Table

**Primary Key**: `loanId` (String)

**Attributes**:
- `loanId`: Unique identifier (UUID)
- `borrowerId`: Reference to borrower
- `amount`: Loan amount (Decimal)
- `interestRate`: Interest rate percentage (Decimal)
- `termMonths`: Loan term in months (Number)
- `status`: pending | approved | active | paid | defaulted
- `createdAt`: ISO timestamp
- `updatedAt`: ISO timestamp
- `approvedAt`: ISO timestamp (optional)
- `disbursedAt`: ISO timestamp (optional)

**Global Secondary Indexes**:
1. `BorrowerIdIndex`: Query loans by borrower
2. `StatusIndex`: Query loans by status

### Borrowers Table

**Primary Key**: `borrowerId` (String)

**Attributes**:
- `borrowerId`: Unique identifier (UUID)
- `name`: Borrower full name
- `email`: Email address (unique)
- `phone`: Phone number
- `creditScore`: Credit score (Number, optional)
- `status`: active | inactive
- `createdAt`: ISO timestamp
- `updatedAt`: ISO timestamp

**Global Secondary Indexes**:
1. `EmailIndex`: Query borrower by email

## API Query Examples

### Get all loans
```bash
GET /loans
```

### Get loans by borrower
```bash
GET /loans?borrowerId=abc-123
```

### Get loans by status
```bash
GET /loans?status=pending
```

### Get specific loan
```bash
GET /loans/{loanId}
```

### Create loan
```bash
POST /loans
{
  "borrowerId": "abc-123",
  "amount": 10000,
  "interestRate": 5.5,
  "termMonths": 36
}
```

### Update loan status
```bash
PUT /loans/{loanId}/status
{
  "status": "approved"
}
```

## Service Layer

The `DynamoDBService` class provides clean abstractions:

```python
from services.dynamodb_service import DynamoDBService

db = DynamoDBService()

# Create
loan = db.create_loan(loan_data)

# Read
loan = db.get_loan(loan_id)
loans = db.get_all_loans()
loans = db.get_loans_by_borrower(borrower_id)
loans = db.get_loans_by_status('pending')

# Update
db.update_loan_status(loan_id, 'approved')
db.update_loan(loan_id, {'amount': Decimal('15000')})
```

## Data Protection

- **Encryption**: All data encrypted at rest using AWS KMS
- **Retention**: Tables configured with `DeletionPolicy: Retain` to prevent accidental deletion
- **Point-in-Time Recovery**: Enabled for data recovery up to 35 days

## Cost Optimization

- **Pay-per-request billing**: Only pay for actual reads/writes
- **No idle costs**: No charges when not in use
- **Efficient queries**: GSIs enable fast lookups without full table scans

## Local Testing

To test DynamoDB locally:

```bash
# Install DynamoDB Local
docker run -p 8000:8000 amazon/dynamodb-local

# Update environment variables
export LOANS_TABLE=local-loans
export BORROWERS_TABLE=local-borrowers
export AWS_ENDPOINT_URL=http://localhost:8000
```

## Monitoring

View DynamoDB metrics in AWS Console:
- Read/Write capacity usage
- Throttled requests
- Table size
- Item count

## Best Practices

1. Use batch operations for multiple items
2. Implement pagination for large result sets
3. Use GSIs instead of scans when possible
4. Handle eventual consistency for GSI queries
5. Implement retry logic with exponential backoff
