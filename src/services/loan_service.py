from datetime import datetime
from typing import List, Optional
from ..database import get_db_connection
from ..models.borrower import Borrower
from ..models.loan import Loan, LoanStatus
from ..models.payment import Payment

class LoanService:
    """Service for managing loans, borrowers, and payments"""
    
    def create_borrower(self, name: str, email: str, phone: str) -> int:
        """Create a new borrower"""
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO borrowers (name, email, phone) VALUES (?, ?, ?)",
                (name, email, phone)
            )
            return cursor.lastrowid
    
    def get_borrower(self, borrower_id: int) -> Optional[Borrower]:
        """Get borrower by ID"""
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM borrowers WHERE id = ?", (borrower_id,))
            row = cursor.fetchone()
            if row:
                return Borrower(
                    id=row['id'],
                    name=row['name'],
                    email=row['email'],
                    phone=row['phone'],
                    created_at=datetime.fromisoformat(row['created_at'])
                )
        return None
    
    def create_loan(self, borrower_id: int, principal: float, 
                   interest_rate: float, term_months: int) -> int:
        """Create a new loan"""
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """INSERT INTO loans (borrower_id, principal, interest_rate, 
                   term_months, status) VALUES (?, ?, ?, ?, ?)""",
                (borrower_id, principal, interest_rate, term_months, 
                 LoanStatus.PENDING.value)
            )
            return cursor.lastrowid
    
    def disburse_loan(self, loan_id: int) -> bool:
        """Mark loan as disbursed and active"""
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """UPDATE loans SET status = ?, disbursement_date = ? 
                   WHERE id = ? AND status = ?""",
                (LoanStatus.ACTIVE.value, datetime.now(), loan_id, 
                 LoanStatus.PENDING.value)
            )
            return cursor.rowcount > 0
    
    def get_loan(self, loan_id: int) -> Optional[Loan]:
        """Get loan by ID"""
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM loans WHERE id = ?", (loan_id,))
            row = cursor.fetchone()
            if row:
                return Loan(
                    id=row['id'],
                    borrower_id=row['borrower_id'],
                    principal=row['principal'],
                    interest_rate=row['interest_rate'],
                    term_months=row['term_months'],
                    status=LoanStatus(row['status']),
                    disbursement_date=datetime.fromisoformat(row['disbursement_date']) 
                        if row['disbursement_date'] else None,
                    created_at=datetime.fromisoformat(row['created_at'])
                )
        return None
    
    def record_payment(self, loan_id: int, amount: float, 
                      notes: Optional[str] = None) -> int:
        """Record a payment for a loan"""
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO payments (loan_id, amount, notes) VALUES (?, ?, ?)",
                (loan_id, amount, notes)
            )
            
            # Check if loan is fully paid
            cursor.execute(
                "SELECT SUM(amount) as total FROM payments WHERE loan_id = ?",
                (loan_id,)
            )
            total_paid = cursor.fetchone()['total'] or 0
            
            loan = self.get_loan(loan_id)
            if loan and total_paid >= loan.total_amount:
                cursor.execute(
                    "UPDATE loans SET status = ? WHERE id = ?",
                    (LoanStatus.PAID.value, loan_id)
                )
            
            return cursor.lastrowid
    
    def get_loan_balance(self, loan_id: int) -> float:
        """Get remaining balance for a loan"""
        loan = self.get_loan(loan_id)
        if not loan:
            return 0.0
        
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT SUM(amount) as total FROM payments WHERE loan_id = ?",
                (loan_id,)
            )
            total_paid = cursor.fetchone()['total'] or 0
        
        return loan.total_amount - total_paid
    
    def get_borrower_loans(self, borrower_id: int) -> List[Loan]:
        """Get all loans for a borrower"""
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM loans WHERE borrower_id = ?", (borrower_id,))
            loans = []
            for row in cursor.fetchall():
                loans.append(Loan(
                    id=row['id'],
                    borrower_id=row['borrower_id'],
                    principal=row['principal'],
                    interest_rate=row['interest_rate'],
                    term_months=row['term_months'],
                    status=LoanStatus(row['status']),
                    disbursement_date=datetime.fromisoformat(row['disbursement_date']) 
                        if row['disbursement_date'] else None,
                    created_at=datetime.fromisoformat(row['created_at'])
                ))
            return loans
