from dataclasses import dataclass
from datetime import datetime
from typing import Optional
from decimal import Decimal

@dataclass
class Loan:
    loan_id: str
    borrower_id: str
    amount: Decimal
    interest_rate: Decimal
    term_months: int
    status: str  # pending, approved, active, paid, defaulted
    created_at: datetime
    approved_at: Optional[datetime] = None
    disbursed_at: Optional[datetime] = None
    
    def to_dict(self):
        return {
            'loanId': self.loan_id,
            'borrowerId': self.borrower_id,
            'amount': str(self.amount),
            'interestRate': str(self.interest_rate),
            'termMonths': self.term_months,
            'status': self.status,
            'createdAt': self.created_at.isoformat(),
            'approvedAt': self.approved_at.isoformat() if self.approved_at else None,
            'disbursedAt': self.disbursed_at.isoformat() if self.disbursed_at else None
        }
