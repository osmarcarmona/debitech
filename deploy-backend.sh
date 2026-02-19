#!/bin/bash

set -e  # Exit on error

# Parse stage parameter (default: Dev)
STAGE="${1:-Dev}"

# Validate stage
if [[ ! "$STAGE" =~ ^(Dev|Staging|Prod)$ ]]; then
  echo "❌ Error: Invalid stage '$STAGE'"
  echo "Usage: ./deploy-backend.sh [Dev|Staging|Prod]"
  echo "Example: ./deploy-backend.sh Prod"
  exit 1
fi

echo "=========================================="
echo "Deploying Backend - Stage: $STAGE"
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
echo "📦 Building and deploying backend..."
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

# Get DynamoDB table names
LOANS_TABLE=$(aws cloudformation describe-stacks \
  --stack-name loan-admin-backend-$STAGE \
  --query 'Stacks[0].Outputs[?OutputKey==`LoansTableName`].OutputValue' \
  --output text \
  --profile debitech)

BORROWERS_TABLE=$(aws cloudformation describe-stacks \
  --stack-name loan-admin-backend-$STAGE \
  --query 'Stacks[0].Outputs[?OutputKey==`BorrowersTableName`].OutputValue' \
  --output text \
  --profile debitech)

echo ""
echo "=========================================="
echo "✅ Backend Deployment Complete!"
echo "=========================================="
echo ""
echo "🏷️  Stage: $STAGE"
echo "� SAPI URL: $API_URL"
echo ""
echo "📊 DynamoDB Tables:"
echo "   - Loans: Loans-$STAGE"
echo "   - Borrowers: Borrowers-$STAGE"
echo ""
echo "💡 Next steps:"
echo "   1. Test the API endpoints"
echo "   2. Deploy frontend with: ./deploy-frontend.sh $STAGE"
echo "   3. Or update frontend .env with API URL and run locally"
echo ""
echo "📝 Save this API URL for frontend deployment!"
echo ""
