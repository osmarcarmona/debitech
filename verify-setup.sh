#!/bin/bash

echo "Verifying project setup..."
echo ""

# Check backend files
echo "✓ Checking backend files..."
if [ -f "backend/template.yaml" ]; then
  echo "  ✅ backend/template.yaml exists"
else
  echo "  ❌ backend/template.yaml missing"
fi

if [ -f "backend/samconfig.toml" ]; then
  echo "  ✅ backend/samconfig.toml exists"
else
  echo "  ❌ backend/samconfig.toml missing"
fi

if [ -f "backend/requirements.txt" ]; then
  echo "  ✅ backend/requirements.txt exists"
else
  echo "  ❌ backend/requirements.txt missing"
fi

# Check backend source files
echo ""
echo "✓ Checking backend source files..."
if [ -f "backend/src/handlers/loans.py" ]; then
  echo "  ✅ backend/src/handlers/loans.py exists"
else
  echo "  ❌ backend/src/handlers/loans.py missing"
fi

if [ -f "backend/src/handlers/borrowers.py" ]; then
  echo "  ✅ backend/src/handlers/borrowers.py exists"
else
  echo "  ❌ backend/src/handlers/borrowers.py missing"
fi

if [ -f "backend/src/services/dynamodb_service.py" ]; then
  echo "  ✅ backend/src/services/dynamodb_service.py exists"
else
  echo "  ❌ backend/src/services/dynamodb_service.py missing"
fi

# Check frontend files
echo ""
echo "✓ Checking frontend files..."
if [ -f "frontend/package.json" ]; then
  echo "  ✅ frontend/package.json exists"
else
  echo "  ❌ frontend/package.json missing"
fi

if [ -f "frontend/src/App.jsx" ]; then
  echo "  ✅ frontend/src/App.jsx exists"
else
  echo "  ❌ frontend/src/App.jsx missing"
fi

# Check infrastructure files
echo ""
echo "✓ Checking infrastructure files..."
if [ -f "infrastructure/frontend-template-simple.yaml" ]; then
  echo "  ✅ infrastructure/frontend-template-simple.yaml exists"
else
  echo "  ❌ infrastructure/frontend-template-simple.yaml missing"
fi

# Validate SAM template
echo ""
echo "✓ Validating SAM template..."
if command -v sam &> /dev/null; then
  if sam validate --template backend/template.yaml &> /dev/null; then
    echo "  ✅ SAM template is valid"
  else
    echo "  ❌ SAM template validation failed"
    sam validate --template backend/template.yaml
  fi
else
  echo "  ⚠️  SAM CLI not installed, skipping validation"
fi

# Check AWS CLI
echo ""
echo "✓ Checking AWS CLI..."
if command -v aws &> /dev/null; then
  echo "  ✅ AWS CLI is installed"
  AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text 2>/dev/null || echo "not configured")
  echo "  📋 AWS Account: $AWS_ACCOUNT"
else
  echo "  ❌ AWS CLI not installed"
fi

echo ""
echo "=========================================="
echo "Setup verification complete!"
echo "=========================================="
echo ""
echo "Ready to deploy? Run: ./deploy.sh"
echo ""
