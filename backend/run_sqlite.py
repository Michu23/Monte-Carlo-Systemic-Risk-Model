#!/usr/bin/env python3
"""
SQLite backend with simplified models
"""

import uuid
import json
import hashlib
from datetime import datetime
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy

# Initialize extensions
db = SQLAlchemy()

# Simplified Models (self-contained)
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

class User(db.Model):
    """User model for authentication"""
    
    __tablename__ = 'users'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username = db.Column(db.String(64), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='viewer')
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    last_login = db.Column(db.DateTime, nullable=True)
    
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

class Simulation(db.Model):
    """Simulation model"""
    
    __tablename__ = 'simulations'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    created_by = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    status = db.Column(db.String(20), nullable=False, default='pending')
    progress = db.Column(db.Float, nullable=False, default=0.0)
    _parameters = db.Column('parameters', db.Text, nullable=False)
    
    @property
    def parameters(self):
        """Get parameters as dictionary"""
        return json.loads(self._parameters)
    
    @parameters.setter
    def parameters(self, value):
        """Set parameters from dictionary"""
        self._parameters = json.dumps(value)
    
    def to_dict(self):
        """Convert simulation to dictionary"""
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'status': self.status,
            'progress': self.progress,
            'parameters': self.parameters
        }
    
    def __repr__(self):
        return f'<Simulation {self.name}>'

def create_app():
    """Create Flask app with SQLite database"""
    app = Flask(__name__)
    
    # Configuration
    app.config['SECRET_KEY'] = 'dev-secret-key'
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///systemic_risk.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # Enable CORS with specific origins
    CORS(app, origins=['http://localhost:3000', 'http://127.0.0.1:3000'])
    
    # Initialize extensions
    db.init_app(app)
    
    # Create tables and seed data
    with app.app_context():
        db.create_all()
        
        # Seed data if tables are empty
        if Bank.query.count() == 0:
            seed_data()
    
    # Add request logging middleware
    @app.before_request
    def log_request():
        print(f"📥 {request.method} {request.path} from {request.remote_addr}")
    
    @app.route('/api/routes', methods=['GET'])
    def list_routes():
        routes = []
        for rule in app.url_map.iter_rules():
            routes.append({
                'endpoint': rule.endpoint,
                'methods': list(rule.methods),
                'path': str(rule)
            })
        return jsonify({'routes': routes})
    
    @app.route('/api/test', methods=['GET', 'POST'])
    def test_endpoint():
        return jsonify({
            "message": "Proxy is working!",
            "method": request.method,
            "backend_port": 5001
        })
    
    # Authentication Routes
    @app.route('/api/auth/register', methods=['POST'])
    def register():
        try:
            data = request.get_json()
            
            # Validate required fields
            required_fields = ['username', 'email', 'password']
            for field in required_fields:
                if not data.get(field):
                    return jsonify({"error": f"{field} is required"}), 400
            
            # Check if user already exists
            existing_user = User.query.filter(
                (User.username == data['username']) | 
                (User.email == data['email'])
            ).first()
            
            if existing_user:
                return jsonify({"error": "User already exists"}), 409
            
            # Create password hash (simple hash for demo)
            password_hash = hashlib.sha256(data['password'].encode()).hexdigest()
            
            # Create new user
            user = User(
                username=data['username'],
                email=data['email'],
                password_hash=password_hash,
                role='analyst'  # Default role
            )
            
            db.session.add(user)
            db.session.commit()
            
            return jsonify({
                "message": "User registered successfully",
                "user": user.to_dict()
            }), 201
            
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": str(e)}), 500
    
    @app.route('/api/auth/login', methods=['POST'])
    def login():
        try:
            data = request.get_json()
            print(f"🗑️ LOGIN ATTEMPT: {data}")
            
            if not data.get('username') or not data.get('password'):
                return jsonify({"error": "Username and password required"}), 400
            
            # Find user
            user = User.query.filter_by(username=data['username']).first()
            print(f"👤 USER FOUND: {user.username if user else 'None'}")
            
            if not user:
                return jsonify({"error": "Invalid credentials"}), 401
            
            # Check password (simple hash comparison)
            password_hash = hashlib.sha256(data['password'].encode()).hexdigest()
            print(f"🔐 PASSWORD HASH: {password_hash[:20]}...")
            print(f"🔐 STORED HASH:   {user.password_hash[:20]}...")
            
            if user.password_hash != password_hash:
                print("❌ PASSWORD MISMATCH")
                return jsonify({"error": "Invalid credentials"}), 401
            
            print("✅ LOGIN SUCCESS")
            # Update last login
            user.last_login = datetime.utcnow()
            db.session.commit()
            
            return jsonify({
                "message": "Login successful",
                "user": user.to_dict(),
                "token": f"dummy_token_{user.id}"  # Simple token for demo
            }), 200
            
        except Exception as e:
            print(f"❌ LOGIN ERROR: {str(e)}")
            return jsonify({"error": str(e)}), 500
    
    @app.route('/api/users/debug', methods=['GET'])
    def debug_users():
        try:
            users = User.query.all()
            return jsonify({
                "count": len(users),
                "users": [{
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "password_hash": user.password_hash[:20] + "...",  # Show part of hash
                    "role": user.role
                } for user in users]
            })
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    @app.route('/api/auth/profile', methods=['GET'])
    def get_profile():
        try:
            # For demo, return the first user
            user = User.query.first()
            if not user:
                return jsonify({"error": "No user found"}), 404
            
            return jsonify(user.to_dict())
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    # Database Routes
    @app.route('/api/health')
    def health_check():
        try:
            # Test database connection
            bank_count = Bank.query.count()
            user_count = User.query.count()
            sim_count = Simulation.query.count()
            
            return jsonify({
                "status": "healthy", 
                "message": "Backend with SQLite is running!",
                "database": "connected",
                "stats": {
                    "banks": bank_count,
                    "users": user_count,
                    "simulations": sim_count
                }
            })
        except Exception as e:
            return jsonify({
                "status": "unhealthy",
                "message": "Database connection failed",
                "error": str(e)
            }), 500
    
    @app.route('/api/banks', methods=['GET'])
    def get_banks():
        try:
            banks = Bank.query.all()
            return jsonify({
                "banks": [bank.to_dict() for bank in banks],
                "count": len(banks)
            })
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    @app.route('/api/banks', methods=['POST'])
    def create_bank():
        try:
            data = request.get_json()
            bank = Bank(
                name=data['name'],
                cet1_ratio=data['cet1_ratio'],
                total_assets=data['total_assets'],
                interbank_assets=data['interbank_assets'],
                interbank_liabilities=data['interbank_liabilities'],
                capital_buffer=data['capital_buffer']
            )
            db.session.add(bank)
            db.session.commit()
            return jsonify(bank.to_dict()), 201
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": str(e)}), 500
    
    @app.route('/api/simulations', methods=['GET'])
    def get_simulations():
        try:
            simulations = Simulation.query.order_by(Simulation.created_at.desc()).all()
            return jsonify({
                "simulations": [sim.to_dict() for sim in simulations],
                "count": len(simulations)
            })
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    @app.route('/api/simulations', methods=['POST'])
    def create_simulation():
        try:
            data = request.get_json()
            
            # Get or create demo user
            user = User.query.first()
            if not user:
                user = User(
                    username='demo_user',
                    email='demo@example.com',
                    password_hash='dummy_hash',
                    role='analyst'
                )
                db.session.add(user)
                db.session.commit()
            
            simulation = Simulation(
                name=data.get('name', 'New Simulation'),
                description=data.get('description', ''),
                created_by=user.id,
                status='pending',
                parameters=data.get('parameters', {
                    'shock_prob': 0.03,
                    'n_sim': 10000,
                    'systemic_threshold': 3
                })
            )
            db.session.add(simulation)
            db.session.commit()
            
            return jsonify(simulation.to_dict()), 201
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": str(e)}), 500
    
    @app.route('/api/simulations/<simulation_id>', methods=['GET'])
    def get_simulation(simulation_id):
        try:
            simulation = Simulation.query.get_or_404(simulation_id)
            return jsonify(simulation.to_dict())
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"error": "Resource not found"}), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        return jsonify({"error": "Internal server error"}), 500
    
    return app

