#!/usr/bin/env python3
"""
Enhanced backend with SQLite database integration
"""

import sys
import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

# Add the parent directory to Python path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(project_root)

# Initialize extensions
db = SQLAlchemy()
migrate = Migrate()

def create_app():
    """Create Flask app with SQLite database"""
    app = Flask(__name__)
    
    # Configuration
    app.config['SECRET_KEY'] = 'dev-secret-key'
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///systemic_risk.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # Enable CORS
    CORS(app)
    
    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    
    # Import models (must be after db initialization)
    from models.user import User
    from models.bank import Bank
    from models.simulation import Simulation, SimulationResult
    
    # Create tables
    with app.app_context():
        db.create_all()
        
        # Seed some initial data if tables are empty
        if Bank.query.count() == 0:
            seed_banks()
    
    # Routes
    @app.route('/api/health')
    def health_check():
        try:
            # Test database connection
            db.session.execute('SELECT 1')
            return jsonify({
                "status": "healthy", 
                "message": "Backend with SQLite is running!",
                "database": "connected"
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
            
            # For now, create a dummy user if none exists
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
                parameters=data.get('parameters', {})
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
            result = simulation.to_dict()
            
            # Include result data if available
            if simulation.result:
                result['result'] = simulation.result.to_dict()
            
            return jsonify(result)
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

def seed_banks():
    """Seed initial bank data"""
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
    
    from models.bank import Bank
    
    for bank_data in banks_data:
        bank = Bank(**bank_data)
        db.session.add(bank)
    
    db.session.commit()
    print(f"✅ Seeded {len(banks_data)} banks into database")

if __name__ == '__main__':
    app = create_app()
    
    print("🚀 Starting Systemic Risk Dashboard Backend with SQLite...")
    print("📍 Running on: http://localhost:5001")
    print("🔗 API Health Check: http://localhost:5001/api/health")
    print("🗄️ Database: SQLite (systemic_risk.db)")
    print("📊 API endpoints available:")
    print("   - GET /api/banks")
    print("   - POST /api/banks")
    print("   - GET /api/simulations")
    print("   - POST /api/simulations")
    print("   - GET /api/simulations/<id>")
    print("\n💡 Press Ctrl+C to stop the server")
    
    app.run(
        host='0.0.0.0',
        port=5001,
        debug=True,
        use_reloader=True
    )
