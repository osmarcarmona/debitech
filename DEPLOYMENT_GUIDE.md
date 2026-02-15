# Deployment Guide

Complete guide for deploying the Personal Loan Administration System to AWS.

## Quick Start

The system supports three deployment stages: Dev, Staging, and Prod.

### Deploy Everything (Recommended)

```bash
# Deploy to Dev (default)
./deploy.sh

# Deploy to Prod
./deploy.sh Prod

# Deploy to Staging
./deploy.sh Staging
```

### Deploy Backend Only

```bash
# Deploy to Dev (default)
./deploy-backend.sh

# Deploy to Prod
./deploy-backend.sh Prod

# Deploy to Staging
./deploy-backend.sh Staging
```

### Deploy Frontend Only

```bash
# Deploy to Dev (auto-detects API URL from backend)
./deploy-frontend.sh

# Deploy to Prod
./deploy-frontend.sh Prod

# Deploy to Staging with custom API URL
./deploy-frontend.sh Staging https://abc123.execute-api.us-east-1.amazonaws.com/Staging/
```

## Stage-Based Deployment

### Understanding Stages

Each stage creates isolated resources with stage-specific naming:

**Dev Stage:**
- DynamoDB: `loan-admin-backend-Loans-Dev`
- S3: `loan-admin-frontend-frontend-Dev-{AccountId}`
- API: `https://xxx.execute-api.us-east-1.amazonaws.com/Dev/`

**Staging Stage:**
- DynamoDB: `loan-admin-backend-Loans-Staging`
- S3: `loan-admin-frontend-frontend-Staging-{AccountId}`
- API: `https://xxx.execute-api.us-east-1.amazonaws.com/Staging/`

**Prod Stage:**
- DynamoDB: `loan-admin-backend-Loans-Prod`
- S3: `loan-admin-frontend-frontend-Prod-{AccountId}`
- API: `https://xxx.execute-api.us-east-1.amazonaws.com/Prod/`

### Deployment Workflow Examples

#### Example 1: Deploy Dev Environment

```bash
# 1. Deploy backend to Dev
./deploy-backend.sh Dev

# Output will show:
# API URL: https://abc123.execute-api.us-east-1.amazonaws.com/Dev/
# Tables: loan-admin-backend-Loans-Dev, loan-admin-backend-Borrowers-Dev

# 2. Deploy frontend to Dev (auto-detects API URL)
./deploy-frontend.sh Dev

# Output will show:
# Frontend URL: http://loan-admin-frontend-frontend-Dev-123456.s3-website-us-east-1.amazonaws.com
```

#### Example 2: Deploy Prod Environment

```bash
# Deploy everything to Prod in one command
./deploy.sh Prod

# Or deploy separately:
./deploy-backend.sh Prod
./deploy-frontend.sh Prod
```

#### Example 3: Update Only Frontend

```bash
# Make changes to frontend code
# Then deploy only frontend to Dev
./deploy-frontend.sh Dev

# Or to Prod
./deploy-frontend.sh Prod
```

#### Example 4: Multiple Environments

```bash
# Deploy Dev environment
./deploy.sh Dev

# Deploy Staging environment (separate resources)
./deploy.sh Staging

# Deploy Prod environment (separate resources)
./deploy.sh Prod

# Now you have 3 independent environments running simultaneously
```

## Manual Deployment (Step-by-Step)

### Step 1: Deploy Backend

```bash
cd backend
sam build
sam deploy --parameter-overrides Stage=Prod
```

When prompted:
- Stack Name: `loan-admin-backend`
- AWS Region: `us-east-1` (or your preferred region)
- Confirm changes: `Y`
- Allow SAM CLI IAM role creation: `Y`
- Save arguments to config: `Y`

Copy the `ApiUrl` from the outputs.

### Step 2: Deploy Frontend Infrastructure

```bash
cd infrastructure
aws cloudformation create-stack \
  --stack-name loan-admin-frontend \
  --template-body file://frontend-template-simple.yaml \
  --parameters ParameterKey=Stage,ParameterValue=Prod

# Wait for completion
aws cloudformation wait stack-create-complete \
  --stack-name loan-admin-frontend
```

### Step 3: Build and Upload Frontend

```bash
cd ../frontend

# Set your API URL (replace with your actual API URL)
echo "REACT_APP_API_URL=https://YOUR-API-URL/Prod/" > .env.production

# Build
npm install
npm run build

# Get bucket name
BUCKET_NAME=$(aws cloudformation describe-stacks \
  --stack-name loan-admin-frontend \
  --query 'Stacks[0].Outputs[?OutputKey==`BucketName`].OutputValue' \
  --output text)

# Upload
aws s3 sync build/ s3://$BUCKET_NAME/ --delete
```

### Step 4: Get Your Website URL

```bash
aws cloudformation describe-stacks \
  --stack-name loan-admin-frontend \
  --query 'Stacks[0].Outputs[?OutputKey==`WebsiteURL`].OutputValue' \
  --output text
```

Visit this URL in your browser!

## Updating Deployments

