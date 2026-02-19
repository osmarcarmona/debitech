from dataclasses import dataclass

@dataclass
class Borrower:
    borrower_id: str
    name: str
    phone: str
    status: str = 'active'
    
    def to_dict(self):
        return {
            'borrowerId': self.borrower_id,
            'name': self.name,
            'phone': self.phone,
            'status': self.status
        }
