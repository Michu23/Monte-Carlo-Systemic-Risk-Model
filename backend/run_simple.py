#!/usr/bin/env python3
"""
Simplified backend startup for development
"""

import sys
import os
from flask import Flask, jsonify, request
from flask_cors import CORS

def create_simple_app():
    """Create a simplified Flask app for development"""
    app = Flask(__name__)
    app.config['SECRET_KEY'] = 'dev-secret-key'
    
    # Enable CORS for all routes
    CORS(app)
    
    @app.route('/api/health')
    def health_check():
        return jsonify({"status": "healthy", "message": "Backend is running!"})
    
    @app.route('/api/simulations', methods=['GET'])
    def get_simulations():
        # Mock simulations data
        return jsonify({
            "simulations": [
                {
                    "id": 1,
                    "name": "Traditional Banking Simulation",
                    "status": "completed",
                    "created_at": "2025-01-20",
                    "systemic_failures": 15.2
                },
                {
                    "id": 2,
                    "name": "Blockchain Banking Simulation", 
                    "status": "completed",
                    "created_at": "2025-01-20",
                    "systemic_failures": 8.7
                }
            ]
        })
    
    @app.route('/api/simulations', methods=['POST'])
    def create_simulation():
        data = request.get_json()
        return jsonify({
            "id": 3,
            "name": data.get('name', 'New Simulation'),
            "status": "running",
            "message": "Simulation started successfully"
        })
    
    @app.route('/api/banks', methods=['GET'])
    def get_banks():
        # Mock banks data
        return jsonify({
            "banks": [
                {"id": 1, "name": "Bank A", "total_assets": 1000000},
                {"id": 2, "name": "Bank B", "total_assets": 800000},
                {"id": 3, "name": "Bank C", "total_assets": 1200000}
            ]
        })
    
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"error": "Endpoint not found"}), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({"error": "Internal server error"}), 500
    
    return app

if __name__ == '__main__':
    app = create_simple_app()
    
    print("🚀 Starting Systemic Risk Dashboard Backend (Simplified)...")
    print("📍 Running on: http://localhost:5001")
    print("🔗 API Health Check: http://localhost:5001/api/health")
    print("📊 Mock API endpoints available:")
    print("   - GET /api/simulations")
    print("   - POST /api/simulations") 
    print("   - GET /api/banks")
    print("\n💡 Press Ctrl+C to stop the server")
    
    app.run(
        host='0.0.0.0',
        port=5001,
        debug=True,
        use_reloader=True
    )
