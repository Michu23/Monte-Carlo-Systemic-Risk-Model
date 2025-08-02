"""
Bank model
"""

import uuid
from backend.app import db

class Bank(db.Model):
    """Bank model for financial institutions"""
    
    __tablename__ = 'banks'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(100), unique=True, nullable=False)
    cet1_ratio = db.Column(db.Float, nullable=False)  # CET1 Ratio (%)
    total_assets = db.Column(db.Float, nullable=False)  # Total Assets (€B)
    interbank_assets = db.Column(db.Float, nullable=False)  # Interbank Assets (€B)
    interbank_liabilities = db.Column(db.Float, nullable=False)  # Interbank Liabilities (€B)
    capital_buffer = db.Column(db.Float, nullable=False)  # Capital Buffer (€B)
    
    def to_dict(self):
        """Convert bank to dictionary"""
        return {
            'id': self.id,
            'name': self.name,
            'cet1_ratio': self.cet1_ratio,
            'total_assets': self.total_assets,
            'interbank_assets': self.interbank_assets,
            'interbank_liabilities': self.interbank_liabilities,
            'capital_buffer': self.capital_buffer
        }
    
    def __repr__(self):
        return f'<Bank {self.name}>'