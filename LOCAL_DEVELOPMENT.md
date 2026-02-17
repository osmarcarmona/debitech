# Local Development Guide

## Running Frontend Locally

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Configure API URL
Edit `frontend/.env.development` and set your backend API URL:

For local SAM backend:
```
REACT_APP_API_URL=http://localhost:3001
```

For deployed Dev stack (recommended):
```
REACT_APP_API_URL=https://your-api-id.execute-api.us-east-1.amazonaws.com/Dev
```

For deployed Prod stack:
```
REACT_APP_API_URL=https://your-api-id.execute-api.us-east-1.amazonaws.com/Prod
```

To get your deployed API URL:
```bash
# For Dev stack
aws cloudformation describe-stacks --stack-name loan-admin-backend-Dev --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' --output text

# For Prod stack
aws cloudformation describe-stacks --stack-name loan-admin-backend-Prod --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' --output text
```

### 3. Start Development Server
```bash
npm start
```

The app will open at `http://localhost:3000`

## Running Backend Locally (Optional)

### 1. Install AWS SAM CLI
```bash
brew install aws-sam-cli  # macOS
```

### 2. Start Local API
```bash
cd backend
sam build
sam local start-api --port 3001
```

This starts a local API Gateway at `http://localhost:3001`

## Testing with Deployed Backend

If you've already deployed the backend to AWS:

1. Get the API URL from your deployed stack:
```bash
# For Dev stack
aws cloudformation describe-stacks --stack-name loan-admin-backend-Dev --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' --output text

# For Prod stack
aws cloudformation describe-stacks --stack-name loan-admin-backend-Prod --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' --output text
```

2. Update `frontend/.env.development`:
```
REACT_APP_API_URL=https://xxxxx.execute-api.us-east-1.amazonaws.com/Dev
```

3. Start frontend:
```bash
cd frontend
npm start
```

## Quick Start Commands

```bash
# Frontend only (with deployed backend)
cd frontend
npm install
npm start

# Full local stack
# Terminal 1 - Backend
cd backend
sam local start-api --port 3001

# Terminal 2 - Frontend
cd frontend
npm start
```
