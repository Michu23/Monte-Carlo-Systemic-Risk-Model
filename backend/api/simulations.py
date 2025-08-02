"""
Simulations API endpoints
"""

from flask import Blueprint, request, jsonify, current_app, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.models.simulation import Simulation, SimulationResult
from backend.models.user import User
from backend.models.bank import Bank
from backend.services.simulation_service import run_simulation, validate_parameters
from backend.app import db
import pandas as pd
import io
import csv
import json
from datetime import datetime, timedelta

simulations_bp = Blueprint('simulations', __name__)

@simulations_bp.route('', methods=['GET'])
@jwt_required()
def get_simulations():
    """Get list of simulations for the current user"""
    current_user_id = get_jwt_identity()
    
    # Get query parameters for pagination
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 10, type=int), 100)  # Limit max per_page
    
    # Query simulations created by the current user
    query = Simulation.query.filter_by(created_by=current_user_id)
    
    # Apply filters if provided
    if 'status' in request.args:
        query = query.filter_by(status=request.args['status'])
    
    if 'search' in request.args:
        search_term = f"%{request.args['search']}%"
        query = query.filter(Simulation.name.ilike(search_term) | Simulation.description.ilike(search_term))
    
    # Filter by date range if provided
    if 'start_date' in request.args:
        try:
            start_date = datetime.fromisoformat(request.args['start_date'])
            query = query.filter(Simulation.created_at >= start_date)
        except ValueError:
            pass
    
    if 'end_date' in request.args:
        try:
            end_date = datetime.fromisoformat(request.args['end_date'])
            # Add one day to include the end date
            end_date = end_date + timedelta(days=1)
            query = query.filter(Simulation.created_at < end_date)
        except ValueError:
            pass
    
    # Apply sorting
    sort_by = request.args.get('sort_by', 'created_at')
    sort_dir = request.args.get('sort_dir', 'desc')
    
    if sort_dir == 'desc':
        query = query.order_by(getattr(Simulation, sort_by).desc())
    else:
        query = query.order_by(getattr(Simulation, sort_by).asc())
    
    # Paginate results
    paginated = query.paginate(page=page, per_page=per_page)
    
    # Format response
    simulations = []
    for sim in paginated.items:
        simulations.append(sim.to_dict())
    
    return jsonify({
        "simulations": simulations,
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total_pages": paginated.pages,
            "total_items": paginated.total
        }
    }), 200

@simulations_bp.route('', methods=['POST'])
@jwt_required()
def create_simulation():
    """Create a new simulation"""
    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    # Validate required fields
    if not data.get('name'):
        return jsonify({"error": {"message": "Simulation name is required"}}), 400
    
    # Get parameters with defaults from config
    # Check if parameters are nested under 'parameters' key or at top level
    param_data = data.get('parameters', data)
    
    parameters = {
        'shock_prob': param_data.get('shock_prob', current_app.config['DEFAULT_SHOCK_PROB']),
        'n_sim': param_data.get('n_sim', current_app.config['DEFAULT_N_SIM']),
        'systemic_threshold': param_data.get('systemic_threshold', current_app.config['DEFAULT_SYSTEMIC_THRESHOLD']),
        'trad_lgd': param_data.get('trad_lgd', current_app.config['DEFAULT_TRAD_LGD']),
        'bc_lgd': param_data.get('bc_lgd', current_app.config['DEFAULT_BC_LGD']),
        'bc_liability_reduction': param_data.get('bc_liability_reduction', current_app.config['DEFAULT_BC_LIABILITY_REDUCTION'])
    }
    
    # Validate parameters
    validation_error = validate_parameters(parameters)
    if validation_error:
        return jsonify({"error": {"message": validation_error}}), 400
    
    # Create new simulation
    new_simulation = Simulation(
        name=data['name'],
        description=data.get('description', ''),
        created_by=current_user_id,
        status='pending',
        progress=0.0,
        parameters=parameters
    )
    
    db.session.add(new_simulation)
    db.session.commit()
    
    # Start simulation asynchronously
    try:
        # Try to use Celery task if available
        run_simulation.delay(new_simulation.id)
    except Exception as e:
        # If Celery is not available, run synchronously for development
        current_app.logger.warning(f"Celery task failed, running synchronously: {e}")
        
        # Update status to running
        new_simulation.status = 'running'
        db.session.commit()
        
        # Run simulation synchronously (for development/testing)
        from backend.services.simulation_service import run_simulation_sync
        try:
            result = run_simulation_sync(new_simulation.id)
            if result.get('error'):
                new_simulation.status = 'failed'
                new_simulation.error_message = result['error']
                db.session.commit()
        except Exception as sync_error:
            new_simulation.status = 'failed'
            new_simulation.error_message = str(sync_error)
            db.session.commit()
    
    return jsonify({
        "message": "Simulation created and queued",
        "simulation": new_simulation.to_dict()
    }), 201

