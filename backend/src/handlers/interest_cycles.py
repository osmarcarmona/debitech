import json
import uuid
from datetime import datetime, timedelta
from decimal import Decimal
from dateutil.relativedelta import relativedelta
from services.dynamodb_service import DynamoDBService
from utils.response import success_response, error_response

db_service = DynamoDBService()

def create_initial_interest_cycle(loan_id: str) -> None:
    """
    Create the first interest cycle when a loan is approved
    This should be called immediately when a loan is created or approved
    """
    try:
        loan = db_service.get_loan(loan_id)
        if not loan or not loan.get('approvedAt'):
            return
        
        # Parse approval date
        approved_date = datetime.fromisoformat(loan['approvedAt'].replace('Z', '+00:00')).date()
        cycle_start_str = approved_date.isoformat()
        
        # Check if first cycle already exists
        existing_cycle = db_service.get_interest_cycle_by_date(loan_id, cycle_start_str)
        if existing_cycle:
            return  # Already created
        
        # Get current balance amount
        balance_amount = Decimal(str(loan.get('balanceAmount', loan.get('amount', 0))))
        interest_rate = Decimal(str(loan.get('interestRate', 0)))
        
        # Calculate interest for this cycle
        monthly_interest = balance_amount * (interest_rate / Decimal('100'))
        
        # Calculate cycle end date (day before next cycle)
        cycle_end_date = (approved_date + relativedelta(months=1)) - timedelta(days=1)
        
        cycle = {
            'cycleId': str(uuid.uuid4()),
            'loanId': loan_id,
            'cycleNumber': 1,
            'cycleStartDate': cycle_start_str,
            'cycleEndDate': cycle_end_date.isoformat(),
            'principalBalance': balance_amount,
            'interestRate': interest_rate,
            'interestAmount': monthly_interest,
            'createdAt': datetime.utcnow().isoformat()
        }
        
        db_service.create_interest_cycle(cycle)
        print(f"Created initial interest cycle for loan {loan_id}")
        
    except Exception as e:
        print(f"Error creating initial interest cycle: {str(e)}")
        # Don't raise exception - this is a non-critical operation

def process_daily_cycles(event, context):
    """
    Scheduled job that runs daily to check all active/approved loans
    and create interest cycle entries when a new cycle starts
    """
    try:
        today = datetime.utcnow().date()
        
        # Get all approved and active loans
        approved_loans = db_service.get_loans_by_status('approved')
        active_loans = db_service.get_loans_by_status('active')
        all_loans = approved_loans + active_loans
        
        cycles_created = 0
        
        for loan in all_loans:
            if not loan.get('approvedAt'):
                continue
            
            # Parse approval date
            approved_date = datetime.fromisoformat(loan['approvedAt'].replace('Z', '+00:00')).date()
            
            # Calculate which cycle we should be in
            current_cycle_number = 0
            cycle_start_date = approved_date
            
            while cycle_start_date <= today:
                # Check if this cycle already exists
                cycle_start_str = cycle_start_date.isoformat()
                existing_cycle = db_service.get_interest_cycle_by_date(loan['loanId'], cycle_start_str)
                
                if not existing_cycle and cycle_start_date == today:
                    # Create new interest cycle for today
                    # Get current balance amount
                    balance_amount = Decimal(str(loan.get('balanceAmount', loan.get('amount', 0))))
                    interest_rate = Decimal(str(loan.get('interestRate', 0)))
                    
                    # Calculate interest for this cycle
                    monthly_interest = balance_amount * (interest_rate / Decimal('100'))
                    
                    # Calculate cycle end date (day before next cycle)
                    cycle_end_date = (cycle_start_date + relativedelta(months=1)) - timedelta(days=1)
                    
                    cycle = {
                        'cycleId': str(uuid.uuid4()),
                        'loanId': loan['loanId'],
                        'cycleNumber': current_cycle_number + 1,
                        'cycleStartDate': cycle_start_str,
                        'cycleEndDate': cycle_end_date.isoformat(),
                        'principalBalance': balance_amount,
                        'interestRate': interest_rate,
                        'interestAmount': monthly_interest,
                        'createdAt': datetime.utcnow().isoformat()
                    }
                    
                    db_service.create_interest_cycle(cycle)
                    cycles_created += 1
                    
                    print(f"Created interest cycle for loan {loan['loanId']}, cycle {current_cycle_number + 1}")
                
                # Move to next cycle
                current_cycle_number += 1
                cycle_start_date = approved_date + relativedelta(months=current_cycle_number)
        
        return success_response({
            'message': f'Processed interest cycles',
            'cyclesCreated': cycles_created,
            'loansProcessed': len(all_loans)
        })
        
    except Exception as e:
        print(f"Error processing interest cycles: {str(e)}")
        return error_response(str(e), 500)

def get_interest_cycles(event, context):
    """Get all interest cycles for a specific loan"""
    try:
        loan_id = event['pathParameters']['id']
        
        # Verify loan exists
        loan = db_service.get_loan(loan_id)
        if not loan:
            return error_response('Loan not found', 404)
        
        # Get all interest cycles for this loan
        cycles = db_service.get_interest_cycles_by_loan(loan_id)
        
        return success_response(cycles)
        
    except Exception as e:
        return error_response(str(e), 500)
