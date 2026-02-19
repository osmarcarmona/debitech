#!/bin/bash

set -e  # Exit on error

# Parse stage parameter (default: Dev)
STAGE="${1:-Dev}"

# Validate stage
if [[ ! "$STAGE" =~ ^(Dev|Staging|Prod)$ ]]; then
  echo "❌ Error: Invalid stage '$STAGE'"
  echo "Usage: ./deploy.sh [Dev|Staging|Prod]"
  echo "Example: ./deploy.sh Prod"
  exit 1
fi

echo "=========================================="
echo "Deploying Personal Loan Administration System"
echo "Stage: $STAGE"
echo "=========================================="
echo ""
echo "This script will deploy both backend and frontend."
echo "For individual deployments, use:"
echo "  - ./deploy-backend.sh $STAGE (backend only)"
echo "  - ./deploy-frontend.sh $STAGE (frontend only)"
echo ""
read -p "Continue with full deployment? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Deployment cancelled"
  exit 0
fi

# Convert stage to lowercase for S3 bucket naming
STAGE_LOWER=$(echo "$STAGE" | tr '[:upper:]' '[:lower:]')

echo ""
echo "=========================================="
echo "Step 1: Deploying Backend"
echo "=========================================="
echo ""

# Get AWS region and account ID
AWS_REGION=$(aws configure get region --profile debitech || echo "us-east-1")
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text --profile debitech)

# Create SAM deployment bucket if it doesn't exist
SAM_BUCKET="aws-sam-cli-managed-default-samclisourcebucket-${AWS_ACCOUNT_ID}"
echo "🔍 Checking SAM deployment bucket..."

if aws s3 ls "s3://${SAM_BUCKET}" --profile debitech 2>&1 | grep -q 'NoSuchBucket'; then
  echo "📦 Creating SAM deployment bucket: ${SAM_BUCKET}"
  aws s3 mb "s3://${SAM_BUCKET}" --region ${AWS_REGION} --profile debitech
  
  # Enable versioning for the bucket
  aws s3api put-bucket-versioning \
    --bucket ${SAM_BUCKET} \
    --versioning-configuration Status=Enabled \
    --profile debitech
  
  echo "✅ SAM deployment bucket created"
else
  echo "✅ SAM deployment bucket exists"
fi

echo ""

# Deploy Backend
cd backend
sam build
sam deploy --stack-name loan-admin-backend-$STAGE --parameter-overrides Stage=$STAGE --s3-bucket ${SAM_BUCKET} --profile debitech

echo ""
echo "✅ Backend deployed successfully!"
echo ""

# Get API URL from CloudFormation outputs
echo "🔍 Retrieving API URL..."
API_URL=$(aws cloudformation describe-stacks \
  --stack-name loan-admin-backend-$STAGE \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
  --output text \
  --profile debitech)

if [ -z "$API_URL" ]; then
  echo "❌ Error: Could not retrieve API URL"
  exit 1
fi

echo "API URL: $API_URL"
echo ""

echo "=========================================="
echo "Step 2: Deploying Frontend"
echo "=========================================="
echo ""

# Deploy Frontend Infrastructure
echo "📦 Deploying frontend infrastructure..."
cd ../infrastructure

# Check if stack already exists
if aws cloudformation describe-stacks --stack-name loan-admin-frontend-$STAGE --profile debitech &> /dev/null; then
  echo "Stack already exists, updating..."
  aws cloudformation update-stack \
    --stack-name loan-admin-frontend-$STAGE \
    --template-body file://frontend-template-simple.yaml \
    --parameters ParameterKey=Stage,ParameterValue=$STAGE_LOWER \
    --profile debitech || echo "No updates needed"
  
  aws cloudformation wait stack-update-complete \
    --stack-name loan-admin-frontend-$STAGE \
    --profile debitech 2>/dev/null || true
else
  echo "Creating new stack..."
  aws cloudformation create-stack \
    --stack-name loan-admin-frontend-$STAGE \
    --template-body file://frontend-template-simple.yaml \
    --parameters ParameterKey=Stage,ParameterValue=$STAGE_LOWER \
    --profile debitech
  
  echo "⏳ Waiting for stack creation..."
  aws cloudformation wait stack-create-complete \
    --stack-name loan-admin-frontend-$STAGE \
    --profile debitech
fi

echo ""
echo "✅ Frontend infrastructure deployed!"
echo ""

# Build and deploy frontend
echo "📦 Building frontend application..."
cd ../frontend
echo "REACT_APP_API_URL=$API_URL" > .env.production
npm install
npm run build

echo ""
echo "✅ Frontend built successfully!"
echo ""

# Get bucket name and website URL
echo "🔍 Retrieving S3 bucket information..."
BUCKET_NAME=$(aws cloudformation describe-stacks \
  --stack-name loan-admin-frontend-$STAGE \
  --query 'Stacks[0].Outputs[?OutputKey==`BucketName`].OutputValue' \
  --output text \
  --profile debitech)

WEBSITE_URL=$(aws cloudformation describe-stacks \
  --stack-name loan-admin-frontend-$STAGE \
  --query 'Stacks[0].Outputs[?OutputKey==`WebsiteURL`].OutputValue' \
  --output text \
  --profile debitech)

# Upload to S3
echo "📤 Uploading frontend to S3..."
aws s3 sync build/ s3://$BUCKET_NAME/ --delete --profile debitech

echo ""
echo "=========================================="
echo "✅ Deployment Complete!"
echo "=========================================="
echo ""
echo "🏷️  Stage: $STAGE"
echo "📦 Backend Stack: loan-admin-backend-$STAGE"
echo "📦 Frontend Stack: loan-admin-frontend-$STAGE"
echo "🌐 Frontend URL: $WEBSITE_URL"
echo "🔌 API URL: $API_URL"
echo ""
echo "📊 DynamoDB Tables:"
echo "   - Loans: Loans-$STAGE"
echo "   - Borrowers: Borrowers-$STAGE"
echo ""
echo "Next steps:"
echo "1. Visit the frontend URL to access the application"
echo "2. Create borrowers first, then create loans"
echo "3. Monitor CloudWatch logs for any issues"
echo ""
