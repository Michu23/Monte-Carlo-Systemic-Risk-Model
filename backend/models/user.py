"""
User model
"""

import uuid
import secrets
from datetime import datetime, timedelta
from backend.app import db

class User(db.Model):
    """User model for authentication and authorization"""
    
    __tablename__ = 'users'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username = db.Column(db.String(64), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='viewer')  # admin, analyst, viewer
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    last_login = db.Column(db.DateTime, nullable=True)
    reset_token = db.Column(db.String(100), nullable=True)
    reset_token_expires_at = db.Column(db.DateTime, nullable=True)
    revoked_tokens = db.Column(db.Text, nullable=True)  # Comma-separated list of revoked JWTs
    
    # Relationships
    simulations = db.relationship('Simulation', backref='user', lazy=True)
    
    def update_last_login(self):
        """Update the last login timestamp"""
        self.last_login = datetime.utcnow()
    
    def generate_reset_token(self):
        """Generate a password reset token"""
        self.reset_token = secrets.token_urlsafe(32)
        self.reset_token_expires_at = datetime.utcnow() + timedelta(hours=24)
        db.session.commit()
        return self.reset_token
    
    def verify_reset_token(self, token):
        """Verify if reset token is valid"""
        if self.reset_token != token:
            return False
        
        if not self.reset_token_expires_at or self.reset_token_expires_at < datetime.utcnow():
            return False
        
        return True
    
    def add_revoked_token(self, jti):
        """Add a JWT token to the revoked tokens list"""
        if self.revoked_tokens:
            tokens = self.revoked_tokens.split(',')
            tokens.append(jti)
            # Keep only the last 10 tokens to prevent the field from growing too large
            self.revoked_tokens = ','.join(tokens[-10:])
        else:
            self.revoked_tokens = jti
    
    def is_token_revoked(self, jti):
        """Check if a JWT token is revoked"""
        if not self.revoked_tokens:
            return False
        
        return jti in self.revoked_tokens.split(',')
    
    def to_dict(self):
        """Convert user to dictionary"""
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'role': self.role,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_login': self.last_login.isoformat() if self.last_login else None
        }
    
    def __repr__(self):
        return f'<User {self.username}>'