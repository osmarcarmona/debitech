# Cost Optimization Guide

## Minimal Resource Configuration

The infrastructure has been optimized for minimal cost while maintaining functionality.

## Lambda Functions

**Optimizations Applied:**
- Memory: 128 MB (minimum, sufficient for simple CRUD operations)
- Timeout: 10 seconds (reduced from 30s)
- Architecture: ARM64 (Graviton2 - 20% cheaper than x86)
- Logging: JSON format, ERROR level only
- Tracing: PassThrough (no X-Ray costs)

**Cost Impact:**
- ARM64 is ~20% cheaper than x86_64
- 128 MB is the minimum and cheapest memory size
- Shorter timeout prevents runaway costs
- Reduced logging minimizes CloudWatch costs

**Estimated Cost:**
- First 1M requests/month: FREE
- After: $0.20 per 1M requests
- Compute: $0.0000133334 per GB-second (ARM64)

## DynamoDB Tables

**Optimizations Applied:**
- Billing Mode: PAY_PER_REQUEST (no provisioned capacity)
- GSI Projection: KEYS_ONLY (minimal storage)
- Point-in-Time Recovery: DISABLED (saves ~$0.20/GB/month)
- Encryption: AWS managed keys (free)

**Cost Impact:**
- No idle costs - only pay for actual reads/writes
- KEYS_ONLY projection reduces storage by ~70%
- No PITR saves backup costs

**Estimated Cost:**
- First 25 GB storage: FREE
- Write: $1.25 per million writes
- Read: $0.25 per million reads
- Storage: $0.25 per GB/month

## API Gateway

**Optimizations Applied:**
- Type: REGIONAL (no global distribution overhead)
- Logging: ERROR level only
- Metrics: Disabled
- Data Trace: Disabled
- Throttling: 100 req/sec, 50 burst (prevents abuse)

**Cost Impact:**
- Regional endpoints are cheaper than edge-optimized
- Minimal logging reduces CloudWatch costs
- Throttling prevents unexpected bills

**Estimated Cost:**
- First 1M requests/month: FREE (12 months)
- After: $3.50 per million requests

## S3 Frontend Hosting

**Optimizations Applied:**
- Standard storage class
- No versioning
- No lifecycle policies
- Static website hosting (no CloudFront)

**Cost Impact:**
- Static hosting is free (only pay for storage and transfer)
- No CloudFront distribution costs

**Estimated Cost:**
- Storage: $0.023 per GB/month
- Data Transfer Out: First 100 GB/month FREE
- Typical small app: < $1/month

## Total Estimated Monthly Cost

**Low Usage (< 10,000 requests/month):**
- Lambda: FREE (within free tier)
- DynamoDB: FREE (within free tier)
- API Gateway: FREE (within free tier)
- S3: < $1
- **Total: < $1/month**

**Medium Usage (100,000 requests/month):**
- Lambda: ~$0.50
- DynamoDB: ~$2
- API Gateway: ~$0.35
- S3: ~$1
- **Total: ~$4/month**

**High Usage (1M requests/month):**
- Lambda: ~$5
- DynamoDB: ~$20
- API Gateway: ~$3.50
- S3: ~$2
- **Total: ~$30/month**

## Further Cost Reduction Options

### 1. Use Reserved Capacity (for predictable workloads)
```yaml
BillingMode: PROVISIONED
ProvisionedThroughput:
  ReadCapacityUnits: 5
  WriteCapacityUnits: 5
```
Saves ~75% vs on-demand for consistent traffic.

### 2. Enable DynamoDB Auto Scaling
Automatically adjusts capacity based on traffic.

### 3. Implement Caching
- Add API Gateway caching ($0.02/hour)
- Use DynamoDB DAX for read-heavy workloads
- Add CloudFront for static content

### 4. Optimize Lambda Memory
Monitor actual usage and adjust:
```bash
aws lambda get-function --function-name MyFunction
```

### 5. Set Up Budget Alerts
```bash
aws budgets create-budget \
  --account-id 123456789 \
  --budget file://budget.json
```

## Monitoring Costs

**AWS Cost Explorer:**
- View costs by service
- Set up cost anomaly detection
- Create custom cost reports

**CloudWatch Alarms:**
```bash
aws cloudwatch put-metric-alarm \
  --alarm-name high-api-usage \
  --metric-name Count \
  --namespace AWS/ApiGateway \
  --threshold 100000
```

## Cost Optimization Checklist

- [ ] Enable AWS Free Tier alerts
- [ ] Set up billing alarms
- [ ] Review CloudWatch log retention (default: never expire)
- [ ] Delete unused Lambda versions
- [ ] Clean up old DynamoDB backups
- [ ] Monitor API Gateway cache hit rates
- [ ] Review and optimize Lambda memory settings
- [ ] Consider Reserved Capacity for predictable loads
- [ ] Implement request caching where appropriate
- [ ] Use AWS Cost Explorer monthly

## Free Tier Limits (First 12 Months)

- Lambda: 1M requests + 400,000 GB-seconds/month
- DynamoDB: 25 GB storage + 25 read/write capacity units
- API Gateway: 1M requests/month
- S3: 5 GB storage + 20,000 GET + 2,000 PUT requests
- CloudWatch: 10 custom metrics + 10 alarms

## Always Free Tier

- Lambda: 1M requests + 400,000 GB-seconds/month (PERMANENT)
- DynamoDB: 25 GB storage + 25 WCU + 25 RCU (PERMANENT)
- CloudWatch: 10 custom metrics + 10 alarms (PERMANENT)
