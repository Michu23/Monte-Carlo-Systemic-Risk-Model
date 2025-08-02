#!/usr/bin/env python3
"""
Simple script to run the backend Flask application locally
"""

import sys
import os

# Add the parent directory to Python path so we can import backend modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app import create_app

if __name__ == '__main__':
    # Create the Flask app
    app = create_app('development')
    
    print("🚀 Starting Systemic Risk Dashboard Backend...")
    print("📍 Running on: http://localhost:5000")
    print("🔗 API Health Check: http://localhost:5000/api/health")
    print("📊 Ready to serve the frontend at http://localhost:3000")
    print("\n💡 Press Ctrl+C to stop the server")
    
    # Run the app
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=True,
        use_reloader=True
    )
