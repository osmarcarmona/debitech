import json
import uuid
from datetime import datetime
from decimal import Decimal
from services.dynamodb_service import DynamoDBService
from utils.response import success_response, error_response

db_service = DynamoDBService()

def add_payment(event, context):
    try:
        loan_id = event['pathParameters']['id']
        body = json.loads(event['body'])
        
        # Verify loan exists
        loan = db_service.get_loan(loan_id)
        if not loan:
            return error_response('Loan not found', 404)
        
        payment_id = str(uuid.uuid4())
        payment = {
            'paymentId': payment_id,
            'loanId': loan_id,
            'amount': Decimal(str(body['amount'])),
            'paymentDate': body.get('paymentDate', datetime.utcnow().isoformat()),
            'createdAt': datetime.utcnow().isoformat()
        }
        
        created_payment = db_service.create_payment(payment)
        
        # Update loan balance after adding payment
        db_service.update_loan_balance(loan_id)
        
        return success_response(created_payment, 201)
        
    except KeyError as e:
        return error_response(f'Missing required field: {str(e)}', 400)
    except Exception as e:
        return error_response(str(e), 500)

def get_payments(event, context):
    try:
        loan_id = event['pathParameters']['id']
        payments = db_service.get_payments_by_loan(loan_id)
        return success_response(payments)
        
    except Exception as e:
        return error_response(str(e), 500)

def update_payment(event, context):
    try:
        payment_id = event['pathParameters']['paymentId']
        body = json.loads(event['body'])
        
        # Verify payment exists
        payment = db_service.get_payment(payment_id)
        if not payment:
            return error_response('Payment not found', 404)
        
        loan_id = payment.get('loanId')
        
        updates = {}
        if 'amount' in body:
            updates['amount'] = Decimal(str(body['amount']))
        if 'paymentDate' in body:
            updates['paymentDate'] = body['paymentDate']
        
        if updates:
            updates['updatedAt'] = datetime.utcnow().isoformat()
            db_service.update_payment(payment_id, updates)
            
            # Update loan balance after updating payment
            if loan_id:
                db_service.update_loan_balance(loan_id)
        
        return success_response({'message': 'Payment updated', 'paymentId': payment_id})
        
    except KeyError as e:
        return error_response(f'Missing required field: {str(e)}', 400)
    except Exception as e:
        return error_response(str(e), 500)

def delete_payment(event, context):
    try:
        payment_id = event['pathParameters']['paymentId']
        
        # Verify payment exists
        payment = db_service.get_payment(payment_id)
        if not payment:
            return error_response('Payment not found', 404)
        
        loan_id = payment.get('loanId')
        
        db_service.delete_payment(payment_id)
        
        # Update loan balance after deleting payment
        if loan_id:
            db_service.update_loan_balance(loan_id)
        
        return success_response({'message': 'Payment deleted', 'paymentId': payment_id})
        
    except Exception as e:
        return error_response(str(e), 500)
