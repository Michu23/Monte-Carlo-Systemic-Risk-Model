"""
Authentication API endpoints
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import (
    create_access_token, create_refresh_token, 
    jwt_required, get_jwt_identity, get_jwt
)
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timezone
import re
from backend.models.user import User
from backend.app import db, jwt

auth_bp = Blueprint('auth', __name__)

# Email validation regex
EMAIL_REGEX = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'

# Password validation regex (min 8 chars, at least one letter and one number)
PASSWORD_REGEX = r'^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$'

@jwt.token_in_blocklist_loader
def check_if_token_revoked(jwt_header, jwt_payload):
    """Check if token is revoked"""
    jti = jwt_payload["jti"]
    token = User.query.filter_by(revoked_tokens=jti).first()
    return token is not None

@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user"""
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['username', 'email', 'password']
    for field in required_fields:
        if field not in data:
            return jsonify({"error": {"message": f"Missing required field: {field}"}}), 400
    
    # Validate email format
    if not re.match(EMAIL_REGEX, data['email']):
        return jsonify({"error": {"message": "Invalid email format"}}), 400
    
    # Validate password strength
    if not re.match(PASSWORD_REGEX, data['password']):
        return jsonify({
            "error": {
                "message": "Password must be at least 8 characters long and contain at least one letter and one number"
            }
        }), 400
    
    # Check if user already exists
    if User.query.filter_by(username=data['username']).first():
        return jsonify({"error": {"message": "Username already exists"}}), 409
    
    if User.query.filter_by(email=data['email']).first():
        return jsonify({"error": {"message": "Email already exists"}}), 409
    
    # Create new user
    new_user = User(
        username=data['username'],
        email=data['email'],
        password_hash=generate_password_hash(data['password']),
        role='viewer'  # Default role
    )
    
    db.session.add(new_user)
    db.session.commit()
    
    return jsonify({
        "message": "User registered successfully",
        "user": {
            "id": new_user.id,
            "username": new_user.username,
            "email": new_user.email,
            "role": new_user.role
        }
    }), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    """Authenticate a user and return tokens"""
    data = request.get_json()
    
    # Validate required fields
    if not data.get('username') or not data.get('password'):
        return jsonify({"error": {"message": "Username and password are required"}}), 400
    
    # Find user by username
    user = User.query.filter_by(username=data['username']).first()
    
    # Check if user exists and password is correct
    if not user or not check_password_hash(user.password_hash, data['password']):
        return jsonify({"error": {"message": "Invalid username or password"}}), 401
    
    # Create tokens
    access_token = create_access_token(identity=user.id)
    refresh_token = create_refresh_token(identity=user.id)
    
    # Update last login timestamp
    user.update_last_login()
    db.session.commit()
    
    return jsonify({
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role
        }
    }), 200

@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """Refresh access token"""
    current_user_id = get_jwt_identity()
    new_access_token = create_access_token(identity=current_user_id)
    
    return jsonify({"access_token": new_access_token}), 200

@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """Logout user (revoke current token)"""
    jti = get_jwt()["jti"]
    user_id = get_jwt_identity()
    
    # Add token to revoked tokens list
    user = User.query.get(user_id)
    if user:
        user.add_revoked_token(jti)
        db.session.commit()
    
    return jsonify({"message": "Successfully logged out"}), 200

@auth_bp.route('/reset-password', methods=['POST'])
def reset_password_request():
    """Request password reset"""
    data = request.get_json()
    
    if not data.get('email'):
        return jsonify({"error": {"message": "Email is required"}}), 400
    
    user = User.query.filter_by(email=data['email']).first()
    
    # Always return success to prevent email enumeration
    if user:
        # Generate reset token
        reset_token = user.generate_reset_token()
        
        # In a real implementation, send an email with reset link
        # For now, just log it
        reset_url = f"{request.host_url}reset-password/{reset_token}"
        current_app.logger.info(f"Password reset URL for {user.email}: {reset_url}")
    
    return jsonify({"message": "If the email exists, a reset link will be sent"}), 200

@auth_bp.route('/reset-password/<token>', methods=['POST'])
def reset_password(token):
    """Reset password using token"""
    data = request.get_json()
    
    if not data.get('password'):
        return jsonify({"error": {"message": "New password is required"}}), 400
    
    # Validate password strength
    if not re.match(PASSWORD_REGEX, data['password']):
        return jsonify({
            "error": {
                "message": "Password must be at least 8 characters long and contain at least one letter and one number"
            }
        }), 400
    
    # Find user by reset token
    user = User.query.filter_by(reset_token=token).first()
    
    if not user or not user.verify_reset_token(token):
        return jsonify({"error": {"message": "Invalid or expired reset token"}}), 400
    
    # Update password
    user.password_hash = generate_password_hash(data['password'])
    user.reset_token = None
    user.reset_token_expires_at = None
    db.session.commit()
    
    return jsonify({"message": "Password has been reset successfully"}), 200

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_user_info():
    """Get current user information"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user:
        return jsonify({"error": {"message": "User not found"}}), 404
    
    return jsonify({
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "last_login": user.last_login.isoformat() if user.last_login else None
        }
    }), 200

@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    """Change user password"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user:
        return jsonify({"error": {"message": "User not found"}}), 404
    
    data = request.get_json()
    
    # Validate required fields
    if not data.get('current_password') or not data.get('new_password'):
        return jsonify({"error": {"message": "Current password and new password are required"}}), 400
    
    # Verify current password
    if not check_password_hash(user.password_hash, data['current_password']):
        return jsonify({"error": {"message": "Current password is incorrect"}}), 401
    
    # Validate password strength
    if not re.match(PASSWORD_REGEX, data['new_password']):
        return jsonify({
            "error": {
                "message": "Password must be at least 8 characters long and contain at least one letter and one number"
            }
        }), 400
    
    # Update password
    user.password_hash = generate_password_hash(data['new_password'])
    db.session.commit()
    
    return jsonify({"message": "Password changed successfully"}), 200