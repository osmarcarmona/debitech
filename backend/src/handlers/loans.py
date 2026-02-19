import json
import uuid
from datetime import datetime
from decimal import Decimal
from services.dynamodb_service import DynamoDBService
from utils.response import success_response, error_response

db_service = DynamoDBService()

def create_loan(event, context):
    try:
        body = json.loads(event['body'])
        
        loan_id = str(uuid.uuid4())
        amount = Decimal(str(body['amount']))
        loan = {
            'loanId': loan_id,
            'borrowerId': body['borrowerId'],
            'amount': amount,
            'balanceAmount': amount,  # Initially, balance equals the principal amount
            'interestRate': Decimal(str(body['interestRate'])),
            'status': 'pending',
            'createdAt': datetime.utcnow().isoformat(),
            'updatedAt': datetime.utcnow().isoformat()
        }
        
        # Handle optional fields
        if 'paymentDay' in body and body['paymentDay']:
            loan['paymentDay'] = int(body['paymentDay'])
        
        if 'monthlyPayment' in body and body['monthlyPayment']:
            loan['monthlyPayment'] = Decimal(str(body['monthlyPayment']))
        
        if 'approvedAt' in body and body['approvedAt']:
            loan['approvedAt'] = body['approvedAt']
            loan['status'] = 'approved'
        
        created_loan = db_service.create_loan(loan)
        return success_response(created_loan, 201)
        
    except KeyError as e:
        return error_response(f'Missing required field: {str(e)}', 400)
    except Exception as e:
        return error_response(str(e), 500)

def get_loans(event, context):
    try:
        query_params = event.get('queryStringParameters') or {}
        
        if 'borrowerId' in query_params:
            loans = db_service.get_loans_by_borrower(query_params['borrowerId'])
        elif 'status' in query_params:
            loans = db_service.get_loans_by_status(query_params['status'])
        else:
            loans = db_service.get_all_loans()
        
        return success_response(loans)
        
    except Exception as e:
        return error_response(str(e), 500)

def get_loan(event, context):
    try:
        loan_id = event['pathParameters']['id']
        loan = db_service.get_loan(loan_id)
        
        if not loan:
            return error_response('Loan not found', 404)
        
        return success_response(loan)
        
    except Exception as e:
        return error_response(str(e), 500)

def update_loan_status(event, context):
    try:
        loan_id = event['pathParameters']['id']
        body = json.loads(event['body'])
        new_status = body['status']
        
        # Verify loan exists
        loan = db_service.get_loan(loan_id)
        if not loan:
            return error_response('Loan not found', 404)
        
        # Update status with timestamp
        updates = {
            'status': new_status,
            'updatedAt': datetime.utcnow().isoformat()
        }
        
        if new_status == 'approved':
            updates['approvedAt'] = datetime.utcnow().isoformat()
        elif new_status == 'active':
            updates['disbursedAt'] = datetime.utcnow().isoformat()
        
        db_service.update_loan(loan_id, updates)
        
        return success_response({'message': 'Loan status updated', 'loanId': loan_id})
        
    except KeyError as e:
        return error_response(f'Missing required field: {str(e)}', 400)
    except Exception as e:
        return error_response(str(e), 500)
