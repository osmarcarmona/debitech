import os
import boto3
from decimal import Decimal
from typing import Dict, List, Optional

class DynamoDBService:
    def __init__(self):
        self.dynamodb = boto3.resource('dynamodb')
        self.loans_table = self.dynamodb.Table(os.environ['LOANS_TABLE'])
        self.borrowers_table = self.dynamodb.Table(os.environ['BORROWERS_TABLE'])
    
    # Loan operations
    def create_loan(self, loan: Dict) -> Dict:
        self.loans_table.put_item(Item=loan)
        return loan
    
    def get_loan(self, loan_id: str) -> Optional[Dict]:
        response = self.loans_table.get_item(Key={'loanId': loan_id})
        return response.get('Item')
    
    def get_all_loans(self) -> List[Dict]:
        response = self.loans_table.scan()
        return response.get('Items', [])
    
    def get_loans_by_borrower(self, borrower_id: str) -> List[Dict]:
        response = self.loans_table.query(
            IndexName='BorrowerIdIndex',
            KeyConditionExpression='borrowerId = :borrowerId',
            ExpressionAttributeValues={':borrowerId': borrower_id}
        )
        return response.get('Items', [])
    
    def get_loans_by_status(self, status: str) -> List[Dict]:
        response = self.loans_table.query(
            IndexName='StatusIndex',
            KeyConditionExpression='#status = :status',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={':status': status}
        )
        return response.get('Items', [])
    
    def update_loan_status(self, loan_id: str, status: str) -> None:
        self.loans_table.update_item(
            Key={'loanId': loan_id},
            UpdateExpression='SET #status = :status',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={':status': status}
        )
    
    def update_loan(self, loan_id: str, updates: Dict) -> None:
        update_expression = 'SET ' + ', '.join([f'#{k} = :{k}' for k in updates.keys()])
        expression_attribute_names = {f'#{k}': k for k in updates.keys()}
        expression_attribute_values = {f':{k}': v for k, v in updates.items()}
        
        self.loans_table.update_item(
            Key={'loanId': loan_id},
            UpdateExpression=update_expression,
            ExpressionAttributeNames=expression_attribute_names,
            ExpressionAttributeValues=expression_attribute_values
        )
    
    # Borrower operations
    def create_borrower(self, borrower: Dict) -> Dict:
        self.borrowers_table.put_item(Item=borrower)
        return borrower
    
    def get_borrower(self, borrower_id: str) -> Optional[Dict]:
        response = self.borrowers_table.get_item(Key={'borrowerId': borrower_id})
        return response.get('Item')
    
    def get_all_borrowers(self) -> List[Dict]:
        response = self.borrowers_table.scan()
        return response.get('Items', [])
    
    def get_borrower_by_email(self, email: str) -> Optional[Dict]:
        response = self.borrowers_table.query(
            IndexName='EmailIndex',
            KeyConditionExpression='email = :email',
            ExpressionAttributeValues={':email': email}
        )
        items = response.get('Items', [])
        return items[0] if items else None
    
    def update_borrower(self, borrower_id: str, updates: Dict) -> None:
        update_expression = 'SET ' + ', '.join([f'#{k} = :{k}' for k in updates.keys()])
        expression_attribute_names = {f'#{k}': k for k in updates.keys()}
        expression_attribute_values = {f':{k}': v for k, v in updates.items()}
        
        self.borrowers_table.update_item(
            Key={'borrowerId': borrower_id},
            UpdateExpression=update_expression,
            ExpressionAttributeNames=expression_attribute_names,
            ExpressionAttributeValues=expression_attribute_values
        )