@simulations_bp.route('/<simulation_id>', methods=['GET'])
@jwt_required()
def get_simulation(simulation_id):
    """Get a specific simulation"""
    current_user_id = get_jwt_identity()
    
    simulation = Simulation.query.get(simulation_id)
    
    if not simulation:
        return jsonify({"error": {"message": "Simulation not found"}}), 404
    
    # Check if user has access to this simulation
    if simulation.created_by != current_user_id:
        user = User.query.get(current_user_id)
        if not user or user.role != 'admin':
            return jsonify({"error": {"message": "Access denied"}}), 403
    
    return jsonify({"simulation": simulation.to_dict()}), 200

@simulations_bp.route('/<simulation_id>/status', methods=['GET'])
@jwt_required()
def get_simulation_status(simulation_id):
    """Get the status of a simulation"""
    current_user_id = get_jwt_identity()
    
    simulation = Simulation.query.get(simulation_id)
    
    if not simulation:
        return jsonify({"error": {"message": "Simulation not found"}}), 404
    
    # Check if user has access to this simulation
    if simulation.created_by != current_user_id:
        user = User.query.get(current_user_id)
        if not user or user.role != 'admin':
            return jsonify({"error": {"message": "Access denied"}}), 403
    
    return jsonify({
        "status": simulation.status,
        "progress": simulation.progress,
        "status_message": simulation.status_message,
        "error_message": simulation.error_message
    }), 200

@simulations_bp.route('/<simulation_id>/results', methods=['GET'])
@jwt_required()
def get_simulation_results(simulation_id):
    """Get the results of a simulation"""
    current_user_id = get_jwt_identity()
    
    simulation = Simulation.query.get(simulation_id)
    
    if not simulation:
        return jsonify({"error": {"message": "Simulation not found"}}), 404
    
    # Check if user has access to this simulation
    if simulation.created_by != current_user_id:
        user = User.query.get(current_user_id)
        if not user or user.role != 'admin':
            return jsonify({"error": {"message": "Access denied"}}), 403
    
    # Check if simulation is completed
    if simulation.status != 'completed':
        return jsonify({
            "error": {
                "message": f"Simulation results not available (status: {simulation.status})"
            }
        }), 400
    
    # Get the results
    result = SimulationResult.query.filter_by(simulation_id=simulation_id).first()
    
    if not result:
        return jsonify({"error": {"message": "Results not found"}}), 404
    
    # Check if raw data is requested
    include_raw_data = request.args.get('include_raw_data', 'false').lower() == 'true'
    
    return jsonify({"results": result.to_dict(include_raw_data=include_raw_data)}), 200

@simulations_bp.route('/<simulation_id>/parameters', methods=['PUT'])
@jwt_required()
def update_simulation_parameters(simulation_id):
    """Update simulation parameters"""
    current_user_id = get_jwt_identity()
    
    simulation = Simulation.query.get(simulation_id)
    
    if not simulation:
        return jsonify({"error": {"message": "Simulation not found"}}), 404
    
    # Check if user has access to this simulation
    if simulation.created_by != current_user_id:
        user = User.query.get(current_user_id)
        if not user or user.role != 'admin':
            return jsonify({"error": {"message": "Access denied"}}), 403
    
    # Check if simulation can be updated
    if simulation.status not in ['pending', 'failed']:
        return jsonify({
            "error": {
                "message": f"Cannot update parameters for simulation with status: {simulation.status}"
            }
        }), 400
    
    data = request.get_json()
    
    # Update parameters
    parameters = simulation.parameters.copy()
    
    for param in ['shock_prob', 'n_sim', 'systemic_threshold', 'trad_lgd', 'bc_lgd', 'bc_liability_reduction']:
        if param in data:
            parameters[param] = data[param]
    
    # Validate parameters
    validation_error = validate_parameters(parameters)
    if validation_error:
        return jsonify({"error": {"message": validation_error}}), 400
    
    # Update simulation
    simulation.parameters = parameters
    simulation.status = 'pending'
    simulation.progress = 0.0
    simulation.status_message = None
    simulation.error_message = None
    
    db.session.commit()
    
    # Start simulation asynchronously
    run_simulation.delay(simulation.id)
    
    return jsonify({
        "message": "Simulation parameters updated and simulation requeued",
        "simulation": simulation.to_dict()
    }), 200

