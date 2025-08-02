"""
Banks API endpoints
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.models.bank import Bank
from backend.models.user import User
from backend.app import db
import csv
import io
import pandas as pd

banks_bp = Blueprint('banks', __name__)

def validate_bank_data(data, is_update=False):
    """
    Validate bank data
    
    Args:
        data (dict): Bank data to validate
        is_update (bool): Whether this is an update operation
        
    Returns:
        tuple: (is_valid, error_message)
    """
    # For updates, we don't need to validate all fields
    if not is_update:
        required_fields = ['name', 'cet1_ratio', 'total_assets', 'interbank_assets', 'interbank_liabilities']
        for field in required_fields:
            if field not in data:
                return False, f"Missing required field: {field}"
    
    # Validate numeric fields if present
    numeric_fields = ['cet1_ratio', 'total_assets', 'interbank_assets', 'interbank_liabilities', 'capital_buffer']
    for field in numeric_fields:
        if field in data:
            try:
                value = float(data[field])
                # Check for negative values
                if value < 0:
                    return False, f"{field} cannot be negative"
            except (ValueError, TypeError):
                return False, f"{field} must be a number"
    
    # Additional validation rules
    if 'cet1_ratio' in data and float(data['cet1_ratio']) > 100:
        return False, "CET1 ratio cannot exceed 100%"
    
    if 'interbank_assets' in data and 'total_assets' in data:
        if float(data['interbank_assets']) > float(data['total_assets']):
            return False, "Interbank assets cannot exceed total assets"
    
    return True, None

@banks_bp.route('', methods=['GET'])
@jwt_required()
def get_banks():
    """Get list of all banks"""
    # Get query parameters for pagination
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 10, type=int), 100)  # Limit max per_page
    
    # Apply filters if provided
    query = Bank.query
    
    if 'search' in request.args:
        search_term = f"%{request.args['search']}%"
        query = query.filter(Bank.name.ilike(search_term))
    
    # Apply sorting
    sort_by = request.args.get('sort_by', 'name')
    sort_dir = request.args.get('sort_dir', 'asc')
    
    if sort_dir == 'desc':
        query = query.order_by(getattr(Bank, sort_by).desc())
    else:
        query = query.order_by(getattr(Bank, sort_by).asc())
    
    # Paginate results
    paginated = query.paginate(page=page, per_page=per_page)
    
    # Format response
    banks = []
    for bank in paginated.items:
        banks.append(bank.to_dict())
    
    return jsonify({
        "banks": banks,
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total_pages": paginated.pages,
            "total_items": paginated.total
        }
    }), 200

@banks_bp.route('/<bank_id>', methods=['GET'])
@jwt_required()
def get_bank(bank_id):
    """Get a specific bank"""
    bank = Bank.query.get(bank_id)
    
    if not bank:
        return jsonify({"error": {"message": "Bank not found"}}), 404
    
    return jsonify({"bank": bank.to_dict()}), 200

@banks_bp.route('', methods=['POST'])
@jwt_required()
def create_bank():
    """Create a new bank"""
    current_user_id = get_jwt_identity()
    
    # Check if user has admin role
    user = User.query.get(current_user_id)
    if user.role != 'admin':
        return jsonify({"error": {"message": "Only administrators can create banks"}}), 403
    
    data = request.get_json()
    
    # Validate bank data
    is_valid, error_message = validate_bank_data(data)
    if not is_valid:
        return jsonify({"error": {"message": error_message}}), 400
    
    # Check if bank with same name already exists
    if Bank.query.filter_by(name=data['name']).first():
        return jsonify({"error": {"message": "Bank with this name already exists"}}), 409
    
    # Create new bank
    new_bank = Bank(
        name=data['name'],
        cet1_ratio=float(data['cet1_ratio']),
        total_assets=float(data['total_assets']),
        interbank_assets=float(data['interbank_assets']),
        interbank_liabilities=float(data['interbank_liabilities'])
    )
    
    # Calculate capital buffer if not provided
    if 'capital_buffer' not in data:
        new_bank.capital_buffer = new_bank.cet1_ratio * new_bank.total_assets * 0.01
    else:
        new_bank.capital_buffer = float(data['capital_buffer'])
    
    db.session.add(new_bank)
    db.session.commit()
    
    return jsonify({
        "message": "Bank created successfully",
        "bank": new_bank.to_dict()
    }), 201

@banks_bp.route('/<bank_id>', methods=['PUT'])
@jwt_required()
def update_bank(bank_id):
    """Update a bank"""
    current_user_id = get_jwt_identity()
    
    # Check if user has admin role
    user = User.query.get(current_user_id)
    if user.role != 'admin':
        return jsonify({"error": {"message": "Only administrators can update banks"}}), 403
    
    bank = Bank.query.get(bank_id)
    
    if not bank:
        return jsonify({"error": {"message": "Bank not found"}}), 404
    
    data = request.get_json()
    
    # Validate bank data
    is_valid, error_message = validate_bank_data(data, is_update=True)
    if not is_valid:
        return jsonify({"error": {"message": error_message}}), 400
    
    # Update fields
    if 'name' in data:
        # Check if name is already taken by another bank
        existing_bank = Bank.query.filter_by(name=data['name']).first()
        if existing_bank and existing_bank.id != bank.id:
            return jsonify({"error": {"message": "Bank with this name already exists"}}), 409
        bank.name = data['name']
    
    if 'cet1_ratio' in data:
        bank.cet1_ratio = float(data['cet1_ratio'])
    
    if 'total_assets' in data:
        bank.total_assets = float(data['total_assets'])
    
    if 'interbank_assets' in data:
        bank.interbank_assets = float(data['interbank_assets'])
    
    if 'interbank_liabilities' in data:
        bank.interbank_liabilities = float(data['interbank_liabilities'])
    
    if 'capital_buffer' in data:
        bank.capital_buffer = float(data['capital_buffer'])
    elif 'cet1_ratio' in data or 'total_assets' in data:
        # Recalculate capital buffer if CET1 ratio or total assets changed
        bank.capital_buffer = bank.cet1_ratio * bank.total_assets * 0.01
    
    # Final validation of the complete bank object
    if bank.interbank_assets > bank.total_assets:
        return jsonify({"error": {"message": "Interbank assets cannot exceed total assets"}}), 400
    
    db.session.commit()
    
    return jsonify({
        "message": "Bank updated successfully",
        "bank": bank.to_dict()
    }), 200

@banks_bp.route('/<bank_id>', methods=['DELETE'])
@jwt_required()
def delete_bank(bank_id):
    """Delete a bank"""
    current_user_id = get_jwt_identity()
    
    # Check if user has admin role
    user = User.query.get(current_user_id)
    if user.role != 'admin':
        return jsonify({"error": {"message": "Only administrators can delete banks"}}), 403
    
    bank = Bank.query.get(bank_id)
    
    if not bank:
        return jsonify({"error": {"message": "Bank not found"}}), 404
    
    db.session.delete(bank)
    db.session.commit()
    
    return jsonify({
        "message": "Bank deleted successfully"
    }), 200

@banks_bp.route('/import', methods=['POST'])
@jwt_required()
def import_banks():
    """Import banks from CSV file"""
    current_user_id = get_jwt_identity()
    
    # Check if user has admin role
    user = User.query.get(current_user_id)
    if user.role != 'admin':
        return jsonify({"error": {"message": "Only administrators can import banks"}}), 403
    
    if 'file' not in request.files:
        return jsonify({"error": {"message": "No file provided"}}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({"error": {"message": "No file selected"}}), 400
    
    if not file.filename.endswith('.csv'):
        return jsonify({"error": {"message": "Only CSV files are supported"}}), 400
    
    # Read CSV file
    try:
        stream = io.StringIO(file.stream.read().decode("UTF8"), newline=None)
        csv_reader = csv.DictReader(stream)
        
        banks_created = 0
        banks_updated = 0
        errors = []
        
        for row in csv_reader:
            try:
                # Validate row data
                row_data = {
                    'name': row['Bank Name'],
                    'cet1_ratio': float(row['CET1 Ratio (%)']),
                    'total_assets': float(row['Total Assets (€B)']),
                    'interbank_assets': float(row['Interbank Assets (€B)']),
                    'interbank_liabilities': float(row['Interbank Liabilities (€B)'])
                }
                
                if 'Capital Buffer (€B)' in row:
                    row_data['capital_buffer'] = float(row['Capital Buffer (€B)'])
                
                is_valid, error_message = validate_bank_data(row_data)
                if not is_valid:
                    errors.append(f"Error in row for {row['Bank Name']}: {error_message}")
                    continue
                
                # Check if bank already exists
                bank = Bank.query.filter_by(name=row['Bank Name']).first()
                
                if bank:
                    # Update existing bank
                    bank.cet1_ratio = float(row['CET1 Ratio (%)'])
                    bank.total_assets = float(row['Total Assets (€B)'])
                    bank.interbank_assets = float(row['Interbank Assets (€B)'])
                    bank.interbank_liabilities = float(row['Interbank Liabilities (€B)'])
                    
                    if 'Capital Buffer (€B)' in row:
                        bank.capital_buffer = float(row['Capital Buffer (€B)'])
                    else:
                        bank.capital_buffer = bank.cet1_ratio * bank.total_assets * 0.01
                    
                    banks_updated += 1
                else:
                    # Create new bank
                    new_bank = Bank(
                        name=row['Bank Name'],
                        cet1_ratio=float(row['CET1 Ratio (%)']),
                        total_assets=float(row['Total Assets (€B)']),
                        interbank_assets=float(row['Interbank Assets (€B)']),
                        interbank_liabilities=float(row['Interbank Liabilities (€B)'])
                    )
                    
                    if 'Capital Buffer (€B)' in row:
                        new_bank.capital_buffer = float(row['Capital Buffer (€B)'])
                    else:
                        new_bank.capital_buffer = new_bank.cet1_ratio * new_bank.total_assets * 0.01
                    
                    db.session.add(new_bank)
                    banks_created += 1
            
            except Exception as e:
                errors.append(f"Error processing row for {row.get('Bank Name', 'unknown')}: {str(e)}")
        
        db.session.commit()
        
        return jsonify({
            "message": "Banks imported successfully",
            "created": banks_created,
            "updated": banks_updated,
            "errors": errors
        }), 200
    
    except Exception as e:
        return jsonify({"error": {"message": f"Error processing CSV file: {str(e)}"}}), 400

@banks_bp.route('/export', methods=['GET'])
@jwt_required()
def export_banks():
    """Export banks to CSV file"""
    banks = Bank.query.all()
    
    # Create CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow(['Bank Name', 'CET1 Ratio (%)', 'Total Assets (€B)', 
                    'Interbank Assets (€B)', 'Interbank Liabilities (€B)', 
                    'Capital Buffer (€B)'])
    
    # Write data
    for bank in banks:
        writer.writerow([
            bank.name,
            bank.cet1_ratio,
            bank.total_assets,
            bank.interbank_assets,
            bank.interbank_liabilities,
            bank.capital_buffer
        ])
    
    # Prepare response
    output.seek(0)
    return output.getvalue(), 200, {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename=banks.csv'
    }

@banks_bp.route('/exposure-matrix', methods=['GET'])
@jwt_required()
def get_exposure_matrix():
    """Get the interbank exposure matrix"""
    from backend.services.simulation_service import build_exposure_matrix
    
    banks = Bank.query.all()
    
    if not banks:
        return jsonify({"error": {"message": "No banks available"}}), 404
    
    # Convert to pandas DataFrame
    data = pd.DataFrame([{
        'Bank Name': bank.name,
        'Interbank Assets (€B)': bank.interbank_assets,
        'Interbank Liabilities (€B)': bank.interbank_liabilities
    } for bank in banks])
    
    # Build exposure matrix
    exposure_matrix = build_exposure_matrix(
        data['Interbank Assets (€B)'], 
        data['Interbank Liabilities (€B)']
    )
    
    # Convert to list of lists for JSON serialization
    matrix_data = exposure_matrix.tolist()
    bank_names = [bank.name for bank in banks]
    
    return jsonify({
        "bank_names": bank_names,
        "exposure_matrix": matrix_data
    }), 200