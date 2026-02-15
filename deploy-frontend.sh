#!/bin/bash

set -e  # Exit on error

# Parse stage parameter (default: Dev)
STAGE="${1:-Dev}"

# Validate stage
if [[ ! "$STAGE" =~ ^(Dev|Staging|Prod)$ ]]; then
  echo "❌ Error: Invalid stage '$STAGE'"
  echo "Usage: ./deploy-frontend.sh [Dev|Staging|Prod] [API_URL]"
  echo "Example: ./deploy-frontend.sh Prod"
  echo "Example: ./deploy-frontend.sh Dev https://abc123.execute-api.us-east-1.amazonaws.com/Dev/"
  exit 1
fi

# Convert stage to lowercase for S3 bucket naming
STAGE_LOWER=$(echo "$STAGE" | tr '[:upper:]' '[:lower:]')

echo "=========================================="
echo "Deploying Frontend - Stage: $STAGE"
echo "=========================================="
echo ""

# Check if API URL is provided as argument
if [ -z "$API_URL" ]; then
  echo "🔍 No API URL provided, attempting to retrieve from backend stack..."
  API_URL=$(aws cloudformation describe-stacks \
    --stack-name loan-admin-backend-$STAGE \
    --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
    --output text 2>/dev/null)
  
  if [ -z "$API_URL" ]; then
    echo ""
    echo "❌ Error: Could not retrieve API URL from backend stack"
    echo ""
    echo "Usage: ./deploy-frontend.sh [Stage] [API_URL]"
    echo "Example: ./deploy-frontend.sh Prod"
    echo "Example: ./deploy-frontend.sh Dev https://abc123.execute-api.us-east-1.amazonaws.com/Dev/"
    echo ""
    echo "Or deploy backend first with: ./deploy-backend.sh $STAGE"
    exit 1
  fi
  echo "✅ Retrieved API URL from backend stack"
else
  echo "✅ Using provided API URL"
fi

echo "API URL: $API_URL"
echo ""

# Deploy Frontend Infrastructure
echo "📦 Step 1: Deploying frontend infrastructure..."
cd infrastructure

# Check if stack already exists
if aws cloudformation describe-stacks --stack-name loan-admin-frontend-$STAGE &> /dev/null; then
  echo "Stack already exists, updating..."
  aws cloudformation update-stack \
    --stack-name loan-admin-frontend-$STAGE \
    --template-body file://frontend-template-simple.yaml \
    --parameters ParameterKey=Stage,ParameterValue=$STAGE_LOWER 2>&1 | grep -v "No updates" || echo "No updates needed"
  
  echo "⏳ Waiting for stack update..."
  aws cloudformation wait stack-update-complete \
    --stack-name loan-admin-frontend-$STAGE 2>/dev/null || true
else
  echo "Creating new stack..."
  aws cloudformation create-stack \
    --stack-name loan-admin-frontend-$STAGE \
    --template-body file://frontend-template-simple.yaml \
    --parameters ParameterKey=Stage,ParameterValue=$STAGE_LOWER
  
  echo "⏳ Waiting for stack creation..."
  aws cloudformation wait stack-create-complete \
    --stack-name loan-admin-frontend-$STAGE
fi

echo ""
echo "✅ Frontend infrastructure deployed!"
echo ""

# Build and deploy frontend
echo "📦 Step 2: Building frontend application..."
cd ../frontend
echo "REACT_APP_API_URL=$API_URL" > .env.production

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
else
  echo "Dependencies already installed"
fi

npm run build

echo ""
echo "✅ Frontend built successfully!"
echo ""

# Get bucket name and website URL
echo "🔍 Retrieving S3 bucket information..."
BUCKET_NAME=$(aws cloudformation describe-stacks \
  --stack-name loan-admin-frontend-$STAGE \
  --query 'Stacks[0].Outputs[?OutputKey==`BucketName`].OutputValue' \
  --output text)

WEBSITE_URL=$(aws cloudformation describe-stacks \
  --stack-name loan-admin-frontend-$STAGE \
  --query 'Stacks[0].Outputs[?OutputKey==`WebsiteURL`].OutputValue' \
  --output text)

# Upload to S3
echo "📤 Uploading frontend to S3..."
aws s3 sync build/ s3://$BUCKET_NAME/ --delete

echo ""
echo "=========================================="
echo "✅ Frontend Deployment Complete!"
echo "=========================================="
echo ""
echo "🏷️  Stage: $STAGE"
echo "📦 Frontend Stack: loan-admin-frontend-$STAGE"
echo "🌐 Frontend URL: $WEBSITE_URL"
echo "🔌 API URL: $API_URL"
echo ""
echo "💡 Next steps:"
echo "   1. Visit the frontend URL to access the application"
echo "   2. Create borrowers first, then create loans"
echo "   3. Monitor CloudWatch logs for any issues"
echo ""
