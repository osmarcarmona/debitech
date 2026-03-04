import os
import boto3
from decimal import Decimal
from datetime import datetime
from typing import Dict, List, Optional

class DynamoDBService:
    def __init__(self):
        self.dynamodb = boto3.resource('dynamodb')
        self.loans_table = self.dynamodb.Table(os.environ['LOANS_TABLE'])
        self.borrowers_table = self.dynamodb.Table(os.environ['BORROWERS_TABLE'])
        self.payments_table = self.dynamodb.Table(os.environ.get('PAYMENTS_TABLE', 'Payments'))
        self.interest_cycles_table = self.dynamodb.Table(os.environ.get('INTEREST_CYCLES_TABLE', 'InterestCycles'))
    
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
    
    def delete_loan(self, loan_id: str) -> None:
        self.loans_table.delete_item(Key={'loanId': loan_id})
    
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
    
    # Payment operations
    def create_payment(self, payment: Dict) -> Dict:
        self.payments_table.put_item(Item=payment)
        return payment
    
    def get_payment(self, payment_id: str) -> Optional[Dict]:
        response = self.payments_table.get_item(Key={'paymentId': payment_id})
        return response.get('Item')
    
    def get_payments_by_loan(self, loan_id: str) -> List[Dict]:
        response = self.payments_table.query(
            IndexName='LoanIdIndex',
            KeyConditionExpression='loanId = :loanId',
            ExpressionAttributeValues={':loanId': loan_id}
        )
        return response.get('Items', [])
    
    def update_payment(self, payment_id: str, updates: Dict) -> None:
        update_expression = 'SET ' + ', '.join([f'#{k} = :{k}' for k in updates.keys()])
        expression_attribute_names = {f'#{k}': k for k in updates.keys()}
        expression_attribute_values = {f':{k}': v for k, v in updates.items()}
        
        self.payments_table.update_item(
            Key={'paymentId': payment_id},
            UpdateExpression=update_expression,
            ExpressionAttributeNames=expression_attribute_names,
            ExpressionAttributeValues=expression_attribute_values
        )
    
    def delete_payment(self, payment_id: str) -> None:
        self.payments_table.delete_item(Key={'paymentId': payment_id})
    
    # Interest Cycles operations
    def create_interest_cycle(self, cycle: Dict) -> Dict:
        self.interest_cycles_table.put_item(Item=cycle)
        return cycle
    
    def get_interest_cycles_by_loan(self, loan_id: str) -> List[Dict]:
        response = self.interest_cycles_table.query(
            IndexName='LoanIdIndex',
            KeyConditionExpression='loanId = :loanId',
            ExpressionAttributeValues={':loanId': loan_id},
            ScanIndexForward=True  # Sort by cycleStartDate ascending
        )
        return response.get('Items', [])
    
    def get_interest_cycle_by_date(self, loan_id: str, cycle_start_date: str) -> Optional[Dict]:
        """Check if an interest cycle already exists for a specific date"""
        cycles = self.get_interest_cycles_by_loan(loan_id)
        for cycle in cycles:
            if cycle.get('cycleStartDate') == cycle_start_date:
                return cycle
        return None
    
    def calculate_accrued_interest(self, loan: Dict) -> Decimal:
        """Calculate accrued interest based on days elapsed since approval"""
        if not loan.get('approvedAt'):
            return Decimal('0')
        
        approved_date = datetime.fromisoformat(loan['approvedAt'].replace('Z', '+00:00'))
        current_date = datetime.utcnow()
        
        # Calculate days elapsed
        days_elapsed = (current_date - approved_date).days
        
        if days_elapsed < 0:
            return Decimal('0')
        
        principal = Decimal(str(loan.get('amount', 0)))
        monthly_rate = Decimal(str(loan.get('interestRate', 0))) / Decimal('100')
        
        # Calculate monthly interest amount
        monthly_interest_amount = principal * monthly_rate
        
        # Calculate months elapsed (using 30 days per month)
        months_elapsed = Decimal(str(days_elapsed)) / Decimal('30')
        
        # Calculate number of complete billing cycles
        completed_cycles = int(months_elapsed)
        days_into_current_cycle = days_elapsed - (completed_cycles * 30)
        
        # If we're at least 1 day into a new cycle, count it as a full cycle
        billing_cycles = completed_cycles + 1 if days_into_current_cycle >= 1 else completed_cycles
        
        # Calculate total accrued interest
        accrued_interest = monthly_interest_amount * Decimal(str(billing_cycles))
        
        return accrued_interest
    
    def update_loan_balance(self, loan_id: str) -> None:
        """Calculate and update the balance amount for a loan based on capital payments only"""
        # Get the loan
        loan = self.get_loan(loan_id)
        if not loan:
            return
        
        # Get all payments for this loan
        payments = self.get_payments_by_loan(loan_id)
        
        # Calculate total capital payments only (exclude interest payments)
        total_capital_paid = sum(
            Decimal(str(payment.get('amount', 0))) 
            for payment in payments 
            if payment.get('paymentType', 'capital') == 'capital'
        )
        
        # Calculate total interest payments
        total_interest_paid = sum(
            Decimal(str(payment.get('amount', 0))) 
            for payment in payments 
            if payment.get('paymentType', 'capital') == 'interest'
        )
        
        # Calculate balance (principal - total capital paid)
        principal = Decimal(str(loan.get('amount', 0)))
        balance = principal - total_capital_paid
        
        # Calculate accrued interest
        accrued_interest = self.calculate_accrued_interest(loan)
        
        # Update the loan with new balances
        self.update_loan(loan_id, {
            'balanceAmount': balance,
            'balanceInterestAmount': total_interest_paid,
            'accruedInterest': accrued_interest,
            'updatedAt': datetime.utcnow().isoformat()
        })
