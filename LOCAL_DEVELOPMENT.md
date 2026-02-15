# Local Development Guide

## Running Frontend Locally

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Configure API URL
Edit `frontend/.env.development` and set your backend API URL:
```
REACT_APP_API_URL=http://localhost:3001
# or your deployed API Gateway URL:
# REACT_APP_API_URL=https://your-api-id.execute-api.us-east-1.amazonaws.com/prod
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

1. Deploy backend first:
```bash
cd backend
sam build
sam deploy --guided
```

2. Copy the API URL from the output

3. Update `frontend/.env.development`:
```
REACT_APP_API_URL=https://xxxxx.execute-api.us-east-1.amazonaws.com/prod
```

4. Start frontend:
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