@simulations_bp.route('/<simulation_id>/cancel', methods=['POST'])
@jwt_required()
def cancel_simulation(simulation_id):
    """Cancel a running simulation"""
    current_user_id = get_jwt_identity()
    
    simulation = Simulation.query.get(simulation_id)
    
    if not simulation:
        return jsonify({"error": {"message": "Simulation not found"}}), 404
    
    # Check if user has access to this simulation
    if simulation.created_by != current_user_id:
        user = User.query.get(current_user_id)
        if not user or user.role != 'admin':
            return jsonify({"error": {"message": "Access denied"}}), 403
    
    # Check if simulation can be canceled
    if simulation.status not in ['pending', 'running']:
        return jsonify({
            "error": {
                "message": f"Cannot cancel simulation with status: {simulation.status}"
            }
        }), 400
    
    # Update simulation status
    simulation.status = 'canceled'
    simulation.status_message = "Simulation canceled by user"
    
    db.session.commit()
    
    # Note: In a real implementation, we would also need to cancel the Celery task
    # This would require additional setup with task IDs and a result backend
    
    return jsonify({
        "message": "Simulation canceled",
        "simulation": simulation.to_dict()
    }), 200

@simulations_bp.route('/<simulation_id>/restart', methods=['POST'])
@jwt_required()
def restart_simulation(simulation_id):
    """Restart a simulation"""
    current_user_id = get_jwt_identity()
    
    simulation = Simulation.query.get(simulation_id)
    
    if not simulation:
        return jsonify({"error": {"message": "Simulation not found"}}), 404
    
    # Check if user has access to this simulation
    if simulation.created_by != current_user_id:
        user = User.query.get(current_user_id)
        if not user or user.role != 'admin':
            return jsonify({"error": {"message": "Access denied"}}), 403
    
    # Update simulation status
    simulation.status = 'pending'
    simulation.progress = 0.0
    simulation.status_message = None
    simulation.error_message = None
    
    db.session.commit()
    
    # Start simulation asynchronously
    run_simulation.delay(simulation.id)
    
    return jsonify({
        "message": "Simulation restarted",
        "simulation": simulation.to_dict()
    }), 200

@simulations_bp.route('/<simulation_id>', methods=['DELETE'])
@jwt_required()
def delete_simulation(simulation_id):
    """Delete a simulation"""
    current_user_id = get_jwt_identity()
    
    simulation = Simulation.query.get(simulation_id)
    
    if not simulation:
        return jsonify({"error": {"message": "Simulation not found"}}), 404
    
    # Check if user has access to this simulation
    if simulation.created_by != current_user_id:
        user = User.query.get(current_user_id)
        if not user or user.role != 'admin':
            return jsonify({"error": {"message": "Access denied"}}), 403
    
    # Delete associated results first
    result = SimulationResult.query.filter_by(simulation_id=simulation_id).first()
    if result:
        db.session.delete(result)
    
    # Delete simulation
    db.session.delete(simulation)
    db.session.commit()
    
    return jsonify({
        "message": "Simulation deleted successfully"
    }), 200

@simulations_bp.route('/compare', methods=['GET'])
@jwt_required()
def compare_simulations():
    """Compare multiple simulations"""
    current_user_id = get_jwt_identity()
    
    # Get simulation IDs from query parameters
    simulation_ids = request.args.getlist('ids')
    
    if not simulation_ids:
        return jsonify({"error": {"message": "No simulation IDs provided"}}), 400
    
    # Get simulations
    simulations = []
    results = []
    
    for sim_id in simulation_ids:
        simulation = Simulation.query.get(sim_id)
        
        if not simulation:
            return jsonify({"error": {"message": f"Simulation {sim_id} not found"}}), 404
        
        # Check if user has access to this simulation
        if simulation.created_by != current_user_id:
            user = User.query.get(current_user_id)
            if not user or user.role != 'admin':
                return jsonify({"error": {"message": f"Access denied for simulation {sim_id}"}}), 403
        
        # Check if simulation is completed
        if simulation.status != 'completed':
            return jsonify({
                "error": {
                    "message": f"Simulation {sim_id} results not available (status: {simulation.status})"
                }
            }), 400
        
        # Get the results
        result = SimulationResult.query.filter_by(simulation_id=sim_id).first()
        
        if not result:
            return jsonify({"error": {"message": f"Results for simulation {sim_id} not found"}}), 404
        
        simulations.append(simulation.to_dict())
        results.append(result.to_dict())
    
    # Calculate comparison metrics
    comparison = calculate_comparison_metrics(results)
    
    return jsonify({
        "simulations": simulations,
        "results": results,
        "comparison": comparison
    }), 200