### Update Backend

```bash
# Make changes to backend code
./deploy-backend.sh Dev

# Or manually:
cd backend
sam build
sam deploy --parameter-overrides Stage=Dev
```

### Update Frontend

```bash
# Make changes to frontend code
./deploy-frontend.sh Dev

# Or manually:
cd frontend
npm run build
BUCKET_NAME=$(aws cloudformation describe-stacks \
  --stack-name loan-admin-frontend \
  --query 'Stacks[0].Outputs[?OutputKey==`BucketName`].OutputValue' \
  --output text)
aws s3 sync build/ s3://$BUCKET_NAME/ --delete
```

### Update Both

```bash
./deploy.sh Dev
```

## Environment-Specific Configuration

### Backend Configuration

Edit `backend/samconfig.toml` to change default stage:

```toml
[default.deploy.parameters]
parameter_overrides = "Stage=Dev"  # Change to Dev, Staging, or Prod
```

### Frontend Configuration

The frontend automatically uses the API URL from the backend stack. To override:

```bash
./deploy-frontend.sh Dev https://custom-api-url.amazonaws.com/Dev/
```

## Cleanup

### Delete Specific Stage

```bash
# Delete Dev environment
BUCKET_NAME=$(aws cloudformation describe-stacks \
  --stack-name loan-admin-frontend \
  --query 'Stacks[0].Outputs[?OutputKey==`BucketName`].OutputValue' \
  --output text)

aws s3 rm s3://$BUCKET_NAME --recursive
aws cloudformation delete-stack --stack-name loan-admin-frontend
aws cloudformation delete-stack --stack-name loan-admin-backend
```

### Delete All Stages

```bash
# List all stacks
aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE

# Delete each stack
for stage in Dev Staging Prod; do
  # Get bucket name for this stage
  BUCKET_NAME=$(aws cloudformation describe-stacks \
    --stack-name loan-admin-frontend \
    --query 'Stacks[0].Outputs[?OutputKey==`BucketName`].OutputValue' \
    --output text 2>/dev/null)
  
  if [ ! -z "$BUCKET_NAME" ]; then
    aws s3 rm s3://$BUCKET_NAME --recursive
    aws cloudformation delete-stack --stack-name loan-admin-frontend
  fi
  
  aws cloudformation delete-stack --stack-name loan-admin-backend
done
```

## Troubleshooting

### CORS Errors
If you see CORS errors in the browser console:
1. Verify backend template has CORS configured (already included)
2. Check API URL in `.env.production` is correct
3. Ensure API URL ends with the stage name (e.g., `/Dev/`, `/Prod/`)

### 404 Errors
- Use S3 website URL (from WebsiteURL output), not the bucket URL
- Check that files were uploaded to S3
- Verify the bucket has public read access

### API Not Found
- Verify API Gateway URL is correct
- Ensure stage name is included in URL
- Check that backend deployed successfully

### Stage Mismatch
If frontend can't connect to backend:
```bash
# Check backend stage
aws cloudformation describe-stacks \
  --stack-name loan-admin-backend \
  --query 'Stacks[0].Outputs[?OutputKey==`Stage`].OutputValue' \
  --output text

# Check frontend stage
aws cloudformation describe-stacks \
  --stack-name loan-admin-frontend \
  --query 'Stacks[0].Outputs[?OutputKey==`Stage`].OutputValue' \
  --output text

# Redeploy with matching stages
./deploy.sh Dev  # or Staging, or Prod
```

### CloudWatch Logs

View Lambda logs:
```bash
# List log groups
aws logs describe-log-groups --log-group-name-prefix /aws/lambda/loan-admin-backend

# Tail logs
aws logs tail /aws/lambda/loan-admin-backend-Dev --follow
```

### DynamoDB Data

View table data:
```bash
# List items in Loans table
aws dynamodb scan --table-name loan-admin-backend-Loans-Dev

# List items in Borrowers table
aws dynamodb scan --table-name loan-admin-backend-Borrowers-Dev
```

## Best Practices

1. **Use Dev for development**: Test all changes in Dev before promoting
2. **Use Staging for testing**: Run integration tests in Staging
3. **Use Prod for production**: Only deploy tested code to Prod
4. **Tag resources**: All resources are automatically tagged with Stage
5. **Monitor costs**: Each stage incurs separate costs
6. **Clean up unused stages**: Delete Dev/Staging when not needed
7. **Use version control**: Commit changes before deploying
8. **Document changes**: Update README when adding features

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy to AWS

on:
  push:
    branches:
      - main
      - develop

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v1
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Deploy to Dev
        if: github.ref == 'refs/heads/develop'
        run: ./deploy.sh Dev
      
      - name: Deploy to Prod
        if: github.ref == 'refs/heads/main'
        run: ./deploy.sh Prod
```

## Additional Resources

- [AWS SAM Documentation](https://docs.aws.amazon.com/serverless-application-model/)
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
- [API Gateway Documentation](https://docs.aws.amazon.com/apigateway/)
- [S3 Static Website Hosting](https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteHosting.html)
