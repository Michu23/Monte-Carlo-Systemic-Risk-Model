"""
Main Flask application for the Systemic Risk Dashboard
"""

from flask import Flask, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from werkzeug.exceptions import HTTPException
import os

# Initialize extensions
db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()

def create_app(config_name='default'):
    """
    Create and configure the Flask application
    
    Args:
        config_name (str): Configuration name to use
        
    Returns:
        Flask: Configured Flask application
    """
    app = Flask(__name__)
    
    # Load configuration
    if config_name == 'testing':
        from backend.config import TestingConfig
        app.config.from_object(TestingConfig)
    elif config_name == 'production':
        from backend.config import ProductionConfig
        app.config.from_object(ProductionConfig)
    else:
        from backend.config import DevelopmentConfig
        app.config.from_object(DevelopmentConfig)
    
    # Enable CORS
    CORS(app)
    
    # Initialize extensions with app
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    
    # Register blueprints
    from backend.api.auth import auth_bp
    from backend.api.simulations import simulations_bp
    from backend.api.banks import banks_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(simulations_bp, url_prefix='/api/simulations')
    app.register_blueprint(banks_bp, url_prefix='/api/banks')
    
    # Register error handlers
    @app.errorhandler(HTTPException)
    def handle_http_exception(error):
        """Return JSON instead of HTML for HTTP errors."""
        response = {
            "error": {
                "code": error.code,
                "message": error.name,
                "details": error.description
            }
        }
        return jsonify(response), error.code
    
    @app.errorhandler(Exception)
    def handle_exception(error):
        """Return JSON for generic exceptions."""
        app.logger.error(f"Unhandled exception: {str(error)}")
        response = {
            "error": {
                "code": 500,
                "message": "Internal Server Error",
                "details": str(error) if app.debug else "An unexpected error occurred"
            }
        }
        return jsonify(response), 500
    
    # Health check endpoint
    @app.route('/api/health')
    def health_check():
        return jsonify({"status": "healthy"})
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))