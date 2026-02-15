from dataclasses import dataclass
from typing import Optional

@dataclass
class Borrower:
    borrower_id: str
    name: str
    email: str
    phone: str
    credit_score: Optional[int] = None
    status: str = 'active'
    
    def to_dict(self):
        return {
            'borrowerId': self.borrower_id,
            'name': self.name,
            'email': self.email,
            'phone': self.phone,
            'creditScore': self.credit_score,
            'status': self.status
        }
