import json
from decimal import Decimal
from collections import defaultdict
from datetime import datetime
from services.dynamodb_service import DynamoDBService
from utils.response import success_response, error_response

db_service = DynamoDBService()

def get_reports(event, context):
    try:
        # Get query parameters for date filtering
        query_params = event.get('queryStringParameters') or {}
        start_date_str = query_params.get('startDate')
        end_date_str = query_params.get('endDate')
        
        # Parse date filters
        start_date = None
        end_date = None
        if start_date_str:
            start_date = datetime.fromisoformat(start_date_str)
        if end_date_str:
            end_date = datetime.fromisoformat(end_date_str)
            # Set to end of day
            end_date = end_date.replace(hour=23, minute=59, second=59)
        
        # Get all loans and payments
        loans = db_service.get_all_loans()
        borrowers = db_service.get_all_borrowers()
        
        # Filter loans by date if filters are provided
        if start_date or end_date:
            filtered_loans = []
            for loan in loans:
                approved_at = loan.get('approvedAt')
                if approved_at:
                    loan_date = datetime.fromisoformat(approved_at.replace('Z', '+00:00'))
                    if start_date and loan_date < start_date:
                        continue
                    if end_date and loan_date > end_date:
                        continue
                filtered_loans.append(loan)
            loans = filtered_loans
        
        # Initialize statistics
        total_debt = Decimal('0')
        total_interest_profit = Decimal('0')
        total_incoming_payment = Decimal('0')
        total_invested = Decimal('0')
        borrower_profits = defaultdict(lambda: {'profit': Decimal('0'), 'name': '', 'borrowerId': ''})
        
        # Create borrower lookup
        borrower_map = {b['borrowerId']: b for b in borrowers}
        
        # Process each loan
        for loan in loans:
            loan_amount = Decimal(str(loan.get('amount', 0)))
            interest_rate = Decimal(str(loan.get('interestRate', 0)))
            borrower_id = loan.get('borrowerId')
            approved_at = loan.get('approvedAt')
            
            # Get payments for this loan
            payments = db_service.get_payments_by_loan(loan['loanId'])
            
            total_paid = Decimal('0')
            for payment in payments:
                amount = Decimal(str(payment.get('amount', 0)))
                total_paid += amount
                
                # For interest profit, we need to calculate how much of each payment was interest
                # This is a simplified calculation - in reality you'd track this per payment
                # For now, we'll calculate it based on the accrued interest at payment time
            
            # Calculate accrued interest for this loan
            accrued_interest = Decimal('0')
            if approved_at and loan.get('status') in ['active', 'approved']:
                approved_date = datetime.fromisoformat(approved_at.replace('Z', '+00:00'))
                current_date = datetime.utcnow()
                
                days_elapsed = (current_date - approved_date).days
                
                if days_elapsed >= 0:
                    monthly_rate = interest_rate / Decimal('100')
                    monthly_interest_amount = loan_amount * monthly_rate
                    
                    # Calculate billing cycles (30 days per cycle)
                    months_elapsed = Decimal(str(days_elapsed)) / Decimal('30')
                    completed_cycles = int(months_elapsed)
                    days_into_current_cycle = days_elapsed - (completed_cycles * 30)
                    
                    # If at least 1 day into a new cycle, count it as a full cycle
                    billing_cycles = completed_cycles + 1 if days_into_current_cycle >= 1 else completed_cycles
                    
                    accrued_interest = monthly_interest_amount * Decimal(str(billing_cycles))
            
            # Add accrued interest to total interest profit (for active/approved loans)
            if loan.get('status') in ['active', 'approved'] and accrued_interest > 0:
                total_interest_profit += accrued_interest
                
                # Track profit per borrower
                if borrower_id:
                    borrower_profits[borrower_id]['profit'] += accrued_interest
                    borrower_profits[borrower_id]['borrowerId'] = borrower_id
                    if borrower_id in borrower_map:
                        borrower = borrower_map[borrower_id]
                        borrower_profits[borrower_id]['name'] = borrower.get('name', 'Unknown')
            
            # Calculate amount due for this loan (Principal + Accrued Interest - Total Paid)
            total_with_interest = loan_amount + accrued_interest
            amount_due = max(Decimal('0'), total_with_interest - total_paid)
            
            # Add to total debt (only active and approved loans with amount due)
            if loan.get('status') in ['active', 'approved'] and amount_due > 0:
                total_debt += amount_due
            
            # Calculate minimal base payment for this month (Principal * Monthly Interest Rate)
            if loan.get('status') in ['active', 'approved']:
                monthly_rate = interest_rate / Decimal('100')
                minimal_base_payment = loan_amount * monthly_rate
                total_incoming_payment += minimal_base_payment
                
                # Add to total invested (sum of all principal amounts)
                total_invested += loan_amount
        
        # Find top 5 most profitable borrowers
        top_profitable_borrowers = []
        if borrower_profits:
            # Sort borrowers by profit in descending order and get top 5
            sorted_borrowers = sorted(
                borrower_profits.items(),
                key=lambda x: x[1]['profit'],
                reverse=True
            )[:5]
            
            top_profitable_borrowers = [
                {
                    'borrowerId': borrower_id,
                    'name': data['name'],
                    'profit': float(data['profit'])
                }
                for borrower_id, data in sorted_borrowers
                if data['profit'] > 0
            ]
        
        # Prepare response
        report = {
            'totalDebt': float(total_debt),
            'totalInvested': float(total_invested),
            'interestProfit': float(total_interest_profit),
            'incomingPayment': float(total_incoming_payment),
            'topProfitableBorrowers': top_profitable_borrowers,
            'totalLoans': len(loans),
            'activeLoans': len([l for l in loans if l.get('status') == 'active']),
            'approvedLoans': len([l for l in loans if l.get('status') == 'approved']),
            'totalBorrowers': len(borrowers)
        }
        
        return success_response(report)
        
    except Exception as e:
        return error_response(str(e), 500)
