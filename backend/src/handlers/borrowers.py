import json
import uuid
from datetime import datetime
from services.dynamodb_service import DynamoDBService
from utils.response import success_response, error_response

db_service = DynamoDBService()

def create_borrower(event, context):
    try:
        body = json.loads(event['body'])
        
        borrower_id = str(uuid.uuid4())
        borrower = {
            'borrowerId': borrower_id,
            'name': body['name'],
            'phone': body['phone'],
            'status': 'active',
            'createdAt': datetime.utcnow().isoformat(),
            'updatedAt': datetime.utcnow().isoformat()
        }
        
        created_borrower = db_service.create_borrower(borrower)
        return success_response(created_borrower, 201)
        
    except KeyError as e:
        return error_response(f'Missing required field: {str(e)}', 400)
    except Exception as e:
        return error_response(str(e), 500)

def get_borrowers(event, context):
    try:
        borrowers = db_service.get_all_borrowers()
        return success_response(borrowers)
        
    except Exception as e:
        return error_response(str(e), 500)

def get_borrower(event, context):
    try:
        borrower_id = event['pathParameters']['id']
        borrower = db_service.get_borrower(borrower_id)
        
        if not borrower:
            return error_response('Borrower not found', 404)
        
        return success_response(borrower)
        
    except Exception as e:
        return error_response(str(e), 500)