@simulations_bp.route('/history', methods=['GET'])
@jwt_required()
def get_simulation_history():
    """Get simulation history with aggregated metrics"""
    current_user_id = get_jwt_identity()
    
    # Get time period from query parameters (default to last 30 days)
    days = request.args.get('days', 30, type=int)
    start_date = datetime.now() - timedelta(days=days)
    
    # Get completed simulations in the time period
    simulations = Simulation.query.filter(
        Simulation.created_by == current_user_id,
        Simulation.status == 'completed',
        Simulation.created_at >= start_date
    ).order_by(Simulation.created_at.asc()).all()
    
    # Get results for each simulation
    history_data = []
    
    for simulation in simulations:
        result = SimulationResult.query.filter_by(simulation_id=simulation.id).first()
        if result:
            history_data.append({
                'id': simulation.id,
                'name': simulation.name,
                'created_at': simulation.created_at.isoformat(),
                'parameters': simulation.parameters,
                'traditional_avg_failures': result.traditional_summary['average_failures'],
                'blockchain_avg_failures': result.blockchain_summary['average_failures'],
                'traditional_systemic_prob': result.traditional_summary['probability_systemic_event'],
                'blockchain_systemic_prob': result.blockchain_summary['probability_systemic_event'],
                'improvement_percent': result.improvements['probability_systemic_event']
            })
    
    return jsonify({
        "history": history_data,
        "count": len(history_data)
    }), 200

@simulations_bp.route('/<simulation_id>/export', methods=['GET'])
@jwt_required()
def export_simulation_results(simulation_id):
    """Export simulation results in various formats"""
    current_user_id = get_jwt_identity()
    
    simulation = Simulation.query.get(simulation_id)
    
    if not simulation:
        return jsonify({"error": {"message": "Simulation not found"}}), 404
    
    # Check if user has access to this simulation
    if simulation.created_by != current_user_id:
        user = User.query.get(current_user_id)
        if not user or user.role != 'admin':
            return jsonify({"error": {"message": "Access denied"}}), 403
    
    # Check if simulation is completed
    if simulation.status != 'completed':
        return jsonify({
            "error": {
                "message": f"Simulation results not available (status: {simulation.status})"
            }
        }), 400
    
    # Get the results
    result = SimulationResult.query.filter_by(simulation_id=simulation_id).first()
    
    if not result:
        return jsonify({"error": {"message": "Results not found"}}), 404
    
    # Get export format from query parameters
    export_format = request.args.get('format', 'json').lower()
    
    if export_format == 'json':
        # Export as JSON
        output = io.StringIO()
        json.dump(result.to_dict(include_raw_data=True), output, indent=2)
        output.seek(0)
        
        return output.getvalue(), 200, {
            'Content-Type': 'application/json',
            'Content-Disposition': f'attachment; filename=simulation_{simulation_id}.json'
        }
    
    elif export_format == 'csv':
        # Export as CSV
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow(['Metric', 'Traditional', 'Blockchain', 'Improvement'])
        
        # Write data
        writer.writerow(['Average Failures', 
                        result.traditional_summary['average_failures'],
                        result.blockchain_summary['average_failures'],
                        f"{result.improvements['average_failures']}%"])
        
        writer.writerow(['Maximum Failures', 
                        result.traditional_summary['max_failures'],
                        result.blockchain_summary['max_failures'],
                        result.improvements['max_failures']])
        
        writer.writerow(['Std Dev Failures', 
                        result.traditional_summary['std_dev_failures'],
                        result.blockchain_summary['std_dev_failures'],
                        f"{result.improvements['std_dev_failures']}%"])
        
        writer.writerow(['Probability Systemic Event', 
                        result.traditional_summary['probability_systemic_event'],
                        result.blockchain_summary['probability_systemic_event'],
                        f"{result.improvements['probability_systemic_event']}%"])
        
        # Write statistical analysis
        writer.writerow([])
        writer.writerow(['Statistical Analysis', 'Value'])
        writer.writerow(['T-statistic', result.statistical_analysis['t_stat']])
        writer.writerow(['P-value', result.statistical_analysis['p_value']])
        writer.writerow(['Statistically Significant', 'Yes' if result.statistical_analysis['p_value'] < 0.05 else 'No'])
        writer.writerow(['Effect Size (Cohen\'s d)', result.statistical_analysis['cohens_d']])
        writer.writerow(['Effect Interpretation', result.statistical_analysis['effect']])
        
        # Write parameters
        writer.writerow([])
        writer.writerow(['Parameter', 'Value'])
        for key, value in simulation.parameters.items():
            writer.writerow([key, value])
        
        output.seek(0)
        
        return output.getvalue(), 200, {
            'Content-Type': 'text/csv',
            'Content-Disposition': f'attachment; filename=simulation_{simulation_id}.csv'
        }
    
    else:
        return jsonify({"error": {"message": f"Unsupported export format: {export_format}"}}), 400

