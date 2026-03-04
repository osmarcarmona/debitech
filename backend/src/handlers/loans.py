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
            'balanceInterestAmount': Decimal('0'),  # Initially, no interest has been paid
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
        
        # Create initial interest cycle if loan is approved
        if loan.get('approvedAt'):
            from handlers.interest_cycles import create_initial_interest_cycle
            create_initial_interest_cycle(loan_id)
        
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
        
        # Create initial interest cycle if loan is being approved
        if new_status == 'approved':
            from handlers.interest_cycles import create_initial_interest_cycle
            create_initial_interest_cycle(loan_id)
        
        return success_response({'message': 'Loan status updated', 'loanId': loan_id})
        
    except KeyError as e:
        return error_response(f'Missing required field: {str(e)}', 400)
    except Exception as e:
        return error_response(str(e), 500)

def delete_loan(event, context):
    try:
        loan_id = event['pathParameters']['id']
        
        # Verify loan exists
        loan = db_service.get_loan(loan_id)
        if not loan:
            return error_response('Loan not found', 404)
        
        # Delete all payments associated with this loan
        payments = db_service.get_payments_by_loan(loan_id)
        for payment in payments:
            db_service.delete_payment(payment['paymentId'])
        
        # Delete the loan
        db_service.delete_loan(loan_id)
        
        return success_response({'message': 'Loan and associated payments deleted', 'loanId': loan_id})
        
    except Exception as e:
        return error_response(str(e), 500)
