# Personal Loan Administration System

Serverless loan management system with React frontend and Python backend on AWS.

## Architecture

- **Frontend**: React app hosted on S3 + CloudFront
- **Backend**: Python Lambda functions with API Gateway
- **Database**: DynamoDB for loans and borrowers
- **Infrastructure**: CloudFormation templates

## Project Structure

```
debitech/
├── backend/
│   ├── src/
│   │   ├── handlers/      # Lambda function handlers
│   │   ├── services/      # DynamoDB service layer
│   │   ├── models/        # Data models
│   │   └── utils/         # Response utilities
│   ├── template.yaml      # SAM/CloudFormation template
│   ├── samconfig.toml     # SAM configuration
│   └── requirements.txt   # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/    # React components
│   │   └── services/      # API client
│   └── package.json
├── infrastructure/
│   └── frontend-template-simple.yaml
└── deploy scripts
```

## Prerequisites

- AWS CLI configured with credentials
- AWS SAM CLI installed
- Node.js 18+ and npm
- Python 3.11

## Quick Start

### Option 1: Deploy Everything

```bash
chmod +x deploy.sh
./deploy.sh
```

### Option 2: Deploy Separately (Recommended for Testing)

```bash
# 1. Deploy backend first
chmod +x deploy-backend.sh
./deploy-backend.sh

# 2. Deploy frontend (uses backend API URL automatically)
chmod +x deploy-frontend.sh
./deploy-frontend.sh

# Or provide API URL manually:
./deploy-frontend.sh https://your-api-url.amazonaws.com/prod/
```

## Local Development

### Backend Local Testing

```bash
cd backend
sam build
sam local start-api --port 3001
```

### Frontend Local Development

```bash
cd frontend

# Create .env.development with your API URL
echo "REACT_APP_API_URL=http://localhost:3001" > .env.development
# Or use deployed backend:
# echo "REACT_APP_API_URL=https://your-api.amazonaws.com/prod/" > .env.development

npm install
npm start
```

The app will open at `http://localhost:3000`

## API Endpoints

### Borrowers
- `POST /borrowers` - Create borrower
- `GET /borrowers` - List all borrowers
- `GET /borrowers/{id}` - Get borrower details

### Loans
- `POST /loans` - Create loan
- `GET /loans` - List all loans
- `GET /loans?borrowerId={id}` - Get loans by borrower
- `GET /loans?status={status}` - Get loans by status
- `GET /loans/{id}` - Get loan details
- `PUT /loans/{id}/status` - Update loan status

## Features

- Create and manage borrowers
- Create and manage loans
- Track loan status (pending, approved, active, paid, defaulted)
- Query loans by borrower or status
- Email uniqueness validation
- Credit score tracking
- Automatic timestamps
- Serverless and scalable
- Cost-optimized (< $1/month for low usage)

## Cost Optimization

The infrastructure is optimized for minimal cost:
- Lambda: 128 MB memory, ARM64 architecture
- DynamoDB: Pay-per-request billing, KEYS_ONLY GSI projection
- API Gateway: Regional endpoints, minimal logging
- S3: Static website hosting (no CloudFront)

See `COST_OPTIMIZATION.md` for detailed cost breakdown.

## Deployment Scripts

- `deploy.sh` - Deploy both backend and frontend
- `deploy-backend.sh` - Deploy backend only
- `deploy-frontend.sh` - Deploy frontend only
- `verify-setup.sh` - Verify project setup before deployment

## Updating the Application

### Update Backend

```bash
# Make changes to backend code
cd backend
sam build
sam deploy
```

### Update Frontend

```bash
# Make changes to frontend code
cd frontend
npm run build

# Get bucket name
BUCKET_NAME=$(aws cloudformation describe-stacks \
  --stack-name loan-admin-frontend \
  --query 'Stacks[0].Outputs[?OutputKey==`BucketName`].OutputValue' \
  --output text)

# Upload
aws s3 sync build/ s3://$BUCKET_NAME/ --delete
```

Or use the deployment script:
```bash
./deploy-frontend.sh
```

## Cleanup

To delete all resources:

```bash
# Delete frontend
BUCKET_NAME=$(aws cloudformation describe-stacks \
  --stack-name loan-admin-frontend \
  --query 'Stacks[0].Outputs[?OutputKey==`BucketName`].OutputValue' \
  --output text)

aws s3 rm s3://$BUCKET_NAME --recursive
aws cloudformation delete-stack --stack-name loan-admin-frontend

# Delete backend
aws cloudformation delete-stack --stack-name loan-admin-backend
```

## Troubleshooting

### CORS Errors
- Verify backend template has CORS configured
- Check API URL in frontend .env file
- Ensure API URL ends with `/prod/`

### 404 Errors
- Use S3 website URL (from WebsiteURL output), not bucket URL
- Check that files were uploaded to S3

### API Not Found
- Verify API Gateway URL is correct
- Check that backend deployed successfully
- Ensure stage name is included (`/prod/`)

### CloudWatch Logs Role Error
- API Gateway logging is disabled by default
- If you need logging, set up CloudWatch Logs role first

## Documentation

- `DEPLOYMENT_GUIDE.md` - Detailed deployment instructions
- `DYNAMODB_GUIDE.md` - DynamoDB schema and usage
- `COST_OPTIMIZATION.md` - Cost breakdown and optimization tips
- `LOCAL_DEVELOPMENT.md` - Local development setup

## License

MIT