def seed_data():
    """Seed initial data"""
    # Create demo user with known password
    password_hash = hashlib.sha256('demo123'.encode()).hexdigest()
    user = User(
        username='demo_user',
        email='demo@example.com',
        password_hash=password_hash,
        role='analyst'
    )
    db.session.add(user)
    
    # Create banks
    banks_data = [
        {
            "name": "Deutsche Bank AG",
            "cet1_ratio": 13.2,
            "total_assets": 1324.0,
            "interbank_assets": 45.2,
            "interbank_liabilities": 52.8,
            "capital_buffer": 174.8
        },
        {
            "name": "Commerzbank AG", 
            "cet1_ratio": 14.1,
            "total_assets": 462.0,
            "interbank_assets": 18.5,
            "interbank_liabilities": 22.1,
            "capital_buffer": 65.1
        },
        {
            "name": "DZ Bank AG",
            "cet1_ratio": 15.8,
            "total_assets": 507.0,
            "interbank_assets": 76.1,
            "interbank_liabilities": 68.4,
            "capital_buffer": 80.1
        },
        {
            "name": "Landesbank Baden-Württemberg",
            "cet1_ratio": 16.2,
            "total_assets": 242.0,
            "interbank_assets": 34.6,
            "interbank_liabilities": 28.9,
            "capital_buffer": 39.2
        },
        {
            "name": "Bayerische Landesbank",
            "cet1_ratio": 17.1,
            "total_assets": 208.0,
            "interbank_assets": 28.1,
            "interbank_liabilities": 25.4,
            "capital_buffer": 35.6
        }
    ]
    
    for bank_data in banks_data:
        bank = Bank(**bank_data)
        db.session.add(bank)
    
    db.session.commit()
    print(f"✅ Seeded {len(banks_data)} banks and 1 user into database")

if __name__ == '__main__':
    app = create_app()
    
    print("🚀 Starting Systemic Risk Dashboard Backend with SQLite...")
    print("📍 Running on: http://localhost:5001")
    print("🔗 API Health Check: http://localhost:5001/api/health")
    print("🗄️ Database: SQLite (systemic_risk.db)")
    print("📊 API endpoints:")
    print("   Authentication:")
    print("   - POST /api/auth/register")
    print("   - POST /api/auth/login")
    print("   - GET  /api/auth/profile")
    print("   Data:")
    print("   - GET  /api/banks")
    print("   - POST /api/banks") 
    print("   - GET  /api/simulations")
    print("   - POST /api/simulations")
    print("   - GET  /api/simulations/<id>")
    print("\n💡 Press Ctrl+C to stop the server")
    
    app.run(
        host='0.0.0.0',
        port=5001,
        debug=True,
        use_reloader=True
    )