@simulations_bp.route('/share/<share_id>', methods=['GET'])
def get_shared_simulation(share_id):
    """Get a shared simulation result"""
    # In a real implementation, we would use a more secure sharing mechanism
    # For now, we'll just use the simulation ID as the share ID
    simulation_id = share_id
    
    simulation = Simulation.query.get(simulation_id)
    
    if not simulation:
        return jsonify({"error": {"message": "Shared simulation not found"}}), 404
    
    # Check if simulation is completed
    if simulation.status != 'completed':
        return jsonify({
            "error": {
                "message": f"Shared simulation results not available (status: {simulation.status})"
            }
        }), 400
    
    # Get the results
    result = SimulationResult.query.filter_by(simulation_id=simulation_id).first()
    
    if not result:
        return jsonify({"error": {"message": "Shared results not found"}}), 404
    
    # Return limited information for shared results
    return jsonify({
        "simulation": {
            "name": simulation.name,
            "description": simulation.description,
            "created_at": simulation.created_at.isoformat(),
            "parameters": simulation.parameters
        },
        "results": result.to_dict(include_raw_data=False)
    }), 200

def calculate_comparison_metrics(results):
    """
    Calculate comparison metrics between multiple simulation results
    
    Args:
        results (list): List of simulation results
        
    Returns:
        dict: Comparison metrics
    """
    if not results:
        return {}
    
    # Extract key metrics
    trad_avg_failures = [r['traditional_summary']['average_failures'] for r in results]
    bc_avg_failures = [r['blockchain_summary']['average_failures'] for r in results]
    trad_systemic_prob = [r['traditional_summary']['probability_systemic_event'] for r in results]
    bc_systemic_prob = [r['blockchain_summary']['probability_systemic_event'] for r in results]
    
    # Calculate ranges
    trad_avg_range = max(trad_avg_failures) - min(trad_avg_failures)
    bc_avg_range = max(bc_avg_failures) - min(bc_avg_failures)
    trad_prob_range = max(trad_systemic_prob) - min(trad_systemic_prob)
    bc_prob_range = max(bc_systemic_prob) - min(bc_systemic_prob)
    
    # Calculate averages
    trad_avg_avg = sum(trad_avg_failures) / len(trad_avg_failures)
    bc_avg_avg = sum(bc_avg_failures) / len(bc_avg_failures)
    trad_prob_avg = sum(trad_systemic_prob) / len(trad_systemic_prob)
    bc_prob_avg = sum(bc_systemic_prob) / len(bc_systemic_prob)
    
    # Calculate improvement consistency
    improvements = [(1 - bc/trad) * 100 if trad > 0 else 0 for trad, bc in zip(trad_avg_failures, bc_avg_failures)]
    avg_improvement = sum(improvements) / len(improvements)
    min_improvement = min(improvements)
    max_improvement = max(improvements)
    
    return {
        'traditional_avg_failures': {
            'min': min(trad_avg_failures),
            'max': max(trad_avg_failures),
            'avg': trad_avg_avg,
            'range': trad_avg_range
        },
        'blockchain_avg_failures': {
            'min': min(bc_avg_failures),
            'max': max(bc_avg_failures),
            'avg': bc_avg_avg,
            'range': bc_avg_range
        },
        'traditional_systemic_prob': {
            'min': min(trad_systemic_prob),
            'max': max(trad_systemic_prob),
            'avg': trad_prob_avg,
            'range': trad_prob_range
        },
        'blockchain_systemic_prob': {
            'min': min(bc_systemic_prob),
            'max': max(bc_systemic_prob),
            'avg': bc_prob_avg,
            'range': bc_prob_range
        },
        'improvement': {
            'min': min_improvement,
            'max': max_improvement,
            'avg': avg_improvement,
            'range': max_improvement - min_improvement
        }
    }